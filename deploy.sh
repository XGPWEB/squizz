#!/bin/bash
# Deploys SQuizz to the VPS. Run locally from the project root: bash deploy.sh
# First time only, prepare the server: bash deploy.sh --setup   (then --https once DNS points to the VPS)
# Back to the previous release:         bash deploy.sh --rollback
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
if [ "${1:-}" = "--rollback" ]; then
  # Puts the previous release back (the database is left as it is; its dump is in /opt/backups/squizz-db).
  $SCP deploy/remote-release.sh "$VPS:/opt/squizz/remote-release.sh"
  $SSH "bash /opt/squizz/remote-release.sh rollback"
  exit 0
fi
if [ "${1:-}" = "--nginx" ]; then
  # Updates the Nginx site; the previous file is restored if the new one does not pass nginx -t.
  $SCP deploy/nginx-squizz.conf "$VPS:/tmp/squizz-nginx.conf"
  $SSH 'set -e; SITE=/etc/nginx/sites-available/squizz; cp $SITE /tmp/squizz-nginx.prev
    cp /tmp/squizz-nginx.conf $SITE
    if nginx -t 2>/tmp/squizz-nginx.test; then systemctl reload nginx; echo "Nginx mis à jour."
    else cp /tmp/squizz-nginx.prev $SITE; cat /tmp/squizz-nginx.test; echo "Config refusée : ancienne version remise."; exit 1; fi
    rm -f /tmp/squizz-nginx.conf /tmp/squizz-nginx.prev /tmp/squizz-nginx.test'
  exit 0
fi
if [ "${1:-}" = "--https" ]; then
  $SCP deploy/setup-https.sh "$VPS:/tmp/squizz-setup-https.sh"
  $SCP deploy/nginx-squizz.conf "$VPS:/tmp/squizz-nginx.conf"
  $SSH "bash /tmp/squizz-setup-https.sh && rm /tmp/squizz-setup-https.sh /tmp/squizz-nginx.conf"
  exit 0
fi

echo "[0/5] Vérifications (bloquantes) : types, tests unitaires"
npx tsc --noEmit
npm test

echo "[1/5] Build standalone"
rm -rf .next/standalone
npx prisma generate >/dev/null
npx next build
STANDALONE=.next/standalone
cp -R public "$STANDALONE/public"
mkdir -p "$STANDALONE/.next" && cp -R .next/static "$STANDALONE/.next/static"
cp deploy/create-super-admin.mjs deploy/purge.mjs "$STANDALONE/"
# The script runs outside Next, so it needs bcryptjs as a real package.
cp -R node_modules/bcryptjs "$STANDALONE/node_modules/"
# Linux query engine for the VPS (Ubuntu 24.04, OpenSSL 3).
mkdir -p "$STANDALONE/node_modules/.prisma/client"
cp node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node "$STANDALONE/node_modules/.prisma/client/"

# Never ship local secrets or data: Next copies .env files into standalone, production reads /opt/squizz-secrets.env.
rm -f "$STANDALONE"/.env*
for leak in .env .media tests prisma/seed.ts; do
  [ ! -e "$STANDALONE/$leak" ] || { echo "ARRÊT : $leak se retrouve dans le build."; exit 1; }
done

echo "[2/5] Archive"
ARCHIVE=/tmp/squizz-release.tar.gz
COPYFILE_DISABLE=1 tar --no-xattrs --no-mac-metadata --uid 0 --gid 0 -czf "$ARCHIVE" -C "$STANDALONE" . 
COPYFILE_DISABLE=1 tar --no-xattrs --no-mac-metadata --uid 0 --gid 0 -czf /tmp/squizz-prisma.tar.gz prisma/schema.prisma prisma/migrations

echo "[3/5] Vérification du serveur"
$SSH "test -f /opt/squizz-secrets.env && test -x /opt/squizz-tools/node_modules/.bin/prisma && id squizz >/dev/null" \
  || { echo "Serveur non préparé : lancez d'abord  bash deploy.sh --setup"; exit 1; }

echo "[4/5] Envoi (en cas d'erreur réseau, relancez simplement le script)"
$SCP "$ARCHIVE" /tmp/squizz-prisma.tar.gz "$VPS:/tmp/"

echo "[5/5] Sauvegarde, migration, bascule et redémarrage"
$SCP deploy/remote-release.sh "$VPS:/opt/squizz/remote-release.sh"
$SSH "bash /opt/squizz/remote-release.sh release"
echo "Déployé."
