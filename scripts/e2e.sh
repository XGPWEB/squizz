#!/usr/bin/env bash
# Integration tests against an ISOLATED database and server, never the development or production data.
#   bash scripts/e2e.sh            all scenarios
#   bash scripts/e2e.sh editing    one scenario (tests/editing.py)
#   bash scripts/e2e.sh browser    the journeys in a real browser (tests/browser, Playwright; once on a new
#                                  machine: npx playwright install chromium webkit)
#   bash scripts/e2e.sh browser-prod   the same browser against a production build (port E2E_PROD_PORT)
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
# Nor real Google Analytics: empty, because a test build would otherwise read the ID in .env.production.
unset GA_PROPERTY_ID GA_SERVICE_ACCOUNT_EMAIL GA_SERVICE_ACCOUNT_PRIVATE_KEY
export NEXT_PUBLIC_GA_MEASUREMENT_ID=
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

# « browser-prod »: the browser journeys against a production build of the application — its own build folder
# and port, the same isolated database. Page preloading and the production router only exist there.
browser_prod() {
  local port=${E2E_PROD_PORT:-$((PORT + 100))} out status server
  out=$(mktemp)
  NEXT_DIST_DIR=.next-build npx next build >"$out" 2>&1 || { tail -30 "$out"; return 1; }
  NEXT_DIST_DIR=.next-build NODE_ENV=production NEXTAUTH_URL="http://localhost:$port" APP_URL="http://localhost:$port" \
    npx next start --port "$port" >"$out" 2>&1 &
  server=$!
  for _ in $(seq 1 60); do
    curl -sf "http://127.0.0.1:$port/api/health" >/dev/null 2>&1 && break
    sleep 1
  done
  SQUIZZ_URL="http://127.0.0.1:$port" SQUIZZ_BROWSER_BUILD=production npx playwright test && status=0 || status=$?
  kill "$server" 2>/dev/null
  [ "$status" -eq 0 ] || { echo "--- serveur de production de test :"; tail -30 "$out"; }
  return "$status"
}
SCENARIOS=${*:-game-flow rich-game-flow fill-match wheel teams remote qa reports profiles sharing timeout quiz-management accounts contact super-admin game-live rights security editing email-verification transfer admins billing event-pass monitoring auth-hardening browser browser-prod}
FAILED=0
for t in $SCENARIOS; do
  # « browser » and « browser-prod » are the Playwright suite (tests/browser, real Chromium), on the dev
  # server and on a production build; the others are Python scenarios.
  if { case "$t" in browser) npx playwright test ;; browser-prod) browser_prod ;; *) python3 "tests/$t.py" ;; esac; } >"$LOG.$t" 2>&1; then echo "ok    $t"; else echo "ÉCHEC $t"; tail -40 "$LOG.$t"; FAILED=1; fi
done
exit $FAILED
