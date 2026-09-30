"""Self-service data rights: python3 tests/rights.py (needs the seeded super-admin in .env)."""
import json, secrets
from helpers import BASE, client, call, request, signup, invite, login, env

tag = secrets.token_hex(3)
admin, admin_email, admin_pw = signup(f'Org droits RGPD {tag}')
host, host_email, host_pw = invite(admin, 'HOST', 'Hôte')
call(host, 'save', quiz={'title': f'Quiz export {tag}', 'questions': [{'text': 'Q ?', 'options': ['a', 'b'], 'correct': 0}]})

# Export: the account and the user's own quizzes.
raw = host.open(f'{BASE}/api/account/export', timeout=30)
assert 'attachment' in raw.headers.get('Content-Disposition', '')
data = json.load(raw)
assert data['compte']['email'] == host_email and data['compte']['quizzes'][0]['title'] == f'Quiz export {tag}'
request(client(), 'GET', '/api/account/export', expect=401)

# Deleting one's account needs the password; the last admin with members must hand over first.
request(host, 'DELETE', '/api/account', {'password': 'faux'}, expect=403)
request(admin, 'DELETE', '/api/account', {'password': admin_pw}, expect=409)
assert request(host, 'DELETE', '/api/account', {'password': host_pw})['deleted'] == 'account'
login(client(), host_email, host_pw, ok=False)
assert any(q['title'] == f'Quiz export {tag}' for q in call(admin, 'list')['quizzes'])   # quizzes stay

# Alone in the organisation, the admin's deletion removes the organisation.
assert request(admin, 'DELETE', '/api/account', {'password': admin_pw})['deleted'] == 'organization'
root = login(client(), env('SEED_SUPER_ADMIN_EMAIL'), env('SEED_SUPER_ADMIN_PASSWORD'))
assert all(o['name'] != f'Org droits RGPD {tag}' for o in request(root, 'GET', '/api/admin/organizations')['organizations'])
request(root, 'DELETE', '/api/account', {'password': env('SEED_SUPER_ADMIN_PASSWORD')}, expect=403)
print('PASS: data export, password-confirmed deletion, last-admin guard, organisation self-deletion, super-admin protected.')
