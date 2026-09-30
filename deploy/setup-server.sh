#!/bin/bash
# One-time (idempotent) preparation of the VPS for SQuizz. Run ON the VPS as root:
#   bash /tmp/squizz-setup-server.sh
# Creates the dedicated PostgreSQL role and database, the secrets file, the folders,
# the backup and health-check scripts and their cron entries. Never touches other apps.
set -euo pipefail

APP=squizz
DB=squizz
DB_USER=squizz_admin
SECRETS=/opt/${APP}-secrets.env

mkdir -p /opt/${APP} /opt/${APP}-media /opt/backups/${APP}-db /opt/scripts
chmod 700 /opt/backups/${APP}-db

# --- Dedicated system user: the app never runs as root --------------------------------------------
if ! id "$APP" >/dev/null 2>&1; then
  useradd --system --home-dir /opt/${APP} --no-create-home --shell /usr/sbin/nologin "$APP"
  echo "Utilisateur système $APP créé."
fi
# /opt/squizz: traversable so Nginx can serve /_next/static; PM2 state private to the app user.
chmod 711 /opt/${APP}
mkdir -p /opt/${APP}/.pm2
chown -R "$APP:$APP" /opt/${APP}/.pm2 /opt/${APP}-media
chmod 700 /opt/${APP}/.pm2 /opt/${APP}-media

# --- PostgreSQL: dedicated role and database, password generated here and kept here ----------
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
  DB_PASS=$(openssl rand -hex 24)
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';" >/dev/null
  echo "Rôle PostgreSQL ${DB_USER} créé."
else
  DB_PASS=""
  echo "Rôle PostgreSQL ${DB_USER} déjà présent."
fi
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB}'" | grep -q 1; then
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB} OWNER ${DB_USER};" >/dev/null
  echo "Base ${DB} créée."
fi

# --- Secrets (chmod 600, outside the code) ----------------------------------------------------
if [ ! -f "$SECRETS" ]; then
  [ -n "$DB_PASS" ] || { echo "Le rôle existe mais $SECRETS est absent : recréez-le à la main."; exit 1; }
  umask 077
  cat > "$SECRETS" <<ENV
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB}
AUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=https://www.squizz.fun
APP_URL=https://www.squizz.fun
MEDIA_DIR=/opt/${APP}-media
# Adresse qui reçoit les alertes (sauvegarde, santé). Optionnel.
ALERT_EMAIL=contact@pressweb.fr
# SMTP pour les emails (mot de passe oublié, invitations). Optionnel : sans SMTP, les liens vont dans les logs.
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="SQuizz <contact@pressweb.fr>"
# Cloudflare Turnstile pour le formulaire de contact. Optionnel.
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
ENV
  echo "Secrets écrits dans $SECRETS."
fi
chmod 600 "$SECRETS"

# --- Backup: pg_dump + media, 7 days retention, alert on failure --------------------------------
cat > /opt/scripts/backup-squizz.sh <<'SH'
#!/bin/bash
# SQuizz — daily database and media backup. pipefail so a failed pg_dump is never logged as OK.
set -euo pipefail
umask 077
LOG=/var/log/squizz-backup.log
DIR=/opt/backups/squizz-db
STAMP=$(date +%Y%m%d-%H%M)
log() { echo "$(date '+%Y-%m-%d %H:%M') — $*" >> "$LOG"; }
alerte() {
  log "ÉCHEC — $1"
  DEST=$(grep '^ALERT_EMAIL=' /opt/squizz-secrets.env | cut -d= -f2-)
  if [ -n "$DEST" ] && command -v msmtp >/dev/null; then
    printf 'To: %s\nSubject: [ALERTE] SQuizz — sauvegarde en echec\n\n%s\nHeure : %s\nLes sauvegardes existantes n ont pas ete purgees.\n' \
      "$DEST" "$1" "$(date '+%d/%m/%Y %H:%M')" | msmtp "$DEST" 2>>"$LOG" || true
  fi
  exit 1
}
URL=$(grep '^DATABASE_URL=' /opt/squizz-secrets.env | cut -d= -f2-)
pg_dump --no-owner "$URL" | gzip > "$DIR/squizz-$STAMP.sql.gz" || alerte "pg_dump a échoué"
# A real check of the content, not just the size: every table must be in the dump.
[ "$(zcat "$DIR/squizz-$STAMP.sql.gz" | grep -c '^COPY ')" -ge 10 ] || alerte "dump incomplet (tables manquantes)"
tar -czf "$DIR/squizz-media-$STAMP.tar.gz" -C /opt squizz-media || alerte "archive des médias en échec"
# Daily copies for 7 days, plus the Sunday copies for 5 weeks.
find "$DIR" -name 'squizz-*.gz' -mtime +6 -newermt '-35 days' | while read -r f; do
  [ "$(date -r "$f" +%u)" = "7" ] || rm -f "$f"
done
find "$DIR" -name 'squizz-*.gz' -mtime +35 -delete
log "OK — squizz-$STAMP"
SH

# --- Health check every 5 minutes, alert with a 30-minute cooldown ------------------------------
cat > /opt/scripts/check-health-squizz.sh <<'SH'
#!/bin/bash
LOG=/var/log/squizz-health.log
STAMP=/tmp/squizz-health-alert
CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1:3010/api/health || true)
# The newest daily dump must be less than 26 hours old.
LAST=$(ls -1t /opt/backups/squizz-db/squizz-2*.sql.gz 2>/dev/null | head -1)
if [ -z "$LAST" ] || [ $(( $(date +%s) - $(stat -c %Y "$LAST") )) -gt 93600 ]; then CODE="$CODE, sauvegarde de plus de 26 h"; fi
if [ "$CODE" = "200" ]; then rm -f "$STAMP"; exit 0; fi
echo "$(date '+%Y-%m-%d %H:%M') — santé $CODE" >> "$LOG"
if [ ! -f "$STAMP" ] || [ $(( $(date +%s) - $(stat -c %Y "$STAMP") )) -gt 1800 ]; then
  touch "$STAMP"
  DEST=$(grep '^ALERT_EMAIL=' /opt/squizz-secrets.env | cut -d= -f2-)
  if [ -n "$DEST" ] && command -v msmtp >/dev/null; then
    printf 'To: %s\nSubject: [ALERTE] SQuizz ne repond plus\n\nEtat : %s (a %s).\n' \
      "$DEST" "$CODE" "$(date '+%d/%m/%Y %H:%M')" | msmtp "$DEST" || true
  fi
fi
SH
chmod 700 /opt/scripts/backup-squizz.sh /opt/scripts/check-health-squizz.sh

# --- Off-site copy: read-only rsync module pulled by the NAS, like the other apps -------------------
# Same access rules as [pj-backups] (NAS range + loopback only, not listable, NAS account).
if ! grep -q '^\[squizz-backups\]' /etc/rsyncd.conf 2>/dev/null; then
  cp /etc/rsyncd.conf "/etc/rsyncd.conf.bak-$(date +%Y%m%d-%H%M%S)"
  cat >> /etc/rsyncd.conf <<'RSYNC'

[squizz-backups]
# SQuizz : dumps PostgreSQL + medias, recuperes par le NAS (meme durcissement que pj-backups).
list = no
hosts allow = 81.249.0.0/16 127.0.0.1 ::1
hosts deny = *
transfer logging = yes
path = /opt/backups/squizz-db
comment = SQuizz Backups (db + medias)
read only = true
auth users = nas-backup
RSYNC
  echo "Module rsync squizz-backups ajouté (à récupérer par le NAS)."
fi

# --- Certificate renewals must reach Nginx, not just the disk ------------------------------------
cat > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh <<'SH'
#!/bin/bash
# Reload Nginx after any certificate renewal so it serves the new certificate.
nginx -t && systemctl reload nginx
SH
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

# --- Log rotation for the scripts' logs --------------------------------------------------------------
cat > /etc/logrotate.d/squizz <<'ROT'
/var/log/squizz-*.log {
  monthly
  rotate 12
  compress
  missingok
  notifempty
}
ROT

# --- Cron (added once, other apps' entries untouched) --------------------------------------------
( crontab -l 2>/dev/null | grep -v 'backup-squizz.sh\|check-health-squizz.sh'
  echo "15 2 * * * /opt/scripts/backup-squizz.sh"
  echo "*/5 * * * * /opt/scripts/check-health-squizz.sh" ) | crontab -

# --- Prisma CLI for migrations (pinned to the app's version) ---------------------------------------
if [ ! -x /opt/${APP}-tools/node_modules/.bin/prisma ]; then
  mkdir -p /opt/${APP}-tools
  PATH=/opt/node24/bin:$PATH npm --prefix /opt/${APP}-tools install --no-audit --no-fund prisma@5.22.0 >/dev/null
  echo "Prisma CLI installé dans /opt/${APP}-tools."
fi
# Start the app user's PM2 at boot.
if [ ! -f /etc/systemd/system/pm2-${APP}.service ]; then
  env PATH="/opt/node24/bin:$PATH" pm2 startup systemd -u "$APP" --hp /opt/${APP} >/dev/null
  echo "Démarrage automatique de PM2 pour $APP configuré."
fi
echo "Serveur prêt pour SQuizz."
