"""Signup email verification and sign-in throttling: python3 tests/email-verification.py."""
import secrets
from helpers import BASE, client, request, login, verify, env, admin_login, sql

email = f'verif-{secrets.token_hex(6)}@example.test'
pw = 'Motdepasse-' + secrets.token_hex(4)
out = request(client(), 'POST', '/api/account/signup',
              {'organization': 'Org vérif', 'name': 'Vera', 'email': email, 'password': pw, 'suite': '/app/abonnement?offre=PRO'})
assert out['verify'] is True and '/verifier-email/' in out['devLink'] and 'suite=' in out['devLink']

# Not confirmed yet: the right password is refused with a clear message; a wrong one says nothing more.
c = client()
csrf = request(c, 'GET', '/api/auth/csrf')['csrfToken']
res = request(c, 'POST', '/api/auth/callback/credentials',
              {'csrfToken': csrf, 'email': email, 'password': pw, 'json': 'true'}, expect=None, form=True)
assert not request(c, 'GET', '/api/auth/session').get('user')
assert 'Confirmez' in str(res), res  # NextAuth passes the reason on to the form
login(client(), email, 'mauvais-mot-de-passe', ok=False)

# Resend: same answer for unknown addresses; a new link replaces the old one.
assert request(client(), 'POST', '/api/account/verify/resend', {'email': 'personne-zz@example.test'}) == {'ok': True}
second = request(client(), 'POST', '/api/account/verify/resend', {'email': email})['devLink']
old_token = out['devLink'].split('/verifier-email/', 1)[1].split('?', 1)[0]
request(client(), 'POST', '/api/account/verify', {'token': old_token}, expect=404)  # replaced
request(client(), 'POST', '/api/account/verify', {'token': 'x' * 43}, expect=404)  # unknown
assert verify(second)['email'] == email
assert verify(second).get('already') is True  # single use: a second click changes nothing
# The offer chosen on the pricing page is kept with the organisation: a plain sign-in (no link followed, the
# « Connexion » button, another device) opens the space on that offer, once.
wanted = lambda: sql(f"""SELECT COALESCE(o."wantedOffer", '') FROM "Organization" o JOIN "User" u ON u."organizationId" = o.id WHERE u.email = '{email}'""")
assert wanted() == 'PRO'
member = login(client(), email, pw)
landing = member.open(BASE + '/app', timeout=60)
assert landing.geturl().endswith('/app/abonnement?offre=PRO'), landing.geturl()
assert 'plan-pro wanted' in landing.read().decode()
assert wanted() == '' and member.open(BASE + '/app', timeout=60).geturl().endswith('/app')
# Only offers that are sold are remembered; a signup without one opens on the library as before.
for suite, kept in (('/app/abonnement?offre=EVENEMENT', 'EVENEMENT'), ('/app/abonnement?offre=FREE', ''),
                    ('/app/abonnement?offre=nimporte', ''), ('/app/equipe', ''), (None, '')):
    other = f'verif-{secrets.token_hex(6)}@example.test'
    body = {'organization': 'Org offre', 'name': 'Vera', 'email': other, 'password': pw}
    made = request(client(), 'POST', '/api/account/signup', body | ({'suite': suite} if suite else {}))
    assert sql(f"""SELECT COALESCE(o."wantedOffer", '') FROM "Organization" o JOIN "User" u ON u."organizationId" = o.id WHERE u.email = '{other}'""") == kept, suite
# Once confirmed, no more links are sent.
assert 'devLink' not in request(client(), 'POST', '/api/account/verify/resend', {'email': email})

# The super-admin is never blocked by verification.
admin_login(client(), env('SEED_SUPER_ADMIN_EMAIL'), env('SEED_SUPER_ADMIN_PASSWORD'))

# Sign-in throttling: failures from many addresses do not lock the owner out of an address already used.
home = {'X-Real-IP': '10.9.0.1'}
def attempt(password, ip):
    c = client()
    c.addheaders = [('X-Real-IP', ip)]
    csrf = request(c, 'GET', '/api/auth/csrf')['csrfToken']
    request(c, 'POST', '/api/auth/callback/credentials',
            {'csrfToken': csrf, 'email': email, 'password': password, 'json': 'true'}, expect=None, form=True)
    return bool(request(c, 'GET', '/api/auth/session').get('user'))
assert attempt(pw, home['X-Real-IP'])
for i in range(12):
    assert not attempt('mauvais', f'10.9.1.{i}')
assert attempt(pw, home['X-Real-IP'])
print('PASS: signup needs a confirmed address, single-use and replaced links, uniform resend, super-admin '
      'unaffected, known address never locked by others.')
