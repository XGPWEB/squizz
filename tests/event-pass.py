"""Event pass (one payment, no subscription), against the Stripe mock only: bash scripts/e2e.sh event-pass.

Paid once, granted once: Premium limits for 7 days, extended by a second pass, back to the plan afterwards.
"""
import secrets
from helpers import client, request, signup, invite, mock, stripe_event, set_plan, sql

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

# --- Once over, the organisation is back to its own limits ------------------------------------------------------
sql(f"""UPDATE "Organization" SET "eventPassUntil" = (now() AT TIME ZONE 'UTC') - interval '1 minute' WHERE name = '{name}'""")
assert players(admin) == 5

# --- A plan that already gives as much does not need it; a subscription can still be taken with a pass ---------
set_plan(name, 'PREMIUM')
buy(admin, expect=400)
set_plan(name, 'PRO')
assert buy(admin)['url'].startswith('https://checkout.mock/')
print('PASS: event pass sold once per page, granted once per payment, 7 days of Premium limits, extended by a second pass, caught up when the webhook is late, gone when over.')
