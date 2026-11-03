"""Wheel of fortune, end to end: python3 tests/wheel.py (npm run dev on :5173)."""
import time
from helpers import client, call, signup

host, _, _ = signup()
quiz = {'title': 'Roue', 'questions': [
    {'type': 'wheel', 'text': 'Qui commence ?', 'options': []},
    {'type': 'wheel', 'text': 'Un gage', 'options': ['Chanter', 'Danser', 'Mimer']},
    {'type': 'quiz', 'text': 'Fin ?', 'options': ['Oui', 'Non'], 'correct': 0},
]}
qid = call(host, 'save', quiz=quiz)['quiz']['id']
code = call(host, 'create', quizId=qid)['code']
ana, zoe = client(), client()
call(zoe, 'join', code=code, name='Zoé')
call(ana, 'join', code=code, name='Ana')
call(host, 'start', code=code)

state = call(ana, 'state', code=code)
assert state['wheel'] == {'entries': ['Ana', 'Zoé'], 'spin': None}, state['wheel']
assert state['revealed'], 'nothing to answer: the host can move on at once'
call(ana, 'spin', expect=403, code=code, question=0, after=None)
call(ana, 'answer', expect=400, code=code, question=0, answer={'choices': [0]})
call(host, 'spin', code=code, question=0, after=None)
spin = call(ana, 'state', code=code)['wheel']['spin']
assert spin['entries'] == ['Ana', 'Zoé'] and spin['winner'] in (0, 1) and spin['elapsed'] >= 0, spin
# The same click sent again (lost response): nothing changes.
call(host, 'spin', code=code, question=0, after=None)
assert call(zoe, 'state', code=code)['wheel']['spin']['id'] == spin['id']
# A new spin while the wheel is still turning is ignored too.
call(host, 'spin', code=code, question=0, after=spin['id'])
assert call(zoe, 'state', code=code)['wheel']['spin']['id'] == spin['id']
time.sleep(5.4)
call(host, 'spin', code=code, question=0, after=spin['id'])
again = call(zoe, 'state', code=code)['wheel']['spin']
assert again['id'] != spin['id'], 'spun again once stopped'

call(host, 'next', code=code, question=0)
wheel = call(ana, 'state', code=code)['wheel']
assert wheel == {'entries': ['Chanter', 'Danser', 'Mimer'], 'spin': None}, wheel
call(host, 'spin', code=code, question=1, after=None)
assert call(ana, 'state', code=code)['wheel']['spin']['entries'] == ['Chanter', 'Danser', 'Mimer']
call(host, 'next', code=code, question=1)
state = call(ana, 'state', code=code)
assert state['wheel'] is None and state['total'] == 3
call(host, 'spin', expect=400, code=code, question=2, after=None)
print('wheel: ok')
