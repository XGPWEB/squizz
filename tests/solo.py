"""Self-paced links and replays: python3 tests/solo.py (npm run dev on :5173)."""
import re, time
from helpers import BASE, client, call, request, signup, sql

def solo(c, action, expect=200, **data):
    return request(c, 'POST', '/api/solo', dict(action=action, **data), expect)

host, _, _ = signup()
quiz = {'title': 'À mon rythme', 'questions': [
    {'text': '1 + 1 ?', 'options': ['1', '2'], 'correct': 1, 'duration': 30},
    {'type': 'slide', 'text': 'Une pause', 'options': []},
    {'type': 'wheel', 'text': 'Qui ?', 'options': []},
    {'type': 'poll', 'text': 'Votre avis ?', 'options': ['Bien', 'Bof'], 'points': 'none', 'duration': 5},
]}
qid = call(host, 'save', quiz=quiz)['quiz']['id']
call(host, 'solo', expect=400, quizId=qid, days=3)
sid = call(host, 'solo', quizId=qid, days=7)['id']

ana, bob = client(), client()
state = solo(ana, 'state', id=sid)
assert state['phase'] == 'join' and state['total'] == 3, state  # the wheel needs a host: left out
solo(ana, 'join', id=sid, name='Ana')
solo(bob, 'join', expect=400, id=sid, name='Ana')
solo(bob, 'join', id=sid, name='Bob')

s = solo(ana, 'state', id=sid)
assert s['phase'] == 'question' and s['index'] == 0 and 'correct' not in s['question']
solo(ana, 'next', expect=400, id=sid, question=0)  # answer first
s = solo(ana, 'answer', id=sid, question=0, answer={'choices': [1]})
assert s['revealed'] and s['myAnswer']['outcome'] == 'correct' and s['score'] > 900, s
solo(ana, 'answer', id=sid, question=0, answer={'choices': [0]})  # sent again: the first one counts
assert solo(ana, 'state', id=sid)['myAnswer']['outcome'] == 'correct'
s = solo(ana, 'next', id=sid, question=0)
assert s['index'] == 1 and s['question']['type'] == 'slide' and s['revealed']
s = solo(ana, 'next', id=sid, question=1)
assert s['index'] == 2 and s['question']['type'] == 'poll'
time.sleep(7.5)  # 5 s + 2 s of grace: too late
solo(ana, 'answer', expect=400, id=sid, question=2, answer={'choices': [0]})
s = solo(ana, 'state', id=sid)
assert s['timedOut'] and s['revealed']
s = solo(ana, 'next', id=sid, question=2)
assert s['phase'] == 'finished' and s['rank'] == 1 and s['players'] == 1 and s['correct'] == 1, s

# Bob plays at his own pace, later; his rank counts the ones who finished.
solo(bob, 'answer', id=sid, question=0, answer={'choices': [0]})
solo(bob, 'next', id=sid, question=0)
solo(bob, 'next', id=sid, question=1)
solo(bob, 'answer', id=sid, question=2, answer={'choices': [1]})
s = solo(bob, 'next', id=sid, question=2)
assert s['phase'] == 'finished' and s['rank'] == 2 and s['players'] == 2

html = host.open(f'{BASE}/app/resultats').read().decode()
assert f'/app/resultats/solo-{sid}' in html and 'En autonomie' in html and 'Liens en autonomie' in html
page = host.open(f'{BASE}/app/resultats/solo-{sid}').read().decode()
assert 'Ana' in page and 'Bob' in page and 'en autonomie' in page

# Closed: nobody new can play it; another organisation cannot close it.
unfinished = client()
solo(unfinished, 'join', id=sid, name='En cours')
stranger, _, _ = signup()
call(stranger, 'solo-close', expect=404, id=sid)
call(host, 'solo-close', id=sid)
solo(client(), 'join', expect=400, id=sid, name='Chloé')
solo(unfinished, 'answer', expect=400, id=sid, question=0, answer={'choices': [1]})
solo(unfinished, 'next', expect=400, id=sid, question=0)
closed = solo(unfinished, 'state', id=sid)
assert closed['phase'] == 'join' and not closed['open'], closed
assert solo(ana, 'state', id=sid)['phase'] == 'finished'  # completed results remain readable

# Expiration also stops a participant who already entered.
expired = call(host, 'solo', quizId=qid, days=1)['id']
late = client()
solo(late, 'join', id=expired, name='En retard')
sql(f'''UPDATE "SoloSession" SET "expiresAt" = (now() AT TIME ZONE 'UTC') - interval '1 second' WHERE id = '{expired}' ''')
solo(late, 'answer', expect=400, id=expired, question=0, answer={'choices': [1]})
solo(late, 'next', expect=400, id=expired, question=0)
assert not solo(late, 'state', id=expired)['open']

# A self-paced blind test plays the extract without revealing the answer or its caption.
music, _, _ = signup()
blind = call(music, 'save', quiz={'title': 'Blind test autonome', 'questions': [
    {'type': 'blindtest', 'text': 'Quel titre ?', 'accepted': ['La Bohème'], 'duration': 30,
     'media': [{'kind': 'audio', 'url': 'https://example.test/extrait.mp3', 'caption': 'La Bohème'}]}
]})['quiz']['id']
blind_id = call(music, 'solo', quizId=blind, days=1)['id']
listener = client()
s = solo(listener, 'join', id=blind_id, name='Mélomane')
assert len(s['question']['media']) == 1 and s['question']['media'][0]['kind'] == 'audio', s
assert not s['question']['media'][0]['caption'] and 'accepted' not in s['question'], s
s = solo(listener, 'answer', id=blind_id, question=0, answer={'text': 'La Bohème'})
assert s['revealed'] and s['question']['media'][0]['caption'] == 'La Bohème', s

# Replay after a live game: opened by the host, shown on the players' phones.
code = call(host, 'create', quizId=qid)['code']
p = client()
call(p, 'join', code=code, name='Zoé')
call(host, 'replay', expect=400, code=code)
call(host, 'start', code=code)
call(p, 'answer', code=code, question=0, choice=1)
call(host, 'next', code=code, question=0)
call(host, 'next', code=code, question=1)
call(host, 'next', code=code, question=2)
time.sleep(5.5)
call(host, 'next', code=code, question=3)
call(p, 'replay', expect=403, code=code)
rid = call(host, 'replay', code=code)['id']
assert call(host, 'replay', code=code)['id'] == rid, 'one replay per game'
assert call(p, 'state', code=code)['replay'] == rid
assert solo(p, 'state', id=rid)['phase'] == 'join'
print('solo: ok')
