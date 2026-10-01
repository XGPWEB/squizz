"""Shared helpers for the integration tests (run against `npm run dev` on port 5173)."""
import http.cookiejar, json, os, secrets, time, urllib.error, urllib.parse, urllib.request

BASE = os.environ.get('SQUIZZ_URL', 'http://127.0.0.1:5173')


def client():
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))


def request(c, method, path, body=None, expect=200, form=False):
    data = None
    headers = {}
    if body is not None:
        data = urllib.parse.urlencode(body).encode() if form else json.dumps(body).encode()
        headers['Content-Type'] = 'application/x-www-form-urlencoded' if form else 'application/json'
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        r = c.open(req, timeout=60); status = r.status; raw = r.read()
    except urllib.error.HTTPError as e:
        status = e.code; raw = e.read()
    try: out = json.loads(raw or b'{}')
    except ValueError: out = {'raw': raw[:200]}
    assert expect is None or status == expect, (method, path, status, out)
    return out


def call(c, action, expect=200, **data):
    out = request(c, 'POST', '/api/game', dict(action=action, **data), expect)
    # After start/next the question only opens once the "Ready?" countdown is over.
    if action in ('start', 'next') and isinstance(out, dict) and out.get('startsIn'):
        time.sleep(out['startsIn'] / 1000 + 0.1)
    return out


def login(c, email, password, ok=True):
    csrf = request(c, 'GET', '/api/auth/csrf')['csrfToken']
    request(c, 'POST', '/api/auth/callback/credentials',
            {'csrfToken': csrf, 'email': email, 'password': password, 'json': 'true'}, expect=None, form=True)
    session = request(c, 'GET', '/api/auth/session')
    assert bool(session.get('user')) == ok, ('login', email, session)
    return c


def admin_login(c, email, password, ok=True):
    """Signs in to the super-admin space (its own cookie, separate from the client session)."""
    request(c, 'POST', '/api/admin/session', {'email': email, 'password': password}, expect=200 if ok else 401)
    return c


def signup(org=None):
    """Creates a fresh organisation and returns (client signed in as its admin, email, password)."""
    email = f'test-{secrets.token_hex(6)}@example.test'
    password = 'Motdepasse-' + secrets.token_hex(4)
    c = client()
    out = request(c, 'POST', '/api/account/signup',
                  {'organization': org or 'Org ' + email[:11], 'name': 'Admin Test', 'email': email, 'password': password})
    verify(out['devLink'])
    login(c, email, password)
    return c, email, password


def verify(link):
    """Confirms an address with the link the dev server returns when no email can be sent."""
    token = link.split('/verifier-email/', 1)[1].split('?', 1)[0]
    return request(client(), 'POST', '/api/account/verify', {'token': token})


def invite(admin, role='HOST', name='Membre Test'):
    """Invites a member through the API, accepts the link, returns (signed-in client, email, password)."""
    email = f'member-{secrets.token_hex(6)}@example.test'
    password = 'Motdepasse-' + secrets.token_hex(4)
    link = request(admin, 'POST', '/api/org/invitations', {'email': email, 'role': role})['link']
    token = link.rsplit('/', 1)[1]
    c = client()
    request(c, 'POST', f'/api/invitations/{token}', {'name': name, 'password': password})
    login(c, email, password)
    return c, email, password


def set_plan(org_name, plan):
    """Moves an organisation to another plan through the super-admin (the seeded account in .env)."""
    root = admin_login(client(), env('SEED_SUPER_ADMIN_EMAIL'), env('SEED_SUPER_ADMIN_PASSWORD'))
    orgs = request(root, 'GET', '/api/admin/organizations')['organizations']
    org_id = next(o['id'] for o in orgs if o['name'] == org_name)
    request(root, 'PATCH', f'/api/admin/organizations/{org_id}', {'plan': plan})
    return org_id


def env(name):
    """A setting from the environment (CI, isolated run), else from the project's .env (seeded super-admin)."""
    if os.environ.get(name):
        return os.environ[name]
    path = os.path.join(os.path.dirname(__file__), '..', '.env')
    for line in open(path):
        if line.startswith(name + '='):
            return line.split('=', 1)[1].strip().strip('"')
    raise KeyError(name)


# --- Stripe mock (tests/stripe_mock.py, started by scripts/e2e.sh): never the real Stripe ------------------
STRIPE_MOCK = os.environ.get('STRIPE_MOCK_URL', 'http://127.0.0.1:5175')


def mock(path, body=None):
    """Controls or inspects the Stripe mock (/_mock/…)."""
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(STRIPE_MOCK + '/_mock/' + path, data=data, method='GET' if body is None else 'POST')
    return json.loads(urllib.request.urlopen(req, timeout=30).read())


def stripe_event(kind, obj, expect=200):
    """Sends the app a webhook event signed like Stripe does (same HMAC scheme, with the mock's secret)."""
    import hashlib, hmac
    payload = json.dumps({'id': 'evt_' + secrets.token_hex(8), 'object': 'event', 'type': kind, 'data': {'object': obj}})
    stamp = str(int(time.time()))
    secret = os.environ.get('STRIPE_WEBHOOK_SECRET', 'whsec_mock_never_real')
    sig = hmac.new(secret.encode(), f'{stamp}.{payload}'.encode(), hashlib.sha256).hexdigest()
    req = urllib.request.Request(BASE + '/api/billing/webhook', data=payload.encode(), method='POST',
                                 headers={'Content-Type': 'application/json', 'Stripe-Signature': f't={stamp},v1={sig}'})
    try:
        status = urllib.request.urlopen(req, timeout=60).status
    except urllib.error.HTTPError as e:
        status = e.code
    assert status == expect, ('webhook', kind, status)
