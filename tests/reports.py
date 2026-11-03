"""Results kept after a game: python3 tests/reports.py (against npm run dev on :5173)."""
import io, os, re, urllib.request, zipfile
from helpers import BASE, client, call, request, signup


def get(c, path, raw=False):
    body = c.open(urllib.request.Request(BASE + path), timeout=60).read()
    return body if raw else body.decode('utf-8')


def workbook_text(data):
    """Every sheet of an .xlsx, as one string per sheet (cells as XML)."""
    z = zipfile.ZipFile(io.BytesIO(data))
    return [z.read(n).decode() for n in sorted(z.namelist()) if n.startswith('xl/worksheets/')]


def report_ids(c):
    """The organisation's reports, read from the results page."""
    return list(dict.fromkeys(re.findall(r'/app/resultats/(\d{6}-\d+)', get(c, '/app/resultats'))))


host, email, password = signup()
stranger, _, _ = signup()
quiz = {'title': 'Bilan de formation', 'questions': [
    {'text': 'Deux plus deux ?', 'options': ['3', '4', '5', '6'], 'correct': 1},
    {'type': 'slide', 'text': 'Une pause', 'options': []},
    {'type': 'poll', 'text': 'Votre ressenti ?', 'options': ['Super', 'Bien', 'Bof'], 'points': 'none'},
    {'type': 'text', 'text': 'Capitale de la France ?', 'options': [], 'accepted': ['Paris']},
]}
qid = call(host, 'save', quiz=quiz)['quiz']['id']
code = call(host, 'create', quizId=qid)['code']
alice, bob, chloe = client(), client(), client()
for c, name in ((alice, 'Alice'), (bob, 'Bob'), (chloe, '=Chloé')):
    call(c, 'join', code=code, name=name)
call(host, 'start', code=code)

call(alice, 'answer', code=code, question=0, choice=1)
call(bob, 'answer', code=code, question=0, choice=0)
call(chloe, 'answer', code=code, question=0, choice=1)
call(host, 'next', code=code, question=0)

# Stopped after the first question: its results are already kept.
ids = report_ids(host)
assert len(ids) == 1, ids
rid = ids[0]
call(host, 'next', code=code, question=1)
call(alice, 'answer', code=code, question=2, answer={'choices': [0]})
call(bob, 'answer', code=code, question=2, answer={'choices': [0]})
call(chloe, 'answer', code=code, question=2, answer={'choices': [2]})
call(host, 'next', code=code, question=2)
call(alice, 'answer', code=code, question=3, answer={'text': 'paris'})
call(bob, 'answer', code=code, question=3, answer={'text': 'Lyon'})
call(chloe, 'answer', code=code, question=3, answer={'text': 'Marseille'})
call(host, 'next', code=code, question=3)
assert report_ids(host) == [rid], 'one report per game, rewritten as it goes'

ranking, questions, game = workbook_text(get(host, f'/api/reports/{rid}', raw=True))
# A nickname starting with « = » stays text: inline strings are never formulas.
assert '<t xml:space="preserve">=Chloé</t>' in ranking and '<f>' not in ranking, ranking[:400]
assert re.search(r'<row r="2">.*?>1</v>.*?Alice', ranking), ranking[:600]
assert 'Capitale de la France ?' in questions and '>33</v>' in questions, questions
assert 'Bilan de formation' in game
page = get(host, f'/app/resultats/{rid}')
assert 'Bilan de formation' in page and 'Classement' in page and 'arrêtée après' not in page

# Another organisation sees nothing; deleting needs the right account.
request(stranger, 'GET', f'/api/reports/{rid}', expect=404)
request(stranger, 'DELETE', f'/api/reports/{rid}', expect=404)
if os.environ.get('KEEP'):
    open(os.environ['KEEP'], 'w').write(f'{email}\n{password}\n{rid}\n')
else:
    request(host, 'DELETE', f'/api/reports/{rid}', expect=200)
    assert report_ids(host) == []
print('reports: ok')
