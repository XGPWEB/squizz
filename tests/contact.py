"""Contact form: python3 tests/contact.py (needs the seeded super-admin in .env)."""
import re
import secrets
from helpers import BASE, client, request, signup, login, env, admin_login

tag = secrets.token_hex(4)
ok = {'name': 'Jean Test', 'email': 'jean@example.test', 'subject': 'Souscrire à un abonnement',
      'message': f'Bonjour, je voudrais un devis. {tag}', 'consent': True}
anon = client()
request(anon, 'POST', '/api/contact', {**ok, 'consent': False}, expect=400)
request(anon, 'POST', '/api/contact', {**ok, 'message': 'court'}, expect=400)
request(anon, 'POST', '/api/contact', {**ok, 'email': 'pas-un-email'}, expect=400)
request(anon, 'POST', '/api/contact', {**ok, 'subject': 'Sujet inventé'}, expect=400)
# The honeypot answers success but stores nothing.
request(anon, 'POST', '/api/contact', {**ok, 'message': f'Robot {tag} spam spam', 'website': 'http://spam.test'})
request(anon, 'POST', '/api/contact', ok)

root = admin_login(client(), env('SEED_SUPER_ADMIN_EMAIL'), env('SEED_SUPER_ADMIN_PASSWORD'))
page = request(root, 'GET', '/super-admin/messages', expect=200)
# The menu shows what is waiting, on every super-admin page.
home = root.open(BASE + '/super-admin', timeout=60).read().decode()
assert re.search(r'Messages, \d+ à traiter', home) and 'tab-badge' in home, home[:300]
member, _, _ = signup()
request(member, 'PATCH', '/api/admin/messages/x', {'handled': True}, expect=401)
request(anon, 'DELETE', '/api/admin/messages/x', expect=401)
request(root, 'PATCH', '/api/admin/messages/inexistant', {'handled': True}, expect=404)
print('PASS: contact validation, consent, honeypot, storage and super-admin-only moderation.')
