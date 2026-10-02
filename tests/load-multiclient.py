"""Isolated production load: LOAD_CLIENTS=5 bash scripts/e2e.sh load-multiclient."""
import json, os, pathlib, secrets, subprocess, time, urllib.request
from helpers import signup, set_plan, call

assert os.environ.get('NEXT_DIST_DIR') == '.next-e2e'
assert os.environ['DATABASE_URL'].split('?')[0].rsplit('/', 1)[-1].endswith(('_e2e', '_test'))
count = int(os.environ.get('LOAD_CLIENTS', '5'))
assert 1 <= count <= 20
fixtures = []
for i in range(count):
    name = 'Charge ' + secrets.token_hex(6)
    host, _, _ = signup(name)
    set_plan(name, 'PREMIUM')
    quiz = call(host, 'save', quiz={'title': 'Charge 80 joueurs', 'questions': [
        {'text': f'Question {q}', 'options': ['a', 'b', 'c', 'd'], 'correct': q % 4, 'duration': 120}
        for q in range(3)]})['quiz']
    code = call(host, 'create', quizId=quiz['id'])['code']
    req = urllib.request.Request(os.environ['SQUIZZ_URL'] + '/api/health')
    for handler in host.handlers:
        if hasattr(handler, 'cookiejar'): handler.cookiejar.add_cookie_header(req)
    fixtures.append({'code': code, 'cookie': req.get_header('Cookie'), 'ip': f'192.0.2.{i + 1}'})
    print(f'fixture {i + 1}/{count}', flush=True)
env = dict(os.environ, NODE_ENV='production', APP_URL='http://localhost:5190', NEXTAUTH_URL='http://localhost:5190')
env.pop('NEXT_DIST_DIR', None)
env.pop('STRIPE_SECRET_KEY', None)
env.pop('STRIPE_WEBHOOK_SECRET', None)
root = pathlib.Path(__file__).resolve().parents[1]
log = open('/tmp/squizz-load-server.log', 'w')
server = subprocess.Popen(['node', 'node_modules/next/dist/bin/next', 'start', '--port', '5190'], cwd=root, env=env, stdout=log, stderr=log)
try:
    for _ in range(60):
        if server.poll() is not None: raise RuntimeError('production server stopped; see /tmp/squizz-load-server.log')
        try:
            urllib.request.urlopen('http://127.0.0.1:5190/api/health', timeout=2)
            break
        except Exception: time.sleep(1)
    else: raise RuntimeError('production server unavailable')
    subprocess.run(['node', 'audit/load-multiclient.mjs'], cwd=root, env=env, input=json.dumps(fixtures), text=True, check=True)
finally:
    server.terminate()
    try: server.wait(timeout=10)
    except subprocess.TimeoutExpired: server.kill(); server.wait()
    log.close()
