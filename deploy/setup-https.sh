#!/bin/bash
# One-time: Nginx site + Let's Encrypt certificate for squizz.fun and www.squizz.fun.
# Run ON the VPS as root once the DNS A records point to this server:
#   bash /tmp/squizz-setup-https.sh
set -euo pipefail
SITE=/etc/nginx/sites-available/squizz
IP=$(curl -s --max-time 10 https://api.ipify.org || true)
for host in squizz.fun www.squizz.fun; do
  RESOLVED=$(getent ahostsv4 "$host" | awk "NR==1{print \$1}")
  [ "$RESOLVED" = "$IP" ] || { echo "$host pointe vers '$RESOLVED' et non vers ce serveur ($IP). Corrigez le DNS puis relancez."; exit 1; }
done

# 1) Temporary HTTP-only site so certbot can answer the challenge.
cat > "$SITE" <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name squizz.fun www.squizz.fun;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 503; }
}
NGINX
ln -sf "$SITE" /etc/nginx/sites-enabled/squizz
nginx -t
systemctl reload nginx

# 2) Certificate (webroot, so no other site's config is modified).
certbot certonly --webroot -w /var/www/html -d squizz.fun -d www.squizz.fun \
  --non-interactive --agree-tos --register-unsafely-without-email --keep-until-expiring

# 3) Final site.
cp /tmp/squizz-nginx.conf "$SITE"
nginx -t
systemctl reload nginx
echo "HTTPS actif pour squizz.fun et www.squizz.fun."
