"""Roles, rights and plans: python3 tests/accounts.py (needs the seeded super-admin in .env)."""
from helpers import client, call, request, signup, invite, login, env

q = lambda title: {'title': title, 'questions': [{'text': 'Q ?', 'options': ['a', 'b'], 'correct': 0}]}

# --- Signup: an organisation with its first administrator ---------------------------------
admin, admin_email, admin_pw = signup('Org droits')
org = request(admin, 'GET', '/api/org')
assert org['me']['role'] == 'ORG_ADMIN' and org['organization']['plan'] == 'FREE'
request(client(), 'POST', '/api/account/signup',
        {'organization': 'X', 'name': 'Y', 'email': admin_email, 'password': 'Motdepasse-123'}, expect=409)
request(client(), 'POST', '/api/account/signup',
        {'organization': 'X', 'name': 'Y', 'email': 'court@example.test', 'password': 'court'}, expect=400)
login(client(), admin_email, 'mauvais-mot-de-passe', ok=False)

# --- Invitations and roles ----------------------------------------------------------------
host, host_email, host_pw = invite(admin, 'HOST', 'Hugo')
me = request(host, 'GET', '/api/org')
assert me['me']['role'] == 'HOST' and me['invitations'] == []
request(host, 'POST', '/api/org/invitations', {'email': 'x@example.test', 'role': 'HOST'}, expect=403)
request(host, 'PATCH', '/api/org', {'name': 'Piratage'}, expect=403)
request(host, 'GET', '/api/admin/organizations', expect=403)
request(admin, 'GET', '/api/admin/organizations', expect=403)

# Hosts edit only their own quizzes; admins edit everything in the organisation.
host_quiz = call(host, 'save', quiz=q('Quiz de Hugo'))['quiz']['id']
admin_quiz = call(admin, 'save', quiz=q('Quiz admin'))['quiz']['id']
call(host, 'update', expect=403, quizId=admin_quiz, quiz=q('Modifié'))
call(host, 'delete', expect=403, quizId=admin_quiz)
call(admin, 'update', quizId=host_quiz, quiz=q('Corrigé par l’admin'))
library = {x['id']: x for x in call(host, 'list')['quizzes']}
assert library[admin_quiz]['canEdit'] is False and library[host_quiz]['canEdit'] is True

# Another organisation never sees these quizzes.
outsider, _, _ = signup('Autre org')
assert all(x['id'] not in (host_quiz, admin_quiz) for x in call(outsider, 'list')['quizzes'])
call(outsider, 'create', expect=404, quizId=host_quiz)
member_ids = [m['id'] for m in org['members']]
request(outsider, 'PATCH', f'/api/org/members/{member_ids[0]}', {'role': 'HOST'}, expect=404)

# --- Plan limits (Gratuit: 5 quiz, 3 membres, 20 joueurs) ---------------------------------
for i in range(3):
    call(admin, 'save', quiz=q(f'Remplissage {i}'))
call(admin, 'save', expect=403, quiz=q('Sixième'))
invite(admin, 'HOST', 'Troisième')
request(admin, 'POST', '/api/org/invitations', {'email': 'quatrieme@example.test', 'role': 'HOST'}, expect=403)
code = call(admin, 'create', quizId='general')['code']
assert call(admin, 'state', code=code)['maxPlayers'] == 20
players = [client() for _ in range(21)]
for i, p in enumerate(players[:20]):
    call(p, 'join', code=code, name=f'Joueur {i}')
call(players[20], 'join', expect=400, code=code, name='En trop')

# --- The organisation always keeps an admin -----------------------------------------------
admin_id = next(m['id'] for m in request(admin, 'GET', '/api/org')['members'] if m['role'] == 'ORG_ADMIN')
request(admin, 'PATCH', f'/api/org/members/{admin_id}', {'role': 'HOST'}, expect=409)
request(admin, 'DELETE', f'/api/org/members/{admin_id}', expect=409)

# --- Deactivating a member revokes their session immediately -------------------------------
host_id = next(m['id'] for m in request(admin, 'GET', '/api/org')['members'] if m['email'] == host_email)
request(admin, 'PATCH', f'/api/org/members/{host_id}', {'active': False})
call(host, 'list', expect=401)
login(client(), host_email, host_pw, ok=False)

# --- Super-admin: plans, suspension, reset links, audit ------------------------------------
root = login(client(), env('SEED_SUPER_ADMIN_EMAIL'), env('SEED_SUPER_ADMIN_PASSWORD'))
orgs = request(root, 'GET', '/api/admin/organizations')['organizations']
org_id = next(o['id'] for o in orgs if o['name'] == 'Org droits')
request(root, 'PATCH', f'/api/admin/organizations/{org_id}', {'plan': 'PRO'})
call(admin, 'save', quiz=q('Sixième, en Pro'))
request(admin, 'PATCH', f'/api/org/members/{host_id}', {'active': True})
assert call(admin, 'state', code=call(admin, 'create', quizId='geo')['code'])['maxPlayers'] == 100

link = request(root, 'POST', f'/api/admin/users/{host_id}/reset')['link']
request(client(), 'POST', '/api/account/reset', {'token': link.rsplit('/', 1)[1], 'password': 'Nouveau-mdp-42'})
request(client(), 'POST', '/api/account/reset', {'token': link.rsplit('/', 1)[1], 'password': 'Encore-un-mdp'}, expect=404)
host = login(client(), host_email, 'Nouveau-mdp-42')

request(root, 'PATCH', f'/api/admin/organizations/{org_id}', {'status': 'SUSPENDED'})
call(admin, 'list', expect=401)
login(client(), admin_email, admin_pw, ok=False)
request(root, 'PATCH', f'/api/admin/organizations/{org_id}', {'status': 'ACTIVE'})
admin = login(client(), admin_email, admin_pw)
call(admin, 'list')

actions = {e['action'] for e in request(root, 'GET', '/api/admin/audit')['entries']}
assert {'organization.update', 'member.update', 'user.reset_link', 'invitation.create'} <= actions

request(root, 'DELETE', f'/api/admin/organizations/{org_id}', {'confirm': 'mauvais nom'}, expect=400)
request(root, 'DELETE', f'/api/admin/organizations/{org_id}', {'confirm': 'Org droits'})
login(client(), admin_email, admin_pw, ok=False)

# --- Password change revokes other sessions; forgot password never reveals accounts ---------
user, email, pw = signup()
other_device = login(client(), email, pw)
request(user, 'POST', '/api/account/password', {'current': 'faux', 'next': 'Nouveau-mdp-99'}, expect=403)
request(user, 'POST', '/api/account/password', {'current': pw, 'next': 'Nouveau-mdp-99'})
call(other_device, 'list', expect=401)
request(client(), 'POST', '/api/account/forgot', {'email': 'inconnu@example.test'})
request(client(), 'POST', '/api/account/forgot', {'email': email})

print('PASS: signup, invitations, roles, cross-organisation isolation, plan limits, last-admin guard, '
      'deactivation, super-admin plans/suspension/reset/audit/deletion, password change and reset.')
