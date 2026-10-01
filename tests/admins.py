"""An organisation never loses its last active administrator, even under simultaneous requests:
bash scripts/e2e.sh admins (isolated database)."""
import secrets, threading
from helpers import client, request, signup, invite, login, set_plan, env, admin_login

def parallel(*calls):
    out = [None] * len(calls)
    def run(i, call): out[i] = call()
    threads = [threading.Thread(target=run, args=(i, c)) for i, c in enumerate(calls)]
    [t.start() for t in threads]; [t.join() for t in threads]
    return out

def members(c):
    return request(c, 'GET', '/api/org')['members']
def active_admins(ms):
    return [m for m in ms if m['role'] == 'ORG_ADMIN' and m['active']]
status = lambda c, method, path, body=None: request(c, method, path, body, expect=None).get('error')

root = admin_login(client(), env('SEED_SUPER_ADMIN_EMAIL'), env('SEED_SUPER_ADMIN_PASSWORD'))
name = f'Org admins {secrets.token_hex(3)}'
alice, alice_email, alice_pw = signup(name)
set_plan(name, 'PRO')
bob, bob_email, bob_pw = invite(alice, 'ORG_ADMIN', 'Bob')
viewer, _, _ = invite(alice, 'HOST', 'Témoin')
ids = {m['email']: m['id'] for m in members(alice)}
a, b = ids[alice_email], ids[bob_email]

# --- Two administrators demote (or deactivate) each other at the same instant, many times ---------------------
for round in range(12):
    change = {'role': 'HOST'} if round % 2 == 0 else {'active': False}
    errors = parallel(lambda: status(alice, 'PATCH', f'/api/org/members/{b}', change),
                      lambda: status(bob, 'PATCH', f'/api/org/members/{a}', change))
    left = active_admins(members(viewer))
    assert len(left) >= 1, (round, errors)
    assert errors.count(None) <= 1, errors  # never both
    # Back to two active administrators for the next round (through the super-admin).
    for uid in (a, b):
        request(root, 'PATCH', f'/api/admin/users/{uid}', {'role': 'ORG_ADMIN', 'active': True})
    alice, bob = login(client(), alice_email, alice_pw), login(client(), bob_email, bob_pw)

# --- The same holds for deletions, leaving one's own account, and the super-admin's own route -----------------
errors = parallel(lambda: status(alice, 'DELETE', f'/api/org/members/{b}'),
                  lambda: status(bob, 'DELETE', f'/api/org/members/{a}'))
assert errors.count(None) == 1 and len(active_admins(members(viewer))) == 1, errors
survivor, survivor_pw, survivor_id = (alice, alice_pw, a) if errors[0] is None else (bob, bob_pw, b)
# The last administrator cannot leave, be demoted or be deactivated while other members remain.
assert request(survivor, 'DELETE', '/api/account', {'password': survivor_pw}, expect=409)
request(survivor, 'PATCH', f'/api/org/members/{survivor_id}', {'role': 'HOST'}, expect=409)
request(root, 'PATCH', f'/api/admin/users/{survivor_id}', {'active': False}, expect=409)
request(root, 'PATCH', f'/api/admin/users/{survivor_id}', {'role': 'HOST'}, expect=409)

# Two administrators leaving their own account at the same instant: one stays.
carl, carl_email, carl_pw = invite(survivor, 'ORG_ADMIN', 'Carl')
out = parallel(lambda: request(survivor, 'DELETE', '/api/account', {'password': survivor_pw}, expect=None),
               lambda: request(carl, 'DELETE', '/api/account', {'password': carl_pw}, expect=None))
assert sorted('error' in o for o in out) == [False, True], out
assert len(active_admins(members(viewer))) == 1
print('PASS: the last active administrator survives simultaneous demotions, deactivations, deletions and '
      'self-deletions, from the team page and from the super-admin.')
