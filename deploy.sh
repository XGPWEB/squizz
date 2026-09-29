#!/bin/bash
# Deploys SQuizz to the VPS. Run locally from the project root: bash deploy.sh
# First time only, prepare the server: bash deploy.sh --setup   (then --https once DNS points to the VPS)
set -euo pipefail

VPS=root@187.124.13.21
KEY=~/.ssh/id_rsa_Claudeia
SSH="ssh -i $KEY -o StrictHostKeyChecking=accept-new $VPS"
SCP="scp -i $KEY -o StrictHostKeyChecking=accept-new"
APP_DIR=/opt/squizz
PORT=3010
NODE=/opt/node24/bin/node
cd "$(dirname "$0")"

if [ "${1:-}" = "--setup" ]; then
  $SCP deploy/setup-server.sh "$VPS:/tmp/squizz-setup-server.sh"
  $SSH "bash /tmp/squizz-setup-server.sh && rm /tmp/squizz-setup-server.sh"
  exit 0
fi
if [ "${1:-}" = "--https" ]; then
  $SCP deploy/setup-https.sh "$VPS:/tmp/squizz-setup-https.sh"
  $SCP deploy/nginx-squizz.conf "$VPS:/tmp/squizz-nginx.conf"
  $SSH "bash /tmp/squizz-setup-https.sh && rm /tmp/squizz-setup-https.sh /tmp/squizz-nginx.conf"
  exit 0
fi

echo "[0/5] Tests unitaires (bloquants)"
npm test

echo "[1/5] Build standalone"
rm -rf .next/standalone
npx prisma generate >/dev/null
npx next build
STANDALONE=.next/standalone
cp -R public "$STANDALONE/public"
mkdir -p "$STANDALONE/.next" && cp -R .next/static "$STANDALONE/.next/static"
cp deploy/create-super-admin.mjs "$STANDALONE/"
# Linux query engine for the VPS (Ubuntu 24.04, OpenSSL 3).
mkdir -p "$STANDALONE/node_modules/.prisma/client"
cp node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node "$STANDALONE/node_modules/.prisma/client/"

echo "[2/5] Archive"
ARCHIVE=/tmp/squizz-release.tar.gz
tar -czf "$ARCHIVE" -C "$STANDALONE" . 
tar -czf /tmp/squizz-prisma.tar.gz prisma/schema.prisma prisma/migrations

echo "[3/5] Vérification du serveur"
$SSH "test -f /opt/squizz-secrets.env && test -x /opt/squizz-tools/node_modules/.bin/prisma" \
  || { echo "Serveur non préparé : lancez d'abord  bash deploy.sh --setup"; exit 1; }

echo "[4/5] Envoi (en cas d'erreur réseau, relancez simplement le script)"
$SCP "$ARCHIVE" /tmp/squizz-prisma.tar.gz "$VPS:/tmp/"

echo "[5/5] Migration, bascule et redémarrage"
$SSH bash -s <<REMOTE
set -euo pipefail
cd $APP_DIR
set -a; . /opt/squizz-secrets.env; set +a

# Database migrations first: if they fail, the running version keeps serving.
rm -rf migrate && mkdir migrate && tar -xzf /tmp/squizz-prisma.tar.gz -C migrate
PATH=/opt/node24/bin:\$PATH /opt/squizz-tools/node_modules/.bin/prisma migrate deploy --schema migrate/prisma/schema.prisma

# New release next to the current one, then swap; the previous one is kept for rollback.
rm -rf app-new && mkdir app-new && tar -xzf /tmp/squizz-release.tar.gz -C app-new
rm -rf app-prev
[ -d app ] && mv app app-prev
mv app-new app
rm -f /tmp/squizz-release.tar.gz /tmp/squizz-prisma.tar.gz

# PM2 config generated from the secrets file (never stored in the code).
python3 - <<'PY'
import json
env = {"NODE_ENV": "production", "TZ": "Europe/Paris", "PORT": "$PORT", "HOSTNAME": "127.0.0.1"}
for line in open("/opt/squizz-secrets.env"):
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k] = v
app = {"name": "squizz", "script": "$APP_DIR/app/server.js", "cwd": "$APP_DIR/app", "interpreter": "$NODE",
       "env": env, "instances": 1, "autorestart": True, "watch": False, "max_memory_restart": "512M"}
open("/opt/squizz-ecosystem.config.js", "w").write("module.exports = " + json.dumps({"apps": [app]}, indent=2) + ";\n")
PY
chmod 600 /opt/squizz-ecosystem.config.js
pm2 startOrRestart /opt/squizz-ecosystem.config.js --update-env
pm2 save >/dev/null

for i in \$(seq 1 20); do
  [ "\$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$PORT/api/health)" = "200" ] && { echo "Santé : OK"; exit 0; }
  sleep 1
done
echo "L'application ne répond pas : pm2 logs squizz --lines 50"; exit 1
REMOTE
echo "Déployé."
