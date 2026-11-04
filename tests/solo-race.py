"""Self-paced links under simultaneous requests: python3 tests/solo-race.py (through scripts/e2e.sh only).

1. Arrivals at the same instant never take more places than the link has; a player already in comes back.
2. Players finishing at the same instant all end up in the single report of the link.
"""
import threading
from helpers import call, client, request, signup, sql


def solo(c, action, expect=200, **data):
    return request(c, 'POST', '/api/solo', dict(action=action, **data), expect)


def at_once(tasks):
    """Runs every task in its own thread, released together; returns their results (or exceptions)."""
    start = threading.Barrier(len(tasks))
    out = [None] * len(tasks)

    def run(i, task):
        start.wait()
        try:
            out[i] = task()
        except Exception as e:  # noqa: BLE001 — the test counts them
            out[i] = e

    threads = [threading.Thread(target=run, args=(i, t)) for i, t in enumerate(tasks)]
    for t in threads: t.start()
    for t in threads: t.join()
    return out


host, _, _ = signup()
qid = call(host, 'save', quiz={'title': 'Course', 'questions': [
    {'text': '1 + 1 ?', 'options': ['1', '2'], 'correct': 1, 'duration': 60},
]})['quiz']['id']


def new_link(places):
    sid = call(host, 'solo', quizId=qid, days=1)['id']
    sql(f'''UPDATE "SoloSession" SET "maxPlayers" = {places} WHERE id = '{sid}' ''')
    return sid


# 1. Twelve arrivals at once for three places: exactly three are in.
for round_ in range(3):
    sid = new_link(3)
    players = [client() for _ in range(12)]
    results = at_once([lambda c=c, i=i: solo(c, 'join', expect=None, id=sid, name=f'Joueur {i}')
                       for i, c in enumerate(players)])
    admitted = [c for c, r in zip(players, results) if isinstance(r, dict) and r.get('phase') == 'question']
    refused = [r for r in results if isinstance(r, dict) and 'maximal' in r.get('error', '')]
    rows = int(sql(f'''SELECT count(*) FROM "SoloRun" WHERE "sessionId" = '{sid}' '''))
    assert rows == 3 and len(admitted) == 3 and len(refused) == 9, (round_, rows, results)
    # Full, yet a player already in comes back (even twice at once), and a newcomer stays out.
    again = at_once([lambda: solo(admitted[0], 'join', expect=None, id=sid, name='Autre pseudo')] * 2)
    assert all(r.get('phase') == 'question' for r in again), again
    solo(client(), 'join', expect=400, id=sid, name='Retardataire')
    assert int(sql(f'''SELECT count(*) FROM "SoloRun" WHERE "sessionId" = '{sid}' ''')) == 3

# The same player sending their first join twice at once is in once, without an error.
sid = new_link(5)
twin = client()
solo(twin, 'state', id=sid)  # the page is loaded first: the player has their identity cookie
twice = at_once([lambda: solo(twin, 'join', expect=None, id=sid, name='Double clic')] * 2)
assert all(r.get('phase') == 'question' for r in twice), twice
assert int(sql(f'''SELECT count(*) FROM "SoloRun" WHERE "sessionId" = '{sid}' ''')) == 1

# 2. Twenty players finish at the same instant: the report has all twenty, every time.
for round_ in range(3):
    sid = new_link(40)
    players = [client() for _ in range(20)]
    for i, c in enumerate(players):
        solo(c, 'join', id=sid, name=f'Fin {i}')
        solo(c, 'answer', id=sid, question=0, answer={'choices': [i % 2]})
    results = at_once([lambda c=c: solo(c, 'next', expect=None, id=sid, question=0) for c in players])
    assert all(isinstance(r, dict) and r.get('phase') == 'finished' for r in results), results
    report = sql(f'''SELECT players, jsonb_array_length(data->'players') FROM "GameReport" WHERE id = 'solo-{sid}' ''')
    assert report == '20|20', (round_, report)

# The guard itself, deterministically: a rebuild from fewer players than the stored report (a late write
# that read before others finished) never replaces it; a rebuild from more players always does.
def finish(name):
    c = client()
    solo(c, 'join', id=sid, name=name)
    solo(c, 'answer', id=sid, question=0, answer={'choices': [1]})
    assert solo(c, 'next', id=sid, question=0)['phase'] == 'finished'

report = lambda: sql(f'''SELECT players, jsonb_array_length(data->'players') FROM "GameReport" WHERE id = 'solo-{sid}' ''')
sql(f'''UPDATE "GameReport" SET players = 99 WHERE id = 'solo-{sid}' ''')
finish('Tardif')  # 21 players read: fewer than the 99 stored
assert report() == '99|20', report()
sql(f'''UPDATE "GameReport" SET players = 0 WHERE id = 'solo-{sid}' ''')
finish('Dernier')  # 22 players read: more than stored
assert report() == '22|22', report()

print('solo-race: ok')
