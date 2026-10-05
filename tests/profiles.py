"""Quiz à profils, de l'enregistrement à la répartition finale. Run against a local SQuizz: python3 tests/profiles.py."""
import time
from helpers import client, call, signup

host, _, _ = signup()
poll = lambda text: {'type': 'poll', 'text': text, 'duration': 5, 'options': ['Je tranche', 'Je réunis', 'Je délègue'],
                     'profiles': ['Directif', ' Participatif ', 'Délégatif']}
scored = {'type': 'quiz', 'text': 'Deux plus deux ?', 'options': ['3', '4'], 'correctAnswers': [1]}

# A profile quiz has no scored question, at least two profiles, and names of 40 characters at most.
refused = call(host, 'save', expect=400, quiz={'title': 'Mixte', 'questions': [poll('Un conflit ?'), scored]})
assert 'Étape 2' in refused['error'], refused
one = {**poll('Seul ?'), 'profiles': ['Directif', '', '']}
assert 'deux profils' in call(host, 'save', expect=400, quiz={'title': 'Un seul', 'questions': [one]})['error']
long = {**poll('Long ?'), 'profiles': ['x' * 41, 'Autre', '']}
assert '40' in call(host, 'save', expect=400, quiz={'title': 'Trop long', 'questions': [long]})['error']

quiz = call(host, 'save', quiz={'title': 'Quel manager êtes-vous ?', 'questions': [poll('Un conflit ?'), poll('Une décision ?')]})['quiz']
assert quiz['tag'] == 'QUIZ À PROFILS', quiz['tag']
assert quiz['questions'][0]['profiles'] == ['Directif', 'Participatif', 'Délégatif']
# The profiles travel with the quiz: an exported file keeps them (the free plan allows one quiz, so no copy here).
exported = call(host, 'export', quizId=quiz['id'])['file']
assert exported['questions'][0]['profiles'] == ['Directif', 'Participatif', 'Délégatif']

code = call(host, 'create', quizId=quiz['id'])['code']
ana, bob, cy, dee = client(), client(), client(), client()
for c, name in ((ana, 'Ana'), (bob, 'Bob'), (cy, 'Cy'), (dee, 'Dee')):
    call(c, 'join', code=code, name=name)
call(host, 'start', code=code)
plan = {ana: [0, 0], bob: [1, 1], cy: [0, 2]}  # Dee never answers
for index in range(2):
    state = call(ana, 'state', code=code)
    # Which profile an answer points to never reaches a phone, and nothing is revealed before the end.
    assert state['profileQuiz'] and 'profiles' not in state['question'], state
    assert state['profiles'] is None and state['myProfile'] is None
    for c, choices in plan.items():
        call(c, 'answer', code=code, question=index, answer={'choices': [choices[index]]})
    call(dee, 'answer', expect=400, code=code, question=index, answer={'choices': [7]})
    while not call(host, 'state', code=code)['revealed']:
        time.sleep(0.3)
    after = call(ana, 'state', code=code)
    assert after['personal']['outcome'] == 'opinion' and after['personal']['points'] == 0
    assert 'profiles' not in after['question']
    call(host, 'next', code=code, question=index)

final = call(ana, 'state', code=code)
assert final['phase'] == 'finished'
# Ana: Directif twice. Bob: Participatif twice. Cy: Directif and Délégatif, tied. Dee: no profile.
assert final['profiles'] == {
    'shares': [
        {'name': 'Directif', 'people': 2, 'percent': 67},
        {'name': 'Participatif', 'people': 1, 'percent': 33},
        {'name': 'Délégatif', 'people': 1, 'percent': 33},
    ],
    'profiled': 3,
    'tied': 1,
}, final['profiles']
assert final['myProfile']['names'] == ['Directif']
assert call(cy, 'state', code=code)['myProfile']['names'] == ['Directif', 'Délégatif']
assert call(dee, 'state', code=code)['myProfile'] is None
# The host sees the group, never one person's profile; nobody scored a point.
host_view = call(host, 'state', code=code)
assert host_view['myProfile'] is None and host_view['profiles'] == final['profiles']
assert all(p['score'] == 0 for p in host_view['players'])

print('Quiz à profils OK')
