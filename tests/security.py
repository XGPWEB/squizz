"""Application security guards: python3 tests/security.py."""
import json, urllib.request, urllib.error
import secrets
from helpers import BASE, client, call, request, signup, login, set_plan

def raw(c, path, body, headers, method='POST'):
    req = urllib.request.Request(BASE + path, data=body, headers=headers, method=method)
    try: return c.open(req, timeout=30).status
    except urllib.error.HTTPError as e: return e.code

org = f'Org securite {secrets.token_hex(3)}'
admin, email, pw = signup(org)
set_plan(org, 'STARTER')  # plusieurs quiz
body = json.dumps({'quiz': {'title': 'x', 'questions': [{'text': 'Q', 'options': ['a', 'b'], 'correct': 0}]}, 'action': 'save'}).encode()
# A page on another site cannot drive the API, even with the victim's cookies.
assert raw(admin, '/api/game', body, {'Content-Type': 'application/json', 'Origin': 'https://evil.example'}) == 403
assert raw(admin, '/api/org', json.dumps({'name': 'Pirate'}).encode(), {'Content-Type': 'application/json', 'Origin': 'https://evil.example'}, 'PATCH') == 403
# An HTML form (text/plain) cannot forge a JSON request.
assert raw(admin, '/api/game', body, {'Content-Type': 'text/plain'}) == 415
assert raw(admin, '/api/account/password', json.dumps({'name': 'x'}).encode(), {'Content-Type': 'text/plain'}, 'PATCH') == 415
# Same-site requests still work.
assert raw(admin, '/api/game', body, {'Content-Type': 'application/json', 'Origin': BASE}) == 200

# Wrong passwords no longer lock the real owner out.
for _ in range(6):
    login(client(), email, 'mauvais-mot-de-passe', ok=False)
login(client(), email, pw)

# Forgot password answers identically whether or not the account exists.
a = request(client(), 'POST', '/api/account/forgot', {'email': email})
b = request(client(), 'POST', '/api/account/forgot', {'email': 'personne-xyz@example.test'})
assert a == b == {'ok': True}

# Puzzle options are never shown in the solution order.
quiz = {'title': 'Puzzle', 'questions': [{'type': 'puzzle', 'text': 'Ordre ?', 'options': ['1', '2'], 'order': [0, 1]}]}
qid = call(admin, 'save', quiz=quiz)['quiz']['id']
for _ in range(8):
    code = call(admin, 'create', quizId=qid)['code']
    call(admin, 'join', code=code, name='Moi'); call(admin, 'start', code=code)
    st = call(admin, 'state', code=code)['question']
    shown = [st['options'][i] for i in st['puzzleOrder']]
    assert shown != ['1', '2'], shown
print('PASS: cross-site and non-JSON requests refused, no lockout by wrong passwords, forgot is uniform, puzzle never shows the solution.')
