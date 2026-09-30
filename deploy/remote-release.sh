#!/bin/bash
# Runs ON the VPS (uploaded by deploy.sh). Usage:
#   remote-release.sh release    migrate (after a database dump), swap in the new release, restart, roll back on failure
#   remote-release.sh rollback   put the previous release back and restart (the database is left as it is)
set -euo pipefail

APP_DIR=/opt/squizz
PORT=3010
NODE=/opt/node24/bin/node
SECRETS=/opt/squizz-secrets.env
BACKUPS=/opt/backups/squizz-db
RUN_USER=squizz                     # dedicated system user, created by setup-server.sh
export PM2_HOME=$APP_DIR/.pm2       # the app's own PM2, separate from root's (other apps)
umask 077

pm2_app() { sudo -u "$RUN_USER" PM2_HOME="$PM2_HOME" PATH="/opt/node24/bin:$PATH" pm2 "$@"; }

healthy() {
  for _ in $(seq 1 25); do
    [ "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/api/health")" = "200" ] && return 0
    sleep 1
  done
  return 1
}

write_ecosystem() {
  python3 - "$APP_DIR" "$PORT" "$NODE" "$SECRETS" <<'PY'
import json, sys
app_dir, port, node, secrets = sys.argv[1:5]
env = {"NODE_ENV": "production", "TZ": "Europe/Paris", "PORT": port, "HOSTNAME": "127.0.0.1"}
for line in open(secrets):
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        # Same meaning as when bash sources the file: surrounding quotes are not part of the value.
        if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
            v = v[1:-1]
        env[k] = v
app = {"name": "squizz", "script": f"{app_dir}/app/server.js", "cwd": f"{app_dir}/app", "interpreter": node,
       "env": env, "instances": 1, "autorestart": True, "watch": False, "max_memory_restart": "1G",
       "kill_timeout": 5000}
open(f"{app_dir}/ecosystem.config.js", "w").write("module.exports = " + json.dumps({"apps": [app]}, indent=2) + ";\n")
PY
  chown "$RUN_USER:$RUN_USER" "$APP_DIR/ecosystem.config.js"
  chmod 600 "$APP_DIR/ecosystem.config.js"
}

restart() {
  write_ecosystem
  # One-time move: earlier releases ran under root's PM2; stop that copy right before starting ours.
  if PM2_HOME=/root/.pm2 pm2 describe squizz >/dev/null 2>&1; then
    PM2_HOME=/root/.pm2 pm2 delete squizz >/dev/null && PM2_HOME=/root/.pm2 pm2 save >/dev/null
    rm -f /opt/squizz-ecosystem.config.js
  fi
  pm2_app startOrRestart "$APP_DIR/ecosystem.config.js" --update-env >/dev/null
  pm2_app save >/dev/null
}

# Code is public (Nginx serves the static files), only the runtime user needs to write logs and PM2 state.
fix_permissions() {
  chown -R root:root "$APP_DIR/app"
  chmod -R u=rwX,go=rX "$APP_DIR/app"
}

rollback() {
  [ -d "$APP_DIR/app-prev" ] || { echo "Aucune version précédente à restaurer."; exit 1; }
  cd "$APP_DIR"
  rm -rf app-failed
  mv app app-failed
  mv app-prev app
  restart
  if healthy; then echo "Retour à la version précédente : OK"; else echo "La version précédente ne répond pas non plus : pm2 logs"; exit 1; fi
}

release() {
  cd "$APP_DIR"
  set -a; . "$SECRETS"; set +a

  # 1. Dump the database before touching its schema, so a bad migration can always be undone.
  STAMP=$(date +%Y%m%d-%H%M%S)
  # pg_dump rejects Prisma's pool parameters (?connection_limit=…): pass the bare address.
  pg_dump --no-owner "${DATABASE_URL%%\?*}" | gzip > "$BACKUPS/pre-deploy-$STAMP.sql.gz"
  [ "$(zcat "$BACKUPS/pre-deploy-$STAMP.sql.gz" | grep -c '^COPY ')" -gt 0 ] || { echo "Sauvegarde avant migration invalide : arrêt."; exit 1; }
  ls -1t "$BACKUPS"/pre-deploy-*.sql.gz | tail -n +6 | xargs -r rm -f   # keep the last 5

  # 2. Migrations (additive only, so the previous release keeps working if we roll back).
  rm -rf migrate && mkdir migrate && tar --no-same-owner -xzf /tmp/squizz-prisma.tar.gz -C migrate
  PATH=/opt/node24/bin:$PATH /opt/squizz-tools/node_modules/.bin/prisma migrate deploy --schema migrate/prisma/schema.prisma

  # 3. Swap in the new release; the previous one stays next to it.
  rm -rf app-new && mkdir app-new && tar --no-same-owner -xzf /tmp/squizz-release.tar.gz -C app-new
  # Keep the previous build's static chunks so pages already open in a browser do not break.
  if [ -d app/.next/static ]; then cp -Rn app/.next/static/. app-new/.next/static/; fi
  rm -rf app-prev
  [ -d app ] && mv app app-prev
  mv app-new app
  rm -f /tmp/squizz-release.tar.gz /tmp/squizz-prisma.tar.gz
  fix_permissions
  restart

  if healthy; then
    echo "Santé : OK"
  else
    echo "La nouvelle version ne répond pas : retour automatique à la précédente."
    pm2_app logs squizz --lines 30 --nostream || true
    rollback
    exit 1
  fi
}

case "${1:-}" in
  release) release ;;
  rollback) rollback ;;
  *) echo "Usage : $0 release|rollback"; exit 2 ;;
esac
