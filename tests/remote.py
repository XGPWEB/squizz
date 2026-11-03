"""Remote control from the host's phone: python3 tests/remote.py (npm run dev on :5173)."""
from helpers import BASE, client, call, request, signup
import urllib.request

host, _, _ = signup()
quiz = {'title': 'Télécommande', 'questions': [
    {'text': '1 + 1 ?', 'options': ['1', '2'], 'correct': 1, 'duration': 240},
    {'text': '2 + 2 ?', 'options': ['4', '5'], 'correct': 0, 'duration': 240},
]}
qid = call(host, 'save', quiz=quiz)['quiz']['id']
code = call(host, 'create', quizId=qid)['code']
player = client()
call(player, 'join', code=code, name='Ana')
call(player, 'remote', expect=403, code=code)
token = call(host, 'remote', code=code)['token']
assert call(host, 'remote', code=code)['token'] == token, 'same link every time'

phone = client()  # the host's phone: not signed in
remote = lambda action, expect=200, **data: call(phone, action, expect=expect, code=code, remote=token, **data)
state = remote('state')
assert state['host'] and state['phase'] == 'lobby' and state['players'][0]['name'] == 'Ana'
call(phone, 'state', expect=403, code=code, remote='0' * 32)
call(phone, 'start', expect=403, code=code, remote='nope')
remote('teams', expect=403, count=2)
remote('remote', expect=403)
# Never through an URL: GET with the secret is refused.
req = urllib.request.Request(f'{BASE}/api/game?action=state&code={code}&remote={token}')
try:
    phone.open(req); raise AssertionError('GET accepted')
except urllib.error.HTTPError as e:
    assert e.code == 403, e.code

remote('start')
state = remote('state')
assert state['phase'] == 'question' and not state['revealed']
remote('close', question=0)
state = remote('state')
assert state['revealed'] and state['remaining'] == 0, state
call(player, 'answer', expect=400, code=code, question=0, choice=1)
remote('close', question=0)  # pressed twice: nothing more happens
remote('next', question=0)
assert remote('state')['index'] == 1
remote('kick', expect=404, name='Personne')
remote('kick', name='Ana')
call(player, 'state', expect=403, code=code)
print('remote: ok')
