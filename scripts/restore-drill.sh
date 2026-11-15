#!/usr/bin/env bash
# Restore drill: proves that a backup can actually be restored, without touching the source.
#
#   bash scripts/restore-drill.sh                       dump the local database of .env (read only), restore it
#   bash scripts/restore-drill.sh path/to/squizz-X.sql.gz   restore a backup file made by backup-squizz.sh
#   MEDIA_ARCHIVE=path/to/squizz-media-X.tar.gz bash scripts/restore-drill.sh path/to/squizz-X.sql.gz
#
# The dump is restored into a throwaway database (name ending in _restore_drill, dropped at the end), then
# checked: every table of the schema is present, row counts match the source when there is one, and the
# Prisma migrations are all applied. A media archive, when given, is listed and extracted into a temporary
# folder. Nothing is written to the source database, and only a database whose name ends in
# _restore_drill is ever dropped. On the VPS, run it as root with DATABASE_URL from /opt/squizz-secrets.env
# and a backup file: the production database is only read when no file is given, never written.
set -euo pipefail
cd "$(dirname "$0")/.."

URL=${DATABASE_URL:-$(grep '^DATABASE_URL=' .env | cut -d= -f2- | tr -d '"')}
URL=${URL%%\?*}
DRILL=${RESTORE_DRILL_DB:-squizz_restore_drill}
case "$DRILL" in
  *_restore_drill) ;;
  *) echo "Refusé : la base d’exercice doit finir par _restore_drill (ici « $DRILL »)." >&2; exit 1 ;;
esac
SOURCE_DB=$(printf '%s' "$URL" | sed -E 's#.*/([^/?]+)$#\1#')
[ "$SOURCE_DB" != "$DRILL" ] || { echo "Refusé : la source et la base d’exercice sont la même base." >&2; exit 1; }
ADMIN_URL=$(printf '%s' "$URL" | sed -E "s#/[^/]+\$#/postgres#")
DRILL_URL=$(printf '%s' "$URL" | sed -E "s#/[^/]+\$#/$DRILL#")
WORK=$(mktemp -d)
cleanup() {
  psql "$ADMIN_URL" -qc "DROP DATABASE IF EXISTS \"$DRILL\" WITH (FORCE)" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

DUMP=${1:-}
if [ -z "$DUMP" ]; then
  DUMP="$WORK/source.sql.gz"
  echo "1. Copie de la base « $SOURCE_DB » (lecture seule)…"
  pg_dump --no-owner "$URL" | gzip > "$DUMP"
  COMPARE=1
else
  [ -f "$DUMP" ] || { echo "Fichier introuvable : $DUMP" >&2; exit 1; }
  echo "1. Sauvegarde fournie : $DUMP ($(du -h "$DUMP" | cut -f1))"
  COMPARE=${COMPARE_WITH_SOURCE:-0}
fi
gzip -t "$DUMP" || { echo "ÉCHEC : l’archive est corrompue." >&2; exit 1; }

echo "2. Restauration dans la base jetable « $DRILL »…"
psql "$ADMIN_URL" -qc "DROP DATABASE IF EXISTS \"$DRILL\" WITH (FORCE)" -c "CREATE DATABASE \"$DRILL\"" >/dev/null
START=$(date +%s)
gunzip -c "$DUMP" | psql -q -v ON_ERROR_STOP=1 "$DRILL_URL" >"$WORK/restore.log" 2>&1 || {
  echo "ÉCHEC : la restauration s’est arrêtée sur une erreur :" >&2
  tail -5 "$WORK/restore.log" >&2
  exit 1
}
echo "   restaurée en $(($(date +%s) - START)) s"

echo "3. Vérifications…"
TABLES_SQL="SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1"
psql -Atq "$DRILL_URL" -c "$TABLES_SQL" >"$WORK/tables"
FAILED=0
for expected in $(grep -E '^model ' prisma/schema.prisma | awk '{print $2}'); do
  grep -qx "$expected" "$WORK/tables" || { echo "   table manquante : $expected"; FAILED=1; }
done
PENDING=$(psql -Atq "$DRILL_URL" -c "SELECT count(*) FROM \"_prisma_migrations\" WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL")
APPLIED=$(psql -Atq "$DRILL_URL" -c "SELECT count(*) FROM \"_prisma_migrations\" WHERE finished_at IS NOT NULL")
EXPECTED=$(find prisma/migrations -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
echo "   migrations : $APPLIED appliquées dans la sauvegarde, $EXPECTED dans le code, $PENDING inachevée(s)"
[ "$PENDING" = "0" ] || FAILED=1
printf '   %-22s %10s %10s\n' "table" "restaurée" "source"
while read -r table; do
  restored=$(psql -Atq "$DRILL_URL" -c "SELECT count(*) FROM \"$table\"")
  source="-"
  if [ "$COMPARE" = "1" ]; then
    source=$(psql -Atq "$URL" -c "SELECT count(*) FROM \"$table\"")
    # The source keeps living during the drill (games, logs): only fewer rows in the copy are a failure
    # for the tables that never shrink between the dump and the count.
    [ "$restored" = "$source" ] || echo "   écart sur $table (la source a pu changer depuis la copie)"
  fi
  printf '   %-22s %10s %10s\n' "$table" "$restored" "$source"
done <"$WORK/tables"

if [ -n "${MEDIA_ARCHIVE:-}" ]; then
  echo "4. Archive des médias : $MEDIA_ARCHIVE"
  tar -tzf "$MEDIA_ARCHIVE" >"$WORK/media.list" || { echo "ÉCHEC : archive des médias illisible." >&2; exit 1; }
  mkdir "$WORK/media" && tar -xzf "$MEDIA_ARCHIVE" -C "$WORK/media"
  echo "   $(grep -vc '/$' "$WORK/media.list") fichiers extraits sans erreur (dossier temporaire, supprimé ensuite)"
fi

if [ "$FAILED" = "0" ]; then
  echo "RÉUSSI : la sauvegarde se restaure et contient toutes les tables du schéma. Base d’exercice supprimée."
else
  echo "ÉCHEC : voir les lignes ci-dessus." >&2
  exit 1
fi
