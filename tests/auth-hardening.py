"""Forms never put a password in the address, long passwords stay distinct, a revoked session stops hosting:
python3 tests/auth-hardening.py (isolated run only: bash scripts/e2e.sh auth-hardening)."""
import re, secrets, subprocess, time, urllib.request
from helpers import BASE, client, call, request, signup, login, invite, admin_login, env, set_plan, sql

root = admin_login(client(), env('SEED_SUPER_ADMIN_EMAIL'), env('SEED_SUPER_ADMIN_PASSWORD'))
org = f'Org auth {secrets.token_hex(3)}'
admin, admin_email, admin_pw = signup(org)
org_id = set_plan(org, 'PRO')


def page(path, c=None):
    return (c or client()).open(BASE + path, timeout=60).read().decode()


# --- Every form that carries a password is sent by POST, even before the page's script has loaded ---------
invitation = request(admin, 'POST', '/api/org/invitations', {'email': f'inv-{secrets.token_hex(4)}@example.test', 'role': 'HOST'})['link']
member, member_email, member_pw = invite(admin)
member_id = next(m['id'] for m in request(admin, 'GET', '/api/org')['members'] if m['email'] == member_email)
reset = request(root, 'POST', f'/api/admin/users/{member_id}/reset')['link']
for path in ['/connexion', '/super-admin/connexion', '/inscription', '/mot-de-passe-oublie',
             '/invitation/' + invitation.rsplit('/', 1)[1], '/reinitialiser/' + reset.rsplit('/', 1)[1]]:
    html = page(path)
    forms = re.findall(r'<form\b[^>]*>', html)
    assert forms and all(re.search(r'\bmethod="post"', f, re.I) for f in forms), (path, forms)
    if 'type="password"' in html:
        # Without the script, the browser's own submission is blocked rather than sent to the address bar.
        inside = html[html.index('<form'):html.index('</form>')]
        submits = [b for b in re.findall(r'<button\b[^>]*>', inside) if 'type="button"' not in b]
        assert submits and all('disabled' in b for b in submits) and '<noscript>' in inside, (path, submits)
for path in ['/app/compte']:
    forms = re.findall(r'<form\b[^>]*>', page(path, admin))
    assert forms and all(re.search(r'\bmethod="post"', f, re.I) for f in forms), (path, forms)

# --- Navigation links keep a name when the label is hidden on a phone -------------------------------------
links = re.findall(r'<a\b[^>]*class="[^"]*app-tab[^"]*"[^>]*>', page('/app', admin))
assert len(links) >= 3 and all('aria-label="' in a and 'title="' in a for a in links), links

# --- Passwords longer than 72 bytes stay different from one another: login, change, reset -----------------
def can_login(email, password):
    c = client()
    csrf = request(c, 'GET', '/api/auth/csrf')['csrfToken']
    request(c, 'POST', '/api/auth/callback/credentials',
            {'csrfToken': csrf, 'email': email, 'password': password, 'json': 'true'}, expect=None, form=True)
    return bool(request(c, 'GET', '/api/auth/session').get('user'))


user, email, pw = signup()
for base in ['A' * 72, 'é' * 36, '🎉' * 18 + 'Mot-de-passe-']:  # 72 bytes of ASCII, of accents, and beyond
    long_pw = base + '-original'
    request(user, 'POST', '/api/account/password', {'current': pw, 'next': long_pw})
    assert not can_login(email, base + '-different') and not can_login(email, base), base
    assert can_login(email, long_pw)
    # The current password is checked the same way when changing it.
    user = login(client(), email, long_pw)
    request(user, 'POST', '/api/account/password', {'current': base + '-different', 'next': 'Autre-mdp-12345'}, expect=403)
    pw = long_pw
user_id = sql(f"""SELECT id FROM "User" WHERE email = '{email}'""")
link = request(root, 'POST', f'/api/admin/users/{user_id}/reset')['link']
request(client(), 'POST', '/api/account/reset', {'token': link.rsplit('/', 1)[1], 'password': 'B' * 80 + '-un'})
assert can_login(email, 'B' * 80 + '-un') and not can_login(email, 'B' * 80 + '-deux')

# An account created before this change (plain bcrypt) still signs in, and is upgraded on that login.
old_pw = 'Ancien-mdp-' + secrets.token_hex(4)
legacy = subprocess.run(['node', '-e', 'console.log(require("bcryptjs").hashSync(process.argv[1], 12))', old_pw],
                        check=True, capture_output=True, text=True).stdout.strip()
sql(f"""UPDATE "User" SET "passwordHash" = '{legacy}', "failedLoginCount" = 0, "lockedUntil" = NULL WHERE id = '{user_id}'""")
assert not can_login(email, old_pw + 'x')
assert sql(f"""SELECT "passwordHash" FROM "User" WHERE id = '{user_id}'""") == legacy  # a failed attempt upgrades nothing
assert can_login(email, old_pw)
assert sql(f"""SELECT "passwordHash" FROM "User" WHERE id = '{user_id}'""").startswith('v2$')
assert can_login(email, old_pw) and not can_login(email, old_pw + 'x')

# --- A revoked session stops being recognised as the host by the game's polling, within a few seconds ------
WINDOW = 6.5  # the polling cache lasts 5 s


def hosting(c, code):
    return request(c, 'GET', '/api/game?action=state&code=' + code, expect=None).get('host') is True


def assert_revoked(c, code, revoke, what):
    assert hosting(c, code), what  # recognised, and the answer is now in the cache
    revoke()
    began = time.time()
    while hosting(c, code):
        assert time.time() - began < WINDOW, f'{what} : toujours animateur après {WINDOW} s'
        time.sleep(0.4)
    time.sleep(0.5)
    assert not hosting(c, code), what  # and it stays so
    assert call(c, 'start', expect=None, code=code).get('error'), what  # writes were already refused


qid = call(admin, 'save', quiz={'title': 'Révocation', 'questions': [{'text': 'Q', 'options': ['a', 'b'], 'correct': 0}]})['quiz']['id']
# Password changed from another device.
host, host_email, host_pw = invite(admin)
elsewhere = login(client(), host_email, host_pw)
assert_revoked(host, call(host, 'create', quizId=qid)['code'],
               lambda: request(elsewhere, 'POST', '/api/account/password', {'current': host_pw, 'next': 'Nouveau-mdp-4242'}),
               'mot de passe changé')
# Member deactivated by the administrator.
host2, host2_email, _ = invite(admin)
host2_id = next(m['id'] for m in request(admin, 'GET', '/api/org')['members'] if m['email'] == host2_email)
assert_revoked(host2, call(host2, 'create', quizId=qid)['code'],
               lambda: request(admin, 'PATCH', f'/api/org/members/{host2_id}', {'active': False}), 'membre désactivé')
# Super-admin viewing the organisation, then signed out everywhere.
viewer = admin_login(client(), env('SEED_SUPER_ADMIN_EMAIL'), env('SEED_SUPER_ADMIN_PASSWORD'))
request(viewer, 'POST', f'/api/admin/organizations/{org_id}/view')
assert_revoked(viewer, call(viewer, 'create', quizId=qid)['code'],
               lambda: sql(f"""UPDATE "User" SET "sessionVersion" = "sessionVersion" + 1 WHERE email = '{env('SEED_SUPER_ADMIN_EMAIL')}'"""),
               'session super-admin révoquée')
# Organisation suspended.
root = admin_login(client(), env('SEED_SUPER_ADMIN_EMAIL'), env('SEED_SUPER_ADMIN_PASSWORD'))
try:
    assert_revoked(admin, call(admin, 'create', quizId=qid)['code'],
                   lambda: request(root, 'PATCH', f'/api/admin/organizations/{org_id}', {'status': 'SUSPENDED'}),
                   'organisation suspendue')
finally:
    request(root, 'PATCH', f'/api/admin/organizations/{org_id}', {'status': 'ACTIVE'})
# A session that was never revoked keeps hosting, poll after poll.
keeper, _, _ = signup()
code = call(keeper, 'create', quizId='geo')['code']
assert all(hosting(keeper, code) for _ in range(5))

print('PASS: password forms are POST and blocked before the script loads, named navigation links, long and Unicode '
      'passwords distinct (login, change, reset), legacy hash upgraded at login, revoked sessions (password, '
      'deactivation, super-admin, suspension) stop hosting within the polling cache window.')
