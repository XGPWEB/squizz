"""Live-game guarantees: python3 tests/game-live.py (dev server on :5173)."""
import threading, time
import secrets
from helpers import client, call, request, signup, set_plan

org = f'Org direct {secrets.token_hex(3)}'
host, _, _ = signup(org)
set_plan(org, 'PRO')
quiz = {'title': 'Direct', 'questions': [{'text': 'Q1 ?', 'options': ['a', 'b'], 'correct': 0},
                                         {'text': 'Q2 ?', 'options': ['a', 'b'], 'correct': 1}]}
qid = call(host, 'save', quiz=quiz)['quiz']['id']
code = call(host, 'create', quizId=qid)['code']

# --- Simultaneous arrivals never exceed the plan's cap (Pro: 50) ---
players = [client() for _ in range(60)]
def join(i):
    request(players[i], 'POST', '/api/game', {'action': 'join', 'code': code, 'name': f'J{i}'}, expect=None)
threads = [threading.Thread(target=join, args=(i,)) for i in range(60)]
[t.start() for t in threads]; [t.join() for t in threads]
lobby = call(host, 'state', code=code)
assert len(lobby['players']) == 50, len(lobby['players'])

# --- The host removes a player; they cannot come back or play ---
inside = [p for p in players if request(p, 'POST', '/api/game', {'action': 'state', 'code': code}, expect=None).get('code')]
victim, keeper = inside[0], inside[1]
victim_name = next(p['name'] for p in call(victim, 'state', code=code)['players'] if p['me'])
call(keeper, 'kick', expect=403, code=code, name=victim_name)             # only the host
call(host, 'kick', code=code, name=victim_name)
call(victim, 'state', expect=403, code=code)
call(victim, 'join', expect=403, code=code, name='Revenant')
assert len(call(host, 'state', code=code)['players']) == 49

# --- "Ready?" countdown: question hidden and answers refused until it opens ---
out = request(host, 'POST', '/api/game', {'action': 'start', 'code': code})
assert out['startsIn'] >= 1500
early = call(keeper, 'state', code=code)
assert early['question'] is None and early['startsIn'] > 0
call(keeper, 'answer', expect=400, code=code, question=0, choice=0)
time.sleep(out['startsIn'] / 1000 + 0.2)
opened = call(keeper, 'state', code=code)
assert opened['question']['text'] == 'Q1 ?' and opened['startsIn'] == 0
assert opened['remaining'] <= opened['duration'] * 1000

# --- A change is visible immediately despite the shared snapshot ---
before = call(host, 'state', code=code)['answered']
call(keeper, 'answer', code=code, question=0, choice=0)
assert call(host, 'state', code=code)['answered'] == before + 1
print('PASS: join cap under concurrency, host kick (no return), ready countdown, snapshot invalidation.')
