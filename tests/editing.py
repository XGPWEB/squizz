"""Edit conflicts, safe retries, duplication: python3 tests/editing.py (dev server on :5173, seeded super-admin)."""
import secrets
from helpers import client, call, request, signup, invite, set_plan

tag = secrets.token_hex(3)
q = lambda title, text='Q ?': {'title': title, 'questions': [{'text': text, 'options': ['a', 'b'], 'correct': 0}]}

org = f'Org edition {tag}'
alice, _, _ = signup(org)
set_plan(org, 'PRO')
bob, _, _ = invite(alice, 'ORG_ADMIN', 'Bob')
hugo, _, _ = invite(alice, 'HOST', 'Hugo')

# --- Edit conflicts: the version sent is checked atomically by the server ----------------------------
quiz = call(alice, 'save', quiz=q('Quiz partagé'))['quiz']
qid, v0 = quiz['id'], quiz['version']
assert v0 == 0 and quiz['mine'] is True
v1 = call(bob, 'update', quizId=qid, quiz=q('Version de Bob'), version=v0)['quiz']['version']
assert v1 == v0 + 1
out = call(alice, 'update', expect=409, quizId=qid, quiz=q('Version d’Alice'), version=v0)
assert out['conflict']['updatedBy'] == 'Bob' and out['conflict']['title'] == 'Version de Bob', out
assert out['conflict']['version'] == v1
# Nothing was overwritten.
assert next(x for x in call(alice, 'list')['quizzes'] if x['id'] == qid)['title'] == 'Version de Bob'
# A retry of a save that already went through (same content, same base version) is not a conflict.
call(bob, 'update', quizId=qid, quiz=q('Version de Bob'), version=v0)
# Choosing to overwrite, after the conflict.
v2 = call(alice, 'update', quizId=qid, quiz=q('Version d’Alice'), version=v0, force=True)['quiz']['version']
assert v2 == v1 + 1

# --- Creating twice with the same key (response lost, then retried) gives one quiz --------------------
key = 'cle-' + secrets.token_hex(8)
first = call(alice, 'save', quiz=q('Une seule fois'), clientKey=key)['quiz']['id']
again = call(alice, 'save', quiz=q('Une seule fois'), clientKey=key)['quiz']['id']
assert first == again
assert sum(1 for x in call(alice, 'list')['quizzes'] if x['title'] == 'Une seule fois') == 1

# --- Duplication: org quizzes and SQuizz Originals, owned by the person who copies --------------------
copy = call(hugo, 'duplicate', quizId=qid)['quiz']
assert copy['title'] == 'Version d’Alice (copie)' and copy['mine'] and copy['canEdit'] and copy['id'] != qid
original = call(hugo, 'duplicate', quizId='geo')['quiz']
assert original['canEdit'] and original['title'].endswith('(copie)') and len(original['questions']) > 1
call(hugo, 'update', quizId=original['id'], quiz=q('Mon géo à moi'), version=original['version'])
# The retried duplicate does not copy twice.
k = 'dup-' + secrets.token_hex(8)
assert call(hugo, 'duplicate', quizId='geo', clientKey=k)['quiz']['id'] == call(hugo, 'duplicate', quizId='geo', clientKey=k)['quiz']['id']

# Another organisation can neither see nor copy these quizzes.
outsider, _, _ = signup()
call(outsider, 'duplicate', expect=404, quizId=qid)
# The copy respects the quota (free plan: 1 quiz).
call(outsider, 'save', quiz=q('Seul quiz gratuit'))
call(outsider, 'duplicate', expect=403, quizId='geo')

# --- Game actions sent twice (retry after a lost response) never apply twice --------------------------
k = 'jeu-' + secrets.token_hex(8)
code = call(alice, 'create', quizId='geo', clientKey=k)['code']
assert call(alice, 'create', quizId='geo', clientKey=k)['code'] == code
player = client()
call(player, 'join', code=code, name='Joueur')
call(alice, 'start', code=code)
call(alice, 'start', code=code)  # second start: already running, not an error
state = call(player, 'state', code=code)
call(player, 'answer', code=code, question=0, answer={'choices': [0]})
call(player, 'answer', code=code, question=0, answer={'choices': [1]})  # the first answer stays
state = call(alice, 'state', code=code)
assert state['answered'] == 1 and state['index'] == 0 and state['revealed'] is True
call(alice, 'next', code=code, question=0)
call(alice, 'next', code=code, question=0)  # the same « next » again: it already moved on
assert call(alice, 'state', code=code)['index'] == 1
print('PASS: edit conflicts (atomic, no overwrite, retry, force), idempotent create/launch/duplicate, '
      'copies of org quizzes and Originals, quota and isolation, start/answer/next sent twice.')
