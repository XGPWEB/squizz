"""Billing guarantees, against the Stripe mock only: bash scripts/e2e.sh billing.

One subscription per organisation whatever the clicks, retries, parallel requests and webhook order, and no
subscription left running once an organisation is deleted.
"""
import secrets, threading
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

# The first organisation is untouched by all this.
assert plan_of(admin) == 'PRO' and [s['id'] for s in live(first['customer'])] == [first['id']]
print('PASS: one checkout under double clicks and parallel requests, plan change on the same subscription, '
      'duplicate and orphan subscriptions cancelled, late webhook adopted, deletion cancels Stripe first '
      '(failure deletes nothing, retry works), all against the Stripe mock.')
