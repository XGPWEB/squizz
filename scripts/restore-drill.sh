#!/usr/bin/env bash
# Restore drill: proves that a backup can actually be restored, without touching any existing database.
#
#   bash scripts/restore-drill.sh                            dump the database of DATABASE_URL (read only), restore it
#   bash scripts/restore-drill.sh path/to/squizz-X.sql.gz    restore a backup file made by backup-squizz.sh
#   MEDIA_ARCHIVE=path/to/squizz-media-X.tar.gz bash scripts/restore-drill.sh path/to/squizz-X.sql.gz
#
# Every input is checked before any database is touched. The restore goes into a NEW database with a unique
# name (squizz_restore_drill_<date>_<random>); the script refuses to run if that name already exists, and at
# the end drops only the database it created itself. It then checks:
#   - every table of prisma/schema.prisma is present;
#   - the applied migrations are exactly the ones of prisma/migrations, by name;
#   - the row counts, compared with the source database (DATABASE_URL), according to RESTORE_DRILL_COMPARE:
#       strict  the source is frozen (no writes since the backup): any difference is a failure;
#       live    the source keeps changing: differences are listed, the comparison is NOT validated;
#       none    no comparison.
#     Default: live when the script dumps the source itself, none when a file is given.
#
# Exit codes: 0 everything checked and passed; 3 restore and structure verified, row comparison not
# validated (live or none); 1 failure or invalid input. Nothing is ever written to the source database.
set -euo pipefail
cd "$(dirname "$0")/.."

fail() {
  echo "ÉCHEC : $*" >&2
  exit 1
}
# Identifiers interpolated in SQL: plain lowercase/uppercase names only, nothing that could be quoted out.
valid_ident() { [[ "$1" =~ ^[A-Za-z_][A-Za-z0-9_]{0,62}$ ]]; }

# --- 1. Inputs, before any database operation ------------------------------------------------------------
DUMP=${1:-}
MEDIA=${MEDIA_ARCHIVE:-}
URL=${DATABASE_URL:-}
if [ -z "$URL" ] && [ -f .env ]; then URL=$(grep '^DATABASE_URL=' .env | cut -d= -f2- | tr -d '"' || true); fi
URL=${URL%%\?*}
[ -n "$URL" ] || fail "DATABASE_URL absent (variable d’environnement ou .env)."
[[ "$URL" =~ ^postgres(ql)?://[^[:space:]\'\"]+/[^/[:space:]]+$ ]] || fail "DATABASE_URL invalide."
SOURCE_DB=${URL##*/}
valid_ident "$SOURCE_DB" || fail "nom de la base source invalide : « $SOURCE_DB »."

if [ -n "$DUMP" ]; then
  [ -f "$DUMP" ] && [ -r "$DUMP" ] || fail "sauvegarde introuvable ou illisible : $DUMP"
  gzip -t "$DUMP" 2>/dev/null || fail "l’archive $DUMP est corrompue (gzip -t)."
fi
if [ -n "$MEDIA" ]; then
  [ -f "$MEDIA" ] && [ -r "$MEDIA" ] || fail "archive des médias introuvable : $MEDIA"
  tar -tzf "$MEDIA" >/dev/null 2>&1 || fail "archive des médias illisible : $MEDIA"
fi
COMPARE=${RESTORE_DRILL_COMPARE:-$([ -n "$DUMP" ] && echo none || echo live)}
case "$COMPARE" in strict | live | none) ;; *) fail "RESTORE_DRILL_COMPARE doit valoir strict, live ou none." ;; esac
[ -f prisma/schema.prisma ] && [ -d prisma/migrations ] || fail "lancer depuis une copie du dépôt (prisma/ introuvable)."
for tool in psql gzip gunzip tar; do command -v "$tool" >/dev/null || fail "outil manquant : $tool"; done
[ -n "$DUMP" ] || command -v pg_dump >/dev/null || fail "outil manquant : pg_dump"

# A unique name per run; checked again against the server below, never reused, never forced.
DRILL="squizz_restore_drill_$(date +%Y%m%d%H%M%S)_$(od -An -N4 -tx4 /dev/urandom | tr -d ' \n')"
valid_ident "$DRILL" || fail "nom de base d’exercice invalide : $DRILL"
ADMIN_URL="${URL%/*}/postgres"
DRILL_URL="${URL%/*}/$DRILL"

WORK=$(mktemp -d)
CREATED=0
cleanup() {
  # Only the database this run created, under the exact name it created.
  if [ "$CREATED" = "1" ]; then
    psql -X -q "$ADMIN_URL" -c "DROP DATABASE IF EXISTS \"$DRILL\" WITH (FORCE)" >/dev/null 2>&1 ||
      echo "Attention : la base d’exercice $DRILL n’a pas pu être supprimée." >&2
  fi
  rm -rf "$WORK"
}
trap cleanup EXIT

# --- 2. Source dump (read only) when no file is given ----------------------------------------------------
if [ -z "$DUMP" ]; then
  DUMP="$WORK/source.sql.gz"
  echo "1. Copie de la base « $SOURCE_DB » (lecture seule)…"
  pg_dump --no-owner "$URL" | gzip >"$DUMP" || fail "pg_dump a échoué."
  gzip -t "$DUMP" || fail "copie de la source corrompue."
else
  echo "1. Sauvegarde fournie : $DUMP ($(du -h "$DUMP" | cut -f1))"
fi

# --- 3. A new database, never an existing one ------------------------------------------------------------
EXISTS=$(psql -X -Atq "$ADMIN_URL" -c "SELECT count(*) FROM pg_database WHERE datname = '$DRILL'") ||
  fail "serveur PostgreSQL injoignable."
[ "$EXISTS" = "0" ] || fail "une base nommée $DRILL existe déjà : rien n’a été touché."
echo "2. Restauration dans la base jetable « $DRILL »…"
psql -X -q "$ADMIN_URL" -c "CREATE DATABASE \"$DRILL\"" >/dev/null 2>"$WORK/create.log" ||
  fail "création de la base d’exercice refusée : $(tail -1 "$WORK/create.log")"
CREATED=1
START=$(date +%s)
gunzip -c "$DUMP" | psql -X -q -v ON_ERROR_STOP=1 "$DRILL_URL" >"$WORK/restore.log" 2>&1 || {
  tail -5 "$WORK/restore.log" >&2
  fail "la restauration s’est arrêtée sur une erreur."
}
echo "   restaurée en $(($(date +%s) - START)) s"

# --- 4. Checks ---------------------------------------------------------------------------------------------
echo "3. Vérifications…"
FAILED=0
psql -X -Atq "$DRILL_URL" -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1" >"$WORK/tables"
for expected in $(grep -E '^model ' prisma/schema.prisma | awk '{print $2}'); do
  grep -qx "$expected" "$WORK/tables" || {
    echo "   table manquante : $expected"
    FAILED=1
  }
done

# Migrations, by name: those of the code must all be applied, and nothing unknown to the code.
find prisma/migrations -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort >"$WORK/migrations.code"
psql -X -Atq "$DRILL_URL" -c "SELECT migration_name FROM \"_prisma_migrations\"
  WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY 1" >"$WORK/migrations.backup" ||
  echo -n >"$WORK/migrations.backup"
UNFINISHED=$(psql -X -Atq "$DRILL_URL" -c "SELECT count(*) FROM \"_prisma_migrations\"
  WHERE finished_at IS NULL AND rolled_back_at IS NULL" 2>/dev/null || echo "?")
MISSING=$(comm -23 "$WORK/migrations.code" "$WORK/migrations.backup")
UNKNOWN=$(comm -13 "$WORK/migrations.code" "$WORK/migrations.backup")
echo "   migrations : $(wc -l <"$WORK/migrations.backup" | tr -d ' ') appliquées, $(wc -l <"$WORK/migrations.code" | tr -d ' ') dans le code"
[ -z "$MISSING" ] || {
  echo "   migrations du code absentes de la sauvegarde :" $MISSING
  FAILED=1
}
[ -z "$UNKNOWN" ] || {
  echo "   migrations de la sauvegarde inconnues du code :" $UNKNOWN
  FAILED=1
}
[ "$UNFINISHED" = "0" ] || {
  echo "   migrations inachevées : $UNFINISHED"
  FAILED=1
}

DIFFS=0
printf '   %-24s %10s %10s\n' "table" "restaurée" "source"
while read -r table; do
  if ! valid_ident "$table"; then
    echo "   nom de table inattendu, ignoré : $table"
    FAILED=1
    continue
  fi
  restored=$(psql -X -Atq "$DRILL_URL" -c "SELECT count(*) FROM \"$table\"")
  source="-"
  if [ "$COMPARE" != "none" ]; then
    source=$(psql -X -Atq "$URL" -c "SELECT count(*) FROM \"$table\"" 2>/dev/null || echo "?")
    [ "$restored" = "$source" ] || DIFFS=$((DIFFS + 1))
  fi
  printf '   %-24s %10s %10s%s\n' "$table" "$restored" "$source" "$([ "$source" != "-" ] && [ "$restored" != "$source" ] && echo "  ← écart")"
done <"$WORK/tables"

if [ -n "$MEDIA" ]; then
  echo "4. Archive des médias : $MEDIA"
  mkdir "$WORK/media" && tar -xzf "$MEDIA" -C "$WORK/media" || {
    echo "   extraction impossible"
    FAILED=1
  }
  echo "   $(find "$WORK/media" -type f | wc -l | tr -d ' ') fichiers extraits (dossier temporaire, supprimé ensuite)"
fi

# --- 5. Verdict: never « réussi » if something failed or was not checked ------------------------------------
if [ "$FAILED" = "1" ]; then fail "voir les lignes ci-dessus. Base d’exercice supprimée."; fi
case "$COMPARE" in
  strict)
    [ "$DIFFS" = "0" ] || fail "$DIFFS table(s) diffèrent de la source figée."
    echo "RÉUSSI : restauration, tables, migrations et nombres de lignes identiques à la source figée."
    ;;
  live)
    echo "PARTIEL : la sauvegarde se restaure, toutes les tables et migrations sont là."
    echo "         Intégrité comparative NON validée : la source a pu changer depuis la copie ($DIFFS écart(s))."
    echo "         Pour une preuve complète : source figée et RESTORE_DRILL_COMPARE=strict."
    exit 3
    ;;
  none)
    echo "PARTIEL : la sauvegarde se restaure, toutes les tables et migrations sont là."
    echo "         Nombres de lignes non comparés (aucune source de référence)."
    exit 3
    ;;
esac
