"""Questions from the audience: python3 tests/qa.py (npm run dev on :5173)."""
import re
from helpers import BASE, client, call, signup

host, _, _ = signup()
quiz = {'title': 'Conférence', 'questions': [{'text': '1 + 1 ?', 'options': ['1', '2'], 'correct': 1, 'duration': 240}]}
qid = call(host, 'save', quiz=quiz)['quiz']['id']
code = call(host, 'create', quizId=qid)['code']
ana, bob = client(), client()
call(ana, 'join', code=code, name='Ana')
call(bob, 'join', code=code, name='Bob')

assert call(ana, 'state', code=code)['qa'] is None, 'no wall until the host opens it'
call(ana, 'qa-ask', expect=400, code=code, text='Trop tôt ?')
call(ana, 'qa-settings', expect=403, code=code, open=True, moderated=False)
call(host, 'qa-settings', code=code, open=True, moderated=True)

call(ana, 'qa-ask', code=code, text='  Aura-t-on   le support ? ', anonymous=False)
call(ana, 'qa-ask', code=code, text='Aura-t-on le support ?')  # sent twice: kept once
call(bob, 'qa-ask', code=code, text='Question gênante', anonymous=True)
call(bob, 'qa-ask', expect=400, code=code, text='x' * 281)
host_wall = call(host, 'state', code=code)['qa']
assert host_wall['moderated'] and [q['status'] for q in host_wall['questions']] == ['pending', 'pending']
ana_q, bob_q = sorted(host_wall['questions'], key=lambda q: q['text'])
assert ana_q['author'] == 'Ana' and ana_q['text'] == 'Aura-t-on le support ?' and bob_q['author'] is None
# Pending questions are seen by their author only.
assert [q['text'] for q in call(ana, 'state', code=code)['qa']['questions']] == ['Aura-t-on le support ?']
call(bob, 'qa-vote', expect=404, code=code, id=ana_q['id'])  # not approved yet

call(host, 'qa-moderate', code=code, id=ana_q['id'], status='visible')
call(host, 'qa-moderate', code=code, id=bob_q['id'], status='hidden')
call(host, 'qa-moderate', expect=400, code=code, id=ana_q['id'], status='pending')
call(ana, 'qa-moderate', expect=403, code=code, id=bob_q['id'], status='visible')
bob_view = call(bob, 'state', code=code)['qa']['questions']
assert [(q['text'], q['status']) for q in bob_view] == [('Aura-t-on le support ?', 'visible'), ('Question gênante', 'hidden')], bob_view
call(ana, 'qa-vote', expect=400, code=code, id=ana_q['id'])  # own question
call(bob, 'qa-vote', code=code, id=ana_q['id'])
call(bob, 'qa-vote', code=code, id=ana_q['id'])  # twice: one vote
assert call(ana, 'state', code=code)['qa']['questions'][0]['votes'] == 1
assert 'Question gênante' not in str(call(ana, 'state', code=code)['qa'])

# The remote control moderates too.
token = call(host, 'remote', code=code)['token']
phone = client()
call(phone, 'qa-moderate', code=code, remote=token, id=ana_q['id'], status='answered')
call(phone, 'qa-ask', expect=403, code=code, remote=token, text='Depuis la télécommande')
assert call(ana, 'state', code=code)['qa']['questions'][0]['status'] == 'answered'

# Kept with the results, without names; hidden ones are not.
call(host, 'start', code=code)
call(ana, 'answer', code=code, question=0, choice=1)
call(bob, 'answer', code=code, question=0, choice=1)
call(host, 'next', code=code, question=0)
html = host.open(f'{BASE}/app/resultats').read().decode()
rid = re.findall(r'/app/resultats/(\d{6}-\d+)', html)[0]
page = host.open(f'{BASE}/app/resultats/{rid}').read().decode()
assert 'Aura-t-on le support ?' in page and 'Question gênante' not in page
print('qa: ok')
