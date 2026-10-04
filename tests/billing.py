"""Billing guarantees, against the Stripe mock only: bash scripts/e2e.sh billing.

One subscription per organisation whatever the clicks, retries, parallel requests and webhook order, and no
subscription left running once an organisation is deleted.
"""
import secrets, threading, time
from helpers import client, request, signup, mock, stripe_event, env, admin_login

PRO, STARTER = 'prod_VMCMxkLAkRlY4k', 'prod_VMCL9yfrMKdVQM'
checkout = lambda c, plan, expect=200: request(c, 'POST', '/api/billing/checkout', {'plan': plan}, expect=expect)
plan_of = lambda c: request(c, 'GET', '/api/org')['organization']['plan']
live = lambda customer=None: [s for s in mock('state')['subscriptions'].values()
                              if s['status'] != 'canceled' and customer in (None, s['customer'])]
opened = lambda: [s for s in mock('state')['sessions'].values() if s['status'] == 'open']
root = admin_login(client(), env('SEED_SUPER_ADMIN_EMAIL'), env('SEED_SUPER_ADMIN_PASSWORD'))
def org_id(name):
    return next(o['id'] for o in request(root, 'GET', '/api/admin/organizations')['organizations'] if o['name'] == name)

mock('reset', {})

# --- Double clicks and parallel requests: one Checkout page, one customer ------------------------------------
name = f'Org facturation {secrets.token_hex(3)}'
admin, email, pw = signup(name)
mock('delay', {'path': '/v1/checkout/sessions', 'ms': 300})  # widen the race window
urls, errors = [], []
def click():
    try: urls.append(checkout(admin, 'PRO')['url'])
    except AssertionError as e: errors.append(e)
threads = [threading.Thread(target=click) for _ in range(6)]
[t.start() for t in threads]; [t.join() for t in threads]
mock('delay', {'clear': True})
assert not errors and len(set(urls)) == 1, (errors, urls)
state = mock('state')
assert len(state['sessions']) == 1 and len(state['customers']) == 1, state['sessions']
# A new attempt gives the same page; another plan closes it before opening the new one.
assert checkout(admin, 'PRO')['url'] == urls[0]
other = checkout(admin, 'STARTER')['url']
assert other != urls[0] and [s['product'] for s in opened()] == [STARTER]

# --- Paid: the webhook activates the plan; later changes update the same subscription -------------------------
session = opened()[0]
paid = mock('complete', {'session': session['id']})
stripe_event('checkout.session.completed', paid['session'])
assert plan_of(admin) == 'STARTER'
stripe_event('checkout.session.completed', paid['session'])  # delivered twice: same result
stripe_event('customer.subscription.created', paid['subscription'])
assert checkout(admin, 'PRO')['url'].endswith('paiement=change') and plan_of(admin) == 'PRO'
assert len(live()) == 1 and not opened()
checkout(admin, 'PRO', expect=400)  # already the current plan

# --- A second subscription for the same organisation is cancelled; the first one stays ------------------------
first = live()[0]
duplicate = mock('subscription', {'customer': first['customer'], 'product': STARTER, 'organizationId': org_id(name)})
stripe_event('customer.subscription.created', duplicate)
assert [s['id'] for s in live()] == [first['id']] and plan_of(admin) == 'PRO'
# A forged or unsigned call changes nothing.
request(client(), 'POST', '/api/billing/webhook', {'type': 'customer.subscription.deleted'}, expect=400)

# --- Webhook late or lost: paying, then clicking again, never sells a second subscription ----------------------
name2 = f'Org webhook {secrets.token_hex(3)}'
late, _, _ = signup(name2)
checkout(late, 'PRO')
session2 = next(s for s in opened())
mock('complete', {'session': session2['id']})  # paid, but no webhook reaches the app
assert plan_of(late) == 'FREE'
out = checkout(late, 'PRO', expect=400)  # the app finds the subscription at Stripe and adopts it
assert plan_of(late) == 'PRO' and len(live(session2['customer'])) == 1 and not opened()

# --- Deleting an organisation: Stripe is cancelled first; a Stripe failure deletes nothing; a retry works ------
mock('fail', {'method': 'DELETE', 'path': '/v1/subscriptions', 'status': 500, 'times': 50})
request(late, 'DELETE', '/api/account', {'password': 'x'}, expect=403)  # wrong password: untouched
name3 = f'Org suppression {secrets.token_hex(3)}'
gone, gone_email, gone_pw = signup(name3)
checkout(gone, 'PRO')
sess3 = opened()[0]
paid3 = mock('complete', {'session': sess3['id']})
stripe_event('checkout.session.completed', paid3['session'])
assert plan_of(gone) == 'PRO'
out = request(gone, 'DELETE', '/api/account', {'password': gone_pw}, expect=502)
assert 'rien n’a été supprimé' in out['error']
assert plan_of(gone) == 'PRO' and len(live(sess3['customer'])) == 1  # still there, still paying: coherent
mock('fail', {'clear': True})
assert request(gone, 'DELETE', '/api/account', {'password': gone_pw}) == {'deleted': 'organization'}
assert not live(sess3['customer'])
assert name3 not in [o['name'] for o in request(root, 'GET', '/api/admin/organizations')['organizations']]

# Same guarantee from the super-admin, with a payment page still open.
name4 = f'Org supprimee par admin {secrets.token_hex(3)}'
target, _, _ = signup(name4)
checkout(target, 'PRO')
sess4 = opened()[0]
paid4 = mock('complete', {'session': sess4['id']})
stripe_event('checkout.session.completed', paid4['session'])
mock('fail', {'method': 'DELETE', 'path': '/v1/subscriptions', 'status': 500, 'times': 50})
request(root, 'DELETE', f'/api/admin/organizations/{org_id(name4)}', {'confirm': name4}, expect=502)
assert len(live(sess4['customer'])) == 1
mock('fail', {'clear': True})
request(root, 'DELETE', f'/api/admin/organizations/{org_id(name4)}', {'confirm': name4})
assert not live(sess4['customer'])

# --- Paid after the organisation was deleted (page left open elsewhere): cancelled as soon as Stripe says so ---
name5 = f'Org payee trop tard {secrets.token_hex(3)}'
tardy, _, tardy_pw = signup(name5)
checkout(tardy, 'STARTER')
sess5 = opened()[0]
assert request(tardy, 'DELETE', '/api/account', {'password': tardy_pw}) == {'deleted': 'organization'}
assert mock('state')['sessions'][sess5['id']]['status'] == 'expired'  # the open page was closed
orphan = mock('subscription', {'customer': sess5['customer'], 'product': STARTER, 'organizationId': sess5['organizationId']})
stripe_event('customer.subscription.created', orphan)
assert not live(sess5['customer'])

# --- A failure right after Stripe created the page (database error) must not lead to a second page -----------
from helpers import sql
name6 = f'Org panne {secrets.token_hex(3)}'
broke, _, _ = signup(name6)
oid = org_id(name6)
mine = lambda: [s for s in mock('state')['sessions'].values() if s.get('organizationId') == oid]
# Throwaway trigger, in the isolated database only: recording the session id fails once Stripe has created it.
sql(f"""CREATE FUNCTION e2e_checkout_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF NEW.id = '{oid}' AND NEW."checkoutSessionId" IS NOT NULL THEN RAISE EXCEPTION 'e2e: simulated persistence failure'; END IF;
  RETURN NEW; END; $$;
  CREATE TRIGGER e2e_checkout_failure BEFORE UPDATE ON "Organization" FOR EACH ROW EXECUTE FUNCTION e2e_checkout_failure();""")
try:
    checkout(broke, 'PRO', expect=500)
    assert len(mine()) == 1 and mine()[0]['status'] == 'open'  # created at Stripe, not recorded here
finally:
    sql('DROP TRIGGER IF EXISTS e2e_checkout_failure ON "Organization"; DROP FUNCTION IF EXISTS e2e_checkout_failure();')
first_session = mine()[0]
retry = checkout(broke, 'PRO')
assert retry['url'] == first_session['url'], (retry, first_session)  # the same operation is resumed
assert [s['id'] for s in mine() if s['status'] == 'open'] == [first_session['id']]
assert sql(f"""SELECT "checkoutSessionId" FROM "Organization" WHERE id = '{oid}'""") == first_session['id']
# Retrying with another plan closes the unrecorded page instead of leaving two.
sql(f"""UPDATE "Organization" SET "checkoutSessionId" = NULL, "checkoutPlan" = NULL WHERE id = '{oid}'""")  # « never recorded »
checkout(broke, 'STARTER')
assert [s['product'] for s in mine() if s['status'] == 'open'] == [STARTER]
assert len(mock('state')['customers']) == len({s['customer'] for s in mock('state')['sessions'].values()})  # no duplicate customer

# --- Failure, then the page expires, then a retry: the operation is repeated to the letter, not recomputed -----
# Stripe answers a key it knows with its first answer (the page as it was), and refuses that key with other
# parameters. The retry a second later must send the same expiry, see that the page is dead, and open a new one.
name8 = f'Org reprise {secrets.token_hex(3)}'
again, _, _ = signup(name8)
rid = org_id(name8)
pages = lambda: [s for s in mock('state')['sessions'].values() if s.get('organizationId') == rid and s['status'] == 'open']
sql(f"""CREATE FUNCTION e2e_checkout_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF NEW.id = '{rid}' AND NEW."checkoutSessionId" IS NOT NULL THEN RAISE EXCEPTION 'e2e: simulated persistence failure'; END IF;
  RETURN NEW; END; $$;
  CREATE TRIGGER e2e_checkout_failure BEFORE UPDATE ON "Organization" FOR EACH ROW EXECUTE FUNCTION e2e_checkout_failure();""")
try:
    checkout(again, 'PRO', expect=500)
finally:
    sql('DROP TRIGGER IF EXISTS e2e_checkout_failure ON "Organization"; DROP FUNCTION IF EXISTS e2e_checkout_failure();')
dead = pages()[0]
mock('expire', {'session': dead['id']})
seen = mock('state')
time.sleep(1.2)
fresh_page = checkout(again, 'PRO')['url']
after = mock('state')
assert fresh_page != dead['url'] and [s['url'] for s in pages()] == [fresh_page], (fresh_page, pages())
assert after['idempotencyErrors'] == seen['idempotencyErrors'] and after['replays'] == seen['replays'] + 1, (seen['replays'], after['replays'], after['idempotencyErrors'])
assert sql(f"""SELECT "checkoutSessionId" FROM "Organization" WHERE id = '{rid}'""") == pages()[0]['id']
assert sql(f"""SELECT ("checkoutOpKey" IS NULL AND "checkoutOpParams" IS NULL)::text FROM "Organization" WHERE id = '{rid}'""") == 'true'
# Stripe itself fails while creating the page: it remembers that failure for the key, so the retry needs a new one.
mock('expire', {'session': pages()[0]['id']})
mock('fail', {'method': 'POST', 'path': '/v1/checkout/sessions', 'status': 500, 'times': 1})
checkout(again, 'PRO', expect=500)
mock('fail', {'clear': True})
assert not pages()
assert checkout(again, 'PRO')['url'].startswith('https://checkout.mock/') and len(pages()) == 1
assert mock('state')['idempotencyErrors'] == seen['idempotencyErrors']

# --- The claim: only its holder writes or releases; an operation that outlived it closes what it created ------
name7 = f'Org reservation {secrets.token_hex(3)}'
slow, _, _ = signup(name7)
sid = org_id(name7)
theirs = lambda: [s for s in mock('state')['sessions'].values() if s.get('organizationId') == sid and s['status'] == 'open']
# Someone else holds the claim: this request waits, gives up, and must not release that claim.
sql(f"""UPDATE "Organization" SET "checkoutLockedUntil" = (NOW() AT TIME ZONE 'UTC') + INTERVAL '60 seconds', "checkoutLockToken" = 'autre-operation' WHERE id = '{sid}'""")
checkout(slow, 'PRO', expect=409)
assert sql(f"""SELECT "checkoutLockToken" FROM "Organization" WHERE id = '{sid}'""") == 'autre-operation'
assert not theirs()
# The claim expires (holder gone): the next request takes over normally.
PAST = "(NOW() AT TIME ZONE 'UTC') - INTERVAL '1 second'"  # the columns are UTC timestamps without time zone
sql(f"""UPDATE "Organization" SET "checkoutLockedUntil" = {PAST} WHERE id = '{sid}'""")


def overtaken(first_plan, second_plan):
    """A is still waiting for Stripe when its claim expires and B takes over. Returns both answers."""
    for s in theirs():
        mock('expire', {'session': s['id']})
    sql(f"""UPDATE "Organization" SET "checkoutSessionId" = NULL, "checkoutPlan" = NULL, "checkoutOpKey" = NULL,
            "checkoutLockedUntil" = NULL, "checkoutLockToken" = NULL WHERE id = '{sid}'""")
    out = {}
    post = lambda who, plan: out.update({who: request(slow, 'POST', '/api/billing/checkout', {'plan': plan}, expect=None)})
    mock('delay', {'path': '/v1/checkout/sessions', 'ms': 2500, 'method': 'POST'})
    try:
        a_thread = threading.Thread(target=post, args=('a', first_plan))
        a_thread.start()
        # A holds the claim and is waiting for Stripe to create its page. Waited for rather than assumed
        # after a fixed pause: on a slow machine A's request can take more than a second to get there.
        holding = lambda: sql(f"""SELECT "checkoutOpKey" IS NOT NULL FROM "Organization" WHERE id = '{sid}'""") == 't'
        deadline = time.time() + 15
        while not holding() and time.time() < deadline:
            time.sleep(0.1)
        assert holding()
        sql(f"""UPDATE "Organization" SET "checkoutLockedUntil" = {PAST} WHERE id = '{sid}'""")
        post('b', second_plan)
        a_thread.join()
    finally:
        mock('delay', {'clear': True})
    return out


# Same plan: B resumes A's operation, Stripe gives it the same page, and nobody closes it.
out = overtaken('PRO', 'PRO')
assert len(theirs()) == 1 and out['a'].get('url') == out['b'].get('url') == theirs()[0]['url'], (out, theirs())
assert sql(f"""SELECT "checkoutSessionId" FROM "Organization" WHERE id = '{sid}'""") == theirs()[0]['id']
# Another plan: B's page stands, A closes the one it created and says so.
out = overtaken('PRO', 'STARTER')
assert [s['product'] for s in theirs()] == [STARTER] and out['b'].get('url') == theirs()[0]['url'], (out, theirs())
assert 'url' not in out['a'] and 'relais' in out['a']['error'], out
assert sql(f"""SELECT "checkoutSessionId" FROM "Organization" WHERE id = '{sid}'""") == theirs()[0]['id']
assert sql(f"""SELECT "checkoutLockToken" IS NULL FROM "Organization" WHERE id = '{sid}'""") == 't'  # released

# The first organisation is untouched by all this.
assert plan_of(admin) == 'PRO' and [s['id'] for s in live(first['customer'])] == [first['id']]
print('PASS: one checkout under double clicks and parallel requests, plan change on the same subscription, '
      'duplicate and orphan subscriptions cancelled, late webhook adopted, deletion cancels Stripe first '
      '(failure deletes nothing, retry works), checkout resumed after a persistence failure, claim held and '
      'released by its holder only — all against the Stripe mock.')
