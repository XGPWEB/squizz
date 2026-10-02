"""Super-admin monitoring page: alerts and scheduled tasks. bash scripts/e2e.sh monitoring"""
import os, secrets, subprocess
from helpers import BASE, client, request, signup, env, admin_login, sql, mock

root = admin_login(client(), env('SEED_SUPER_ADMIN_EMAIL'), env('SEED_SUPER_ADMIN_PASSWORD'))
page = lambda c=root, query='': c.open(BASE + '/super-admin/monitoring' + query, timeout=60).read().decode()
url = os.environ['DATABASE_URL'].split('?')[0]

# --- Reserved to the super-admin; no task has run yet ------------------------------------------------------
admin, _, _ = signup()
assert 'Tâches planifiées' not in page(admin) and 'Tâches planifiées' not in page(client())
first = page()
assert 'Tâches planifiées' in first and 'Jamais lancée' in first
# (Earlier scenarios may already have raised alerts — billing failures are real ones — so none is assumed.)

# --- A page that crashed in a browser reports it; the stored path holds no token ---------------------------
mark, token = f'TypeError : test {secrets.token_hex(4)}', secrets.token_urlsafe(32)
request(client(), 'POST', '/api/monitoring', {'message': mark, 'path': f'/reinitialiser/{token}?x=1'})
request(client(), 'POST', '/api/monitoring', {'message': ''}, expect=400)
seen = page()
assert mark in seen and '/reinitialiser/…' in seen and token not in seen and 'Erreur dans le navigateur' in seen
assert mark in page(query='?jours=30&type=client') and mark not in page(query='?type=server')

# --- An unexpected server error (here: Stripe down during a checkout) is recorded with its route -------------
mock('fail', {'method': 'GET', 'path': '/v1/customers', 'status': 500, 'times': 4})
request(admin, 'POST', '/api/billing/checkout', {'plan': 'PRO'}, expect=500)
mock('fail', {'clear': True})
seen = page(query='?type=server')
assert 'Erreur serveur' in seen and 'POST /api/billing/checkout' in seen, seen[-3000:]

# --- The backup script records its runs with this statement (deploy/setup-server.sh) ----------------------
record = '''INSERT INTO "CronRun" ("id", "job", "startedAt", "finishedAt", "success", "detail")
VALUES (gen_random_uuid()::text, 'backup', :'start'::timestamp, now() AT TIME ZONE 'UTC', :'ok'::boolean, :'detail');'''
def backup(ok, detail):
    subprocess.run(['psql', url, '-q', '-v', 'ON_ERROR_STOP=1', '-v', "start=2026-09-01 00:15:00", '-v', f'ok={ok}', '-v', f'detail={detail}'],
                   input=record, text=True, check=True, capture_output=True)
backup('true', "squizz-20261002-0215 (12M)")
assert 'squizz-20261002-0215 (12M)' in page() and 'En retard' in page()   # a success, but an old one
backup('false', "pg_dump a échoué, l'archive n'existe pas")
sql("""UPDATE "CronRun" SET "startedAt" = now() AT TIME ZONE 'UTC' WHERE detail LIKE 'pg_dump%'""")
assert 'pg_dump a échoué, l&#x27;archive n&#x27;existe pas' in page() and 'Échec' in page()
# The health check writes its alerts the same way.
subprocess.run(['psql', url, '-q', '-v', 'ON_ERROR_STOP=1', '-v', 'message=Contrôle de santé : 503'], text=True, check=True, capture_output=True,
               input='''INSERT INTO "SystemAlert" ("id", "type", "message", "createdAt")
VALUES (gen_random_uuid()::text, 'health', :'message', now() AT TIME ZONE 'UTC');''')
assert 'Contrôle de santé : 503' in page() and 'Santé du serveur' in page()

# --- The nightly purge records its own run and drops what is older than 90 days ----------------------------
sql("""INSERT INTO "SystemAlert" ("id", "type", "message", "createdAt") VALUES ('vieille', 'server', 'trop vieille', (now() AT TIME ZONE 'UTC') - interval '100 days')""")
done = subprocess.run(['node', 'deploy/purge.mjs'], capture_output=True, text=True)
assert done.returncode == 0 and 'purge OK' in done.stdout, (done.stdout, done.stderr)
assert sql("""SELECT count(*) FROM "SystemAlert" WHERE id = 'vieille'""") == '0'
assert sql("""SELECT success::text || ' ' || detail FROM "CronRun" WHERE job = 'purge'""").startswith('true ')
assert 'Purge des données' in page() and mark in page()
print('PASS: monitoring page reserved to the super-admin; browser errors recorded without tokens; backup, health and purge reported; 90-day retention.')
