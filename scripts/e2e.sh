#!/usr/bin/env bash
# Integration tests against an ISOLATED database and server, never the development or production data.
#   bash scripts/e2e.sh            all scenarios
#   bash scripts/e2e.sh editing    one scenario (tests/editing.py)
# Creates (or recreates) the local database squizz_e2e, migrates and seeds it, starts a dev server on :5174
# with its own build folder, runs the Python scenarios, then stops the server.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT=${E2E_PORT:-5174}
DB=${E2E_DB:-squizz_e2e}
# Base URL: E2E_DATABASE_URL (CI), else the local DATABASE_URL of .env with the database name replaced.
if [ -z "${E2E_DATABASE_URL:-}" ]; then
  BASE_URL=$(grep '^DATABASE_URL=' .env | cut -d= -f2- | tr -d '"')
  E2E_DATABASE_URL=$(printf '%s' "$BASE_URL" | sed -E "s#/[^/?]+(\?|$)#/$DB\1#")
fi
# Safety: local host and a test database name only.
case "$E2E_DATABASE_URL" in
  *@localhost[:/]*|*@127.0.0.1[:/]*|*://localhost[:/]*|*://127.0.0.1[:/]*) ;;
  *) echo "Refusé : la base de test doit être locale ($E2E_DATABASE_URL)." >&2; exit 1 ;;
esac
DB_NAME=$(printf '%s' "$E2E_DATABASE_URL" | sed -E 's#.*/([^/?]+)(\?.*)?$#\1#')
case "$DB_NAME" in
  *_e2e|*_test) ;;
  *) echo "Refusé : le nom de la base de test doit finir par _e2e ou _test (ici « $DB_NAME »)." >&2; exit 1 ;;
esac

ADMIN_URL=$(printf '%s' "$E2E_DATABASE_URL" | sed -E "s#/$DB_NAME(\?|$)#/postgres\1#")
psql "${ADMIN_URL%%\?*}" -qc "DROP DATABASE IF EXISTS \"$DB_NAME\" WITH (FORCE)" -c "CREATE DATABASE \"$DB_NAME\"" >/dev/null

export DATABASE_URL="$E2E_DATABASE_URL"
export SEED_SUPER_ADMIN_EMAIL=${SEED_SUPER_ADMIN_EMAIL:-superadmin@squizz.test}
export SEED_SUPER_ADMIN_PASSWORD=${SEED_SUPER_ADMIN_PASSWORD:-E2e-super-admin-$RANDOM$RANDOM}
export AUTH_SECRET=${E2E_AUTH_SECRET:-e2e-secret-not-for-production-0123456789}
export NEXTAUTH_URL="http://localhost:$PORT" APP_URL="http://localhost:$PORT"
export MEDIA_DIR=$(mktemp -d)
export NEXT_DIST_DIR=.next-e2e
# No real email or anti-bot service during tests, and no real Stripe: billing talks to a local mock
# (tests/stripe_mock.py) with fake keys. STRIPE_API_BASE is ignored by the app in production.
unset SMTP_HOST TURNSTILE_SECRET_KEY TURNSTILE_SITE_KEY STRIPE_PRICE_STARTER STRIPE_PRICE_PRO STRIPE_PRICE_PREMIUM
STRIPE_MOCK_PORT=${E2E_STRIPE_PORT:-5175}
export STRIPE_SECRET_KEY=sk_test_mock_never_real STRIPE_WEBHOOK_SECRET=whsec_mock_never_real
export STRIPE_API_BASE="http://127.0.0.1:$STRIPE_MOCK_PORT" STRIPE_MOCK_URL="http://127.0.0.1:$STRIPE_MOCK_PORT"
python3 tests/stripe_mock.py "$STRIPE_MOCK_PORT" &
STRIPE_MOCK=$!

npx prisma migrate deploy >/dev/null
npm run -s db:seed >/dev/null

LOG=$(mktemp)
npx next dev --port "$PORT" >"$LOG" 2>&1 &
SERVER=$!
trap 'kill $SERVER $STRIPE_MOCK 2>/dev/null; rm -rf "$MEDIA_DIR"' EXIT
for _ in $(seq 1 90); do
  curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1 && break
  sleep 1
done
curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null || { echo "Le serveur de test n’a pas démarré :" >&2; tail -30 "$LOG" >&2; exit 1; }

export SQUIZZ_URL="http://127.0.0.1:$PORT"
SCENARIOS=${*:-game-flow rich-game-flow timeout quiz-management accounts contact super-admin game-live rights security editing email-verification transfer admins billing auth-hardening}
FAILED=0
for t in $SCENARIOS; do
  if python3 "tests/$t.py" >"$LOG.$t" 2>&1; then echo "ok    $t"; else echo "ÉCHEC $t"; tail -8 "$LOG.$t"; FAILED=1; fi
done
exit $FAILED
