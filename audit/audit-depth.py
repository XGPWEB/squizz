"""Probes complémentaires d'audit, uniquement avec scripts/e2e.sh audit-depth."""
import base64, concurrent.futures, json, os, pathlib, runpy, secrets, sys, time, urllib.request, uuid
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / 'tests'))
from helpers import BASE, client, call, request, signup, set_plan, login, mock

assert os.environ.get('NEXT_DIST_DIR') == '.next-e2e', 'Serveur isolé obligatoire'
results = []
def record(name, **details):
    results.append(dict(name=name, **details))
    print(json.dumps(results[-1], ensure_ascii=False), flush=True)
def upload(c, data):
    boundary = uuid.uuid4().hex
    body = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="x.webp"\r\nContent-Type: image/webp\r\n\r\n').encode() + data + f'\r\n--{boundary}--\r\n'.encode()
    req = urllib.request.Request(BASE + '/api/media', data=body, method='POST', headers={'Content-Type': f'multipart/form-data; boundary={boundary}'})
    return json.loads(c.open(req).read())['media']['url']
def usage(c):
    return request(c, 'GET', '/api/org')['usage']['mediaBytes']
webp = base64.b64decode('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=')
tag = secrets.token_hex(4)
src, email, pw = signup('Audit source ' + tag)
set_plan('Audit source ' + tag, 'PRO')
urls = [upload(src, webp), upload(src, webp)]
questions = [{'text': 'Question ' + str(i), 'options': ['a', 'b'], 'correct': 0,
              'duration': 60, 'media': [{'kind': 'image', 'url': u, 'caption': str(i)}]} for i, u in enumerate(urls)]
qid = call(src, 'save', quiz={'title': 'Export multiple', 'questions': questions})['quiz']['id']
exports = [call(src, 'export', quizId=qid)['file'] for _ in range(5)]
record('export_multiple_media', refs=[[f['ref'] for f in e['files']] for e in exports],
       unique=all(len({f['ref'] for f in e['files']}) == len(e['files']) for e in exports))

dst, _, _ = signup('Audit destination ' + tag)
set_plan('Audit destination ' + tag, 'PRO')
file = exports[0]
before = usage(dst)
bad = dict(file, questions=[dict(file['questions'][0], text='')])
out = call(dst, 'import', expect=None, file=bad, clientKey='invalid-' + tag)
record('failed_import_media', error=out.get('error'), before=before, after=usage(dst))

free, _, _ = signup('Audit retry ' + tag)
single = dict(file, questions=[file['questions'][0]], files=[file['files'][0]])
key = 'retry-' + tag
first = call(free, 'import', file=single, clientKey=key)
second = call(free, 'import', expect=None, file=single, clientKey=key)
record('import_retry_at_quota', first_id=first['quiz']['id'], second_id=second.get('quiz', {}).get('id'), error=second.get('error'))

# Null question is untrusted input; it should be refused cleanly.
record('null_question_import', response=call(dst, 'import', expect=None, file=dict(file, questions=[None])))

# A changed suffix after byte 72 must not authenticate as the original password.
longpw = 'A' * 72 + '-original'
request(src, 'POST', '/api/account/password', {'current': pw, 'next': longpw})
candidate = client()
csrf = request(candidate, 'GET', '/api/auth/csrf')['csrfToken']
request(candidate, 'POST', '/api/auth/callback/credentials',
        {'csrfToken': csrf, 'email': email, 'password': 'A' * 72 + '-different', 'json': 'true'}, expect=None, form=True)
record('password_suffix_collision', different_password_authenticated=bool(request(candidate, 'GET', '/api/auth/session').get('user')))
login(src, email, longpw)

# Session revocation must also protect the live game's read path.
code = call(src, 'create', quizId=qid)['code']
request(src, 'POST', '/api/account/password', {'current': longpw, 'next': pw})
stale_state = request(src, 'GET', '/api/game?action=state&code=' + code, expect=None)
stale_write = call(src, 'start', expect=None, code=code)
record('revoked_session_game', read_granted=stale_state.get('host') is True, write_error=stale_write.get('error'))
login(src, email, pw)

# Modest local load: 50 players join, then 200 polls with 20 concurrent requests.
players = [client() for _ in range(50)]
def join_pair(pair):
    i, c = pair
    return call(c, 'join', code=code, name='Audit-' + str(i))
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
    list(pool.map(join_pair, enumerate(players)))
call(src, 'start', code=code)
def poll(i):
    began = time.perf_counter()
    out = request(players[i % 50], 'GET', '/api/game?action=state&code=' + code)
    return (time.perf_counter() - began) * 1000, out.get('phase')
began = time.perf_counter()
with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
    samples = list(pool.map(poll, range(200)))
latencies = sorted(x[0] for x in samples)
record('polling_load', requests=200, players=50, concurrency=20, seconds=round(time.perf_counter()-began, 3),
       p50_ms=round(latencies[100], 1), p95_ms=round(latencies[189], 1), max_ms=round(latencies[-1], 1),
       successful=sum(x[1] == 'question' for x in samples))

# Checkout request in flight when the same organization is deleted.
race, race_email, racepw = signup('Audit billing race ' + tag)
mock('delay', {'path': '/v1/checkout/sessions', 'ms': 2000})
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    future = pool.submit(request, race, 'POST', '/api/billing/checkout', {'plan': 'PRO'}, None)
    time.sleep(0.7)
    deletion = request(race, 'DELETE', '/api/account', {'password': racepw}, expect=None)
    checkout = future.result()
mock('delay', {'clear': True})
state = mock('state')
orphans = [s for s in state['sessions'].values() if s['status'] == 'open' and s['organizationId'] and
           state['customers'].get(s['customer'], {}).get('email') == race_email]
record('checkout_delete_race', deletion=deletion, checkout=checkout,
       open_session_for_race=bool(orphans),
       open_sessions=[{'id': s['id'], 'organizationId': s['organizationId']} for s in orphans])

runpy.run_path(str(pathlib.Path(__file__).resolve().parent / 'billing-interruption.py'), run_name='__main__')
results.append(json.loads(pathlib.Path('/tmp/squizz-billing-interruption.json').read_text()))
pathlib.Path('/tmp/squizz-deep-results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
pathlib.Path('/tmp/squizz-browser-fixture.json').write_text(json.dumps({'email': email, 'password': pw, 'code': code}))
pathlib.Path('/tmp/squizz-audit-ready').touch()
if os.environ.get('AUDIT_KEEP_SERVER') == '1':
    deadline = time.time() + 900
    while time.time() < deadline and not pathlib.Path('/tmp/squizz-audit-done').exists():
        time.sleep(1)
