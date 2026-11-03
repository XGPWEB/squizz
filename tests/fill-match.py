"""Fill in the blanks and matching, played end to end: python3 tests/fill-match.py (npm run dev on :5173)."""
import json
from helpers import client, call, signup

host, _, _ = signup()
quiz = {'title': 'Trous et paires', 'questions': [
    {'type': 'fill', 'text': 'Complétez', 'options': [],
     'body': 'La capitale de la France est [Paris] et celle de l’Italie est [Rome|Roma].'},
    {'type': 'match', 'text': 'Reliez', 'options': ['Italie', 'Japon', 'Pérou', 'Kenya'],
     'targets': ['Rome', 'Tokyo', 'Lima', 'Nairobi'], 'order': [0, 1, 2, 3]},
]}
qid = call(host, 'save', quiz=quiz)['quiz']['id']
code = call(host, 'create', quizId=qid)['code']
good, bad = client(), client()
call(good, 'join', code=code, name='Bonne')
call(bad, 'join', code=code, name='Mauvaise')
call(host, 'start', code=code)

# Fill in the blanks: the words to find never reach the phones before the reveal.
q = call(good, 'state', code=code)['question']
assert 'Paris' not in json.dumps(q) and 'Rome' not in json.dumps(q), q
assert q['fillParts'][0] == 'La capitale de la France est ', q
call(good, 'answer', code=code, question=0, answer={'blanks': ['paris', 'ROMA']})
call(bad, 'answer', code=code, question=0, answer={'blanks': ['Lyon', 'Rome']})
state = call(good, 'state', code=code)
assert state['revealed'] and state['personal']['outcome'] == 'correct', state['personal']
assert call(bad, 'state', code=code)['personal']['outcome'] == 'incorrect'
assert state['aggregate']['counts'] == [{'label': 'Paris', 'count': 1}, {'label': 'Rome', 'count': 2}]
call(host, 'next', code=code, question=0)

# Matching: targets are shuffled by the server and the solution stays hidden.
q = call(good, 'state', code=code)['question']
assert 'order' not in q and sorted(q['targets']) == sorted(['Rome', 'Tokyo', 'Lima', 'Nairobi'])
right = {'Italie': 'Rome', 'Japon': 'Tokyo', 'Pérou': 'Lima', 'Kenya': 'Nairobi'}
answer = [q['targets'].index(right[o]) for o in q['options']]
call(good, 'answer', code=code, question=1, answer={'matches': answer})
call(bad, 'answer', code=code, question=1, answer={'matches': answer[1:] + answer[:1]})
call(bad, 'answer', code=code, question=1, answer={'matches': [0, 0, 1, 2]})  # already answered: ignored
state = call(good, 'state', code=code)
assert state['personal']['outcome'] == 'correct' and state['question']['order'] == answer, state['question']
call(host, 'next', code=code, question=1)
final = call(good, 'state', code=code)
assert final['phase'] == 'finished' and final['players'][0]['name'] == 'Bonne'
print('fill-match: ok')
