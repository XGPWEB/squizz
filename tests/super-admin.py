"""Super-admin extras: python3 tests/super-admin.py (needs the seeded super-admin in .env)."""
import secrets
from helpers import BASE
from helpers import client, call, request, signup, invite, login, env, admin_login, set_plan

root_email, root_pw = env('SEED_SUPER_ADMIN_EMAIL'), env('SEED_SUPER_ADMIN_PASSWORD')
tag = secrets.token_hex(3)
admin, admin_email, _ = signup(f'Org vue {tag}')
set_plan(f'Org vue {tag}', 'STARTER')  # Gratuit n'a qu'un membre
host, host_email, _ = invite(admin, 'HOST', f'Animateur {tag}')
root = admin_login(client(), root_email, root_pw)
org_id = next(o['id'] for o in request(root, 'GET', '/api/admin/organizations')['organizations'] if o['name'] == f'Org vue {tag}')

# --- "View as": only the super-admin can start it; it gives the org-admin view of that organisation ---
request(admin, 'POST', f'/api/admin/organizations/{org_id}/view', expect=401)  # a client has no super-admin session
request(root, 'POST', f'/api/admin/organizations/{org_id}/view')
seen = request(root, 'GET', '/api/org')
assert seen['organization']['id'] == org_id and seen['me']['role'] == 'ORG_ADMIN'
assert any(m['email'] == host_email for m in seen['members'])
qid = call(root, 'save', quiz={'title': f'Quiz support {tag}', 'questions': [{'text': 'Q ?', 'options': ['a', 'b'], 'correct': 0}]})['quiz']['id']
assert any(q['id'] == qid for q in call(admin, 'list')['quizzes'])     # visible to the organisation itself
# Super-admin powers stay available, and the own account cannot be edited from the view.
request(root, 'GET', '/api/admin/organizations')
request(root, 'POST', '/api/account/password', {'current': root_pw, 'next': 'Nimporte-quoi-1'}, expect=403)
request(root, 'PATCH', '/api/account/password', {'name': 'Piraté'}, expect=403)
request(root, 'DELETE', '/api/admin/view')
request(root, 'GET', '/api/org', expect=401)                             # back to the super-admin space only
actions = {e['action'] for e in request(root, 'GET', '/api/admin/audit')['entries']}
assert 'organization.view_as' in actions

# --- Own account from the super-admin ---
request(root, 'PATCH', '/api/account/password?espace=super-admin', {'name': 'Super-admin SQuizz'})

# --- Global user search ---
html = root.open(f'{BASE}/super-admin/utilisateurs?q={tag}', timeout=60).read().decode()
assert host_email in html and admin_email in html, 'recherche : comptes introuvables'
assert 'Aucun utilisateur' in root.open(f'{BASE}/super-admin/utilisateurs?q=zz-introuvable-{tag}', timeout=60).read().decode()
try:
    admin.open(f'{BASE}/super-admin/utilisateurs', timeout=60)
    status = 200
except Exception as e:
    status = getattr(e, 'code', 0)
final = admin.open(f'{BASE}/super-admin/utilisateurs', timeout=60).geturl()
assert '/super-admin/utilisateurs' not in final, 'un administrateur d’organisation voit la recherche globale' 
# --- Separate sessions: one browser signed in as a client AND as the super-admin ---
both, both_email, both_pw = signup(f'Perso {tag}')
admin_login(both, root_email, root_pw)
assert request(both, 'GET', '/api/org')['organization']['name'] == f'Perso {tag}'         # the client space is the client
request(both, 'GET', '/api/admin/organizations')                               # the super-admin space works too
request(both, 'DELETE', '/api/admin/session')                                  # leaving the super-admin space...
request(both, 'GET', '/api/admin/organizations', expect=401)
assert request(both, 'GET', '/api/org')['organization']['name'] == f'Perso {tag}'         # ...keeps the client session
# The super-admin account cannot use the client sign-in, and a client cannot enter the super-admin space.
login(client(), root_email, root_pw, ok=False)
admin_login(client(), both_email, both_pw, ok=False)
assert '/super-admin/connexion' in client().open(f'{BASE}/super-admin', timeout=60).geturl()

print('PASS: separate client and super-admin sessions, view-as (start, org-admin rights, audit, own account protected, exit), own account, user search.')
