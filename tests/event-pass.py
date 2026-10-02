"""Event pass (one payment, no subscription), against the Stripe mock only: bash scripts/e2e.sh event-pass.

Paid once, granted once: Premium limits for 7 days, extended by a second pass, back to the plan afterwards.
"""
import concurrent.futures, os, secrets, subprocess, time
from helpers import BASE, client, call, request, signup, invite, mock, stripe_event, set_plan, sql

buy = lambda c, expect=200: request(c, 'POST', '/api/billing/checkout', {'pass': True}, expect=expect)
org = lambda c: request(c, 'GET', '/api/org')['organization']
players = lambda c: org(c)['limits']['maxPlayersPerGame']
opened = lambda: [s for s in mock('state')['sessions'].values() if s['status'] == 'open']
def until(name):
    # Prisma stores dates in UTC, in columns without a time zone.
    return sql(f"""SELECT COALESCE(EXTRACT(EPOCH FROM "eventPassUntil" - (now() AT TIME ZONE 'UTC'))::int, 0) FROM "Organization" WHERE name = '{name}'""")
days = lambda name: round(int(until(name)) / 86400, 1)
passes = lambda name: int(sql(f"""SELECT count(*) FROM "EventPass" p JOIN "Organization" o ON o.id = p."organizationId" WHERE o.name = '{name}'"""))

mock('reset', {})
name = f'Org evenement {secrets.token_hex(3)}'
admin, email, pw = signup(name)
assert players(admin) == 5 and org(admin)['plan'] == 'FREE'

# --- One payment page, a one-off payment of 29 €, nothing granted before it is paid ---------------------------
url = buy(admin)['url']
assert buy(admin)['url'] == url and len(opened()) == 1
session = opened()[0]
assert session['mode'] == 'payment' and session['amount_total'] == 2900 and session['metadata']['kind'] == 'event-pass'
assert session['product'] == 'prod_VMugZ1ibhjTp4K'
stripe_event('checkout.session.completed', session)  # reported, but not paid
assert players(admin) == 5 and passes(name) == 0
# A forged payment report is refused.
request(client(), 'POST', '/api/billing/webhook', {'type': 'checkout.session.completed'}, expect=400)

# --- Paid: Premium limits for 7 days, the plan itself is unchanged; the same payment counts once ---------------
paid = mock('complete', {'session': session['id']})['session']
stripe_event('checkout.session.completed', paid)
assert players(admin) == 80 and org(admin)['plan'] == 'FREE' and days(name) == 7.0
stripe_event('checkout.session.completed', paid)
stripe_event('checkout.session.async_payment_succeeded', paid)
assert passes(name) == 1 and days(name) == 7.0
assert not mock('state')['subscriptions']
# Only an administrator buys (the pass also lifts the member limit, so a host can be invited).
host, _, _ = invite(admin)
buy(host, expect=403)

# --- A second pass adds 7 days; if Stripe's report is late, coming back from the payment page grants it --------
again = buy(admin)['url']
assert again != url
mock('complete', {'session': opened()[0]['id']})
request(admin, 'GET', '/app/abonnement?paiement=pack', expect=None)
assert passes(name) == 2 and days(name) == 14.0
request(admin, 'GET', '/app/abonnement?paiement=pack', expect=None)  # reloading the page adds nothing
assert passes(name) == 2 and days(name) == 14.0

# --- Once over, the organisation is back to its own limits, and so is a game launched during the pass ----------
code = call(admin, 'create', quizId='geo')['code']
assert call(admin, 'state', code=code)['maxPlayers'] == 80
early = client()
call(early, 'join', code=code, name='Avant')
sql(f"""UPDATE "Organization" SET "eventPassUntil" = (now() AT TIME ZONE 'UTC') - interval '1 minute' WHERE name = '{name}'""")
assert players(admin) == 5
time.sleep(0.5)  # the game's shared snapshot is kept for 400 ms
joined = lambda: len(call(admin, 'state', code=code)['players'])
assert call(admin, 'state', code=code)['maxPlayers'] == 5 and joined() == 1  # the player already in stays
for i in range(4):
    call(client(), 'join', code=code, name=f'Apres {i}')
call(client(), 'join', code=code, name='En trop', expect=400)
assert joined() == 5

# --- Joins queued behind the game's lock when the pass ends get the limit of the moment they enter -------------
sql(f"""UPDATE "Organization" SET "eventPassUntil" = (now() AT TIME ZONE 'UTC') + interval '1 day' WHERE name = '{name}'""")
queue = call(admin, 'create', quizId='geo')['code']
holder = subprocess.Popen(['psql', os.environ['DATABASE_URL'].split('?')[0], '-X', '-qAt'], text=True,
                          stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
holder.stdin.write(f"BEGIN; SELECT pg_advisory_xact_lock(hashtext('{queue}')); SELECT 'LOCKED';\n"); holder.stdin.flush()
while holder.stdout.readline().strip() != 'LOCKED': pass
try:
    with concurrent.futures.ThreadPoolExecutor(max_workers=7) as pool:
        waiting = [pool.submit(call, client(), 'join', None, code=queue, name=f'File {i}') for i in range(7)]
        time.sleep(1.5)  # all seven are now waiting for the lock, their room read under the pass
        sql(f"""UPDATE "Organization" SET "eventPassUntil" = (now() AT TIME ZONE 'UTC') - interval '1 minute' WHERE name = '{name}'""")
        holder.stdin.write('COMMIT;\n\\q\n'); holder.stdin.flush()
        refused = sum('error' in f.result() for f in waiting)
finally:
    holder.terminate(); holder.wait(timeout=5)
time.sleep(0.5)
state = call(admin, 'state', code=queue)
assert state['maxPlayers'] == 5 and len(state['players']) == 5 and refused == 2, (state['maxPlayers'], len(state['players']), refused)

# --- Simultaneous purchases (double click, several tabs) open one payment page, not one each --------------------
rush, _, rush_pw = signup(f'Org pack rafale {secrets.token_hex(3)}')
session_of = lambda c: [s for s in mock('state')['sessions'].values() if s['metadata'].get('organizationId') == org(c)['id']]
buy(rush)  # creates the Stripe customer; its page is closed so that nothing is there to reuse
mock('expire', {'session': session_of(rush)[0]['id']})
mock('delay', {'path': '/v1/checkout/sessions', 'method': 'POST', 'ms': 600})
try:
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        urls = {r['url'] for r in pool.map(lambda _: buy(rush), range(4))}
finally:
    mock('delay', {'clear': True})
still_open = [s for s in session_of(rush) if s['status'] == 'open']
assert len(urls) == 1 and len(still_open) == 1, (urls, still_open)
# Paid: buying again is a new purchase (it adds days), with a page of its own.
mock('complete', {'session': still_open[0]['id']})
assert buy(rush)['url'] not in urls
# A purchase interrupted before its page was known is resumed, not doubled: the retry gets the same page.
rush_id = org(rush)['id']
mock('expire', {'session': [s for s in session_of(rush) if s['status'] == 'open'][0]['id']})
sql(f"""CREATE FUNCTION test_pass_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF NEW.id = '{rush_id}' AND OLD."checkoutOpKey" IS NOT NULL AND NEW."checkoutOpKey" IS NULL THEN RAISE EXCEPTION 'TEST_PASS_FAILURE'; END IF;
  RETURN NEW; END; $$;
  CREATE TRIGGER test_pass_failure BEFORE UPDATE ON "Organization" FOR EACH ROW EXECUTE FUNCTION test_pass_failure();""")
try:
    buy(rush, expect=500)
finally:
    sql('DROP TRIGGER test_pass_failure ON "Organization"; DROP FUNCTION test_pass_failure();')
assert len([s for s in session_of(rush) if s['status'] == 'open']) == 1
resumed = buy(rush)['url']
assert [s['url'] for s in session_of(rush) if s['status'] == 'open'] == [resumed]

# --- An organisation deleted while its payment page is being created leaves nothing payable at Stripe ----------
mock('expire', {'session': [s for s in session_of(rush) if s['status'] == 'open'][0]['id']})
mock('delay', {'path': '/v1/checkout/sessions', 'method': 'POST', 'ms': 2000})
try:
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        buying = pool.submit(buy, rush, None)
        time.sleep(0.7)
        assert request(rush, 'DELETE', '/api/account', {'password': rush_pw}) == {'deleted': 'organization'}
        buying.result()
finally:
    mock('delay', {'clear': True})
assert sql(f"""SELECT count(*) FROM "Organization" WHERE id = '{rush_id}'""") == '0'
left = [s for s in mock('state')['sessions'].values() if s['metadata'].get('organizationId') == rush_id and s['status'] == 'open']
assert not left, left

# --- A plan that already gives as much does not need it; a subscription can still be taken with a pass ---------
set_plan(name, 'PREMIUM')
buy(admin, expect=400)
# The pricing page sends to the sign-up page; someone already signed in goes straight to the subscription page.
offer = '/inscription?suite=%2Fapp%2Fabonnement%3Foffre%3DEVENEMENT'
assert admin.open(BASE + offer, timeout=60).geturl().endswith('/app/abonnement?offre=EVENEMENT')
assert client().open(BASE + offer, timeout=60).geturl().endswith(offer)
# Coming from the pricing page for the pass, the page says why it is not offered.
page = lambda: admin.open(BASE + '/app/abonnement?offre=EVENEMENT', timeout=60).read().decode()
assert 'donne déjà tout ce qu’apporte le Pack Événement' in page()
sql(f"""UPDATE "Organization" SET partner = true WHERE name = '{name}'""")
assert 'est partenaire' in page() and 'le Pack Événement ne vous apporterait rien de plus' in page()
sql(f"""UPDATE "Organization" SET partner = false WHERE name = '{name}'""")
set_plan(name, 'PRO')
assert buy(admin)['url'].startswith('https://checkout.mock/')
print('PASS: event pass sold once per page, granted once per payment, 7 days of Premium limits, extended by a second pass, caught up when the webhook is late, gone when over.')
