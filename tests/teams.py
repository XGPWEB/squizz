"""Team mode, end to end: python3 tests/teams.py (npm run dev on :5173)."""
from helpers import client, call, signup

host, _, _ = signup()
quiz = {'title': 'Équipes', 'questions': [
    {'text': '1 + 1 ?', 'options': ['1', '2'], 'correct': 1},
    {'text': '2 + 2 ?', 'options': ['4', '5'], 'correct': 0},
]}
qid = call(host, 'save', quiz=quiz)['quiz']['id']
code = call(host, 'create', quizId=qid)['code']
players = {n: client() for n in ('Ana', 'Bob', 'Chloé', 'Dan')}
for n, c in players.items():
    call(c, 'join', code=code, name=n)

call(players['Ana'], 'teams', expect=403, code=code, count=2)
call(host, 'teams', expect=400, code=code, count=7)
call(host, 'teams', code=code, count=3)
call(players['Ana'], 'team', code=code, team=2)
call(players['Bob'], 'team', expect=400, code=code, team=3)
call(players['Bob'], 'team', code=code, team=2)
state = call(players['Ana'], 'state', code=code)
assert state['teams']['count'] == 3 and state['teams']['mine'] == 2, state['teams']
# Fewer teams: those of a team that disappears choose again.
call(host, 'teams', code=code, count=2)
assert call(players['Ana'], 'state', code=code)['teams']['mine'] is None
call(host, 'shuffle', code=code)
mine = [call(c, 'state', code=code)['teams']['mine'] for c in players.values()]
assert sorted(mine) == [0, 0, 1, 1], mine
call(host, 'teams', code=code, count=0)
assert call(players['Ana'], 'state', code=code)['teams'] is None
call(host, 'teams', code=code, count=2)
call(players['Ana'], 'team', code=code, team=0)
call(players['Bob'], 'team', code=code, team=0)
call(host, 'start', code=code)
call(players['Ana'], 'team', expect=400, code=code, team=1)
teams = {n: call(c, 'state', code=code)['teams']['mine'] for n, c in players.items()}
assert teams['Ana'] == teams['Bob'] == 0 and teams['Chloé'] == teams['Dan'] == 1, teams

for i in range(2):
    for n, c in players.items():
        right = (1, 0)[i]
        call(c, 'answer', code=code, question=i, choice=right if n in ('Ana', 'Chloé', 'Dan') else 1 - right)
    state = call(players['Ana'], 'state', code=code)
    standings = state['teams']['standings']
    assert standings[0]['name'] == 'Les Citrons' and standings[0]['players'] == 2, standings
    if i == 1:
        assert standings[1]['movement'] == 0
    call(host, 'next', code=code, question=i)

# Teams chosen at launch, with their names (a blank one keeps its default).
code = call(host, 'create', quizId=qid, teams=3, teamNames=['  Les   Profs ', '', 'Les Loutres Masquées'])['code']
call(host, 'create', expect=400, quizId=qid, teams=1)
call(players['Ana'], 'join', code=code, name='Ana')
teams = call(players['Ana'], 'state', code=code)['teams']
assert teams['count'] == 3 and teams['names'] == ['Les Profs', 'Les Citrons', 'Les Loutres Masquées'], teams

print('teams: ok')
