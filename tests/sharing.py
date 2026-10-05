"""Qui voit un quiz dans l'équipe : brouillon privé, personnes choisies, toute l'équipe. python3 tests/sharing.py
(needs the seeded super-admin in .env)."""
import secrets
from helpers import call, invite, set_plan, signup, sql

tag = secrets.token_hex(3)
admin, _, _ = signup(f'Org partage {tag}')
set_plan(f'Org partage {tag}', 'PRO')
ana, ana_email, _ = invite(admin, 'HOST', 'Ana')
bob, bob_email, _ = invite(admin, 'HOST', 'Bob')
cy, _, _ = invite(admin, 'HOST', 'Cy')
uid = lambda email: sql(f"SELECT id FROM \"User\" WHERE email = '{email}'").strip()
bob_id = uid(bob_email)

questions = [{'text': 'Deux plus deux ?', 'options': ['3', '4'], 'correct': 1}]
sees = lambda c, quiz_id: any(q['id'] == quiz_id for q in call(c, 'list')['quizzes'])

# Nothing said about sharing: the whole team sees the quiz, as before.
team = call(ana, 'save', quiz={'title': 'Pour tous', 'questions': questions})['quiz']
assert team['visibility'] == 'TEAM' and team['canManage'] and sees(bob, team['id']) and sees(admin, team['id'])

# A private draft: only its author sees it, opens it, launches it — not even an administrator.
draft = call(ana, 'save', quiz={'title': 'Brouillon', 'questions': questions, 'visibility': 'PRIVATE'})['quiz']
assert draft['visibility'] == 'PRIVATE' and sees(ana, draft['id'])
for other in (bob, cy, admin):
    assert not sees(other, draft['id'])
    call(other, 'create', expect=404, quizId=draft['id'])
    call(other, 'export', expect=404, quizId=draft['id'])
    call(other, 'duplicate', expect=404, quizId=draft['id'])
    call(other, 'update', expect=404, quizId=draft['id'], quiz={'title': 'Pris', 'questions': questions})
    call(other, 'delete', expect=404, quizId=draft['id'])
call(ana, 'create', quizId=draft['id'])

# Shared with chosen people: they see it, edit it and launch it; the others do not, administrators included.
call(ana, 'update', expect=400, quizId=draft['id'], version=draft['version'],
     quiz={'title': 'Brouillon', 'questions': questions, 'visibility': 'SELECTED', 'sharedWith': []})
call(ana, 'update', expect=400, quizId=draft['id'], version=draft['version'],
     quiz={'title': 'Brouillon', 'questions': questions, 'visibility': 'SELECTED', 'sharedWith': ['pas-un-membre']})
shared = call(ana, 'update', quizId=draft['id'], version=draft['version'],
              quiz={'title': 'À deux', 'questions': questions, 'visibility': 'SELECTED', 'sharedWith': [bob_id, 'pas-un-membre']})['quiz']
assert shared['visibility'] == 'SELECTED' and shared['sharedWith'] == [bob_id]
assert sees(bob, shared['id']) and not sees(cy, shared['id']) and not sees(admin, shared['id'])
mine = next(q for q in call(bob, 'list')['quizzes'] if q['id'] == shared['id'])
assert mine['canEdit'] and not mine['canManage']
# A collaborator edits the content, but neither the sharing nor the existence of the quiz.
edited = call(bob, 'update', quizId=shared['id'], version=shared['version'],
              quiz={'title': 'À deux, revu', 'questions': questions, 'visibility': 'TEAM'})['quiz']
assert edited['title'] == 'À deux, revu' and edited['visibility'] == 'SELECTED' and edited['sharedWith'] == [bob_id]
call(bob, 'delete', expect=403, quizId=shared['id'])
call(bob, 'create', quizId=shared['id'])
call(cy, 'update', expect=404, quizId=shared['id'], quiz={'title': 'Pris', 'questions': questions})
# The copy made by a collaborator is their own private draft, not a quiz the whole team sees.
copy = call(bob, 'duplicate', quizId=shared['id'])['quiz']
assert copy['visibility'] == 'PRIVATE' and copy['mine'] and not sees(ana, copy['id'])

# Opened to the whole team: everyone sees it; administrators edit and delete it, other hosts only play it.
opened = call(ana, 'update', quizId=shared['id'], version=edited['version'],
              quiz={'title': 'Pour tous aussi', 'questions': questions, 'visibility': 'TEAM'})['quiz']
assert opened['visibility'] == 'TEAM' and opened['sharedWith'] == []
assert sees(cy, opened['id']) and sees(admin, opened['id'])
call(cy, 'update', expect=403, quizId=opened['id'], quiz={'title': 'Pris', 'questions': questions})
call(cy, 'delete', expect=403, quizId=opened['id'])
call(admin, 'update', quizId=opened['id'], quiz={'title': 'Revu par l’admin', 'questions': questions, 'visibility': 'PRIVATE'})
assert next(q for q in call(ana, 'list')['quizzes'] if q['id'] == opened['id'])['visibility'] == 'TEAM'

# A private draft whose author's account is deactivated goes to the administrators, never to other hosts.
lost = call(ana, 'save', quiz={'title': 'Orphelin', 'questions': questions, 'visibility': 'PRIVATE'})['quiz']
assert not sees(admin, lost['id'])
sql(f"UPDATE \"User\" SET active = false WHERE email = '{ana_email}'")
assert sees(admin, lost['id']) and not sees(cy, lost['id'])
assert next(q for q in call(admin, 'list')['quizzes'] if q['id'] == lost['id'])['canManage']
call(admin, 'delete', quizId=lost['id'])
print('PASS: private drafts, quizzes shared with chosen members, team quizzes, orphaned drafts.')
