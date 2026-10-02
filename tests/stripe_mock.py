"""A local stand-in for the Stripe API, for integration tests only: python3 tests/stripe_mock.py [port].

The app is pointed at it with STRIPE_API_BASE (ignored in production). It keeps customers, Checkout sessions
and subscriptions in memory and never talks to Stripe: no payment, no real subscription.

Test controls (JSON), under /_mock:
  POST /_mock/reset                      forget everything
  GET  /_mock/state                      everything created so far, and the calls received
  POST /_mock/complete {"session": id}   « pay » a Checkout session: creates its subscription
  POST /_mock/expire {"session": id}     the page is no longer payable
  POST /_mock/subscription {"customer": id, "product": id, "organizationId": id}   a subscription made elsewhere
  POST /_mock/fail {"method": "DELETE", "path": "/v1/subscriptions", "status": 500, "times": 3}
  POST /_mock/delay {"path": "/v1/checkout/sessions", "ms": 400, "method": "POST"}   (method optional)
"""
import json, sys, threading, time, urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

LOCK = threading.Lock()
STATE = {}


def reset():
    # Ids keep counting across resets: the test database outlives them, and an id is never given twice.
    n = STATE.get('n', 0)
    STATE.clear()
    STATE.update(customers={}, sessions={}, subscriptions={}, calls=[], failures=[], delays=[], idempotent={}, n=n)


reset()


def new_id(prefix):
    STATE['n'] += 1
    return f"{prefix}_mock{STATE['n']:04d}"


def price(product):
    return {'id': f'price_{product}', 'object': 'price', 'product': product}


def subscription(customer, product, organization_id=None, status='active'):
    now = int(time.time())
    sub = {
        'id': new_id('sub'), 'object': 'subscription', 'customer': customer, 'status': status, 'created': now,
        'cancel_at_period_end': False, 'metadata': {'organizationId': organization_id} if organization_id else {},
        'items': {'object': 'list', 'data': [{'id': new_id('si'), 'price': price(product),
                                              'current_period_end': now + 30 * 86400}]},
    }
    STATE['subscriptions'][sub['id']] = sub
    return sub


def flat(form):
    """Stripe's form encoding (a[b][0][c]=v) into nested dicts and lists."""
    out = {}
    for key, value in form:
        parts = key.replace(']', '').split('[')
        node = out
        for i, part in enumerate(parts[:-1]):
            node = node.setdefault(part, {})
        node[parts[-1]] = value
    return out


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def reply(self, status, body):
        raw = json.dumps(body).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(raw)))
        self.send_header('Request-Id', 'req_mock')
        self.end_headers()
        self.wfile.write(raw)

    def missing(self, what):
        self.reply(404, {'error': {'type': 'invalid_request_error', 'code': 'resource_missing', 'message': f'No such {what}'}})

    def handle_any(self, method):
        url = urllib.parse.urlparse(self.path)
        path, query = url.path, dict(urllib.parse.parse_qsl(url.query))
        length = int(self.headers.get('Content-Length') or 0)
        raw = self.rfile.read(length).decode() if length else ''
        if path.startswith('/_mock'):
            return self.control(method, path, json.loads(raw or '{}'))
        body = flat(urllib.parse.parse_qsl(raw))
        for d in list(STATE['delays']):
            if path.startswith(d['path']) and d.get('method') in (None, method):
                time.sleep(d['ms'] / 1000)
        with LOCK:
            STATE['calls'].append({'method': method, 'path': path})
            for f in STATE['failures']:
                if f['method'] == method and path.startswith(f['path']) and f['times'] > 0:
                    f['times'] -= 1
                    return self.reply(f['status'], {'error': {'type': 'api_error', 'message': 'Mock failure'}})
            key = self.headers.get('Idempotency-Key')
            if method == 'POST' and key and key in STATE['idempotent']:
                return self.reply(200, STATE['idempotent'][key])
            status, out = self.api(method, path, query, body)
            if method == 'POST' and key and status == 200:
                STATE['idempotent'][key] = out
        if status == 404:
            return self.missing(out)
        self.reply(status, out)

    def api(self, method, path, query, body):
        parts = path.strip('/').split('/')[1:]  # drop « v1 »
        listing = lambda rows: (200, {'object': 'list', 'data': rows, 'has_more': False, 'url': path})
        if parts[0] == 'products' and method == 'GET':
            return 200, {'id': parts[1], 'object': 'product', 'default_price': f'price_{parts[1]}'}
        if parts[0] == 'customers' and method == 'GET':
            return listing([c for c in STATE['customers'].values() if query.get('email') in (None, c['email'])])
        if parts[0] == 'customers' and method == 'POST':
            c = {'id': new_id('cus'), 'object': 'customer', 'email': body.get('email'), 'metadata': body.get('metadata', {})}
            STATE['customers'][c['id']] = c
            return 200, c
        if parts[:2] == ['checkout', 'sessions']:
            sessions = STATE['sessions']
            if len(parts) == 2 and method == 'POST':
                item = body['line_items']['0']
                # A one-off payment (the event pass) sends its own price instead of a product's.
                product = item['price'].removeprefix('price_') if 'price' in item else None
                amount = int(item.get('price_data', {}).get('unit_amount', 0))
                s = {'id': new_id('cs'), 'object': 'checkout.session', 'status': 'open', 'mode': body.get('mode'),
                     'customer': body.get('customer'), 'client_reference_id': body.get('client_reference_id'),
                     'metadata': body.get('metadata', {}), 'subscription': None, 'product': product,
                     'payment_status': 'unpaid', 'amount_total': amount,
                     'organizationId': body.get('subscription_data', {}).get('metadata', {}).get('organizationId')}
                s['url'] = f"https://checkout.mock/pay/{s['id']}"
                sessions[s['id']] = s
                return 200, s
            if len(parts) == 2 and method == 'GET':
                return listing([s for s in sessions.values()
                                if s['customer'] == query.get('customer') and query.get('status') in (None, s['status'])])
            s = sessions.get(parts[2])
            if not s:
                return 404, 'checkout.session'
            if len(parts) == 4 and parts[3] == 'expire' and method == 'POST':
                if s['status'] != 'open':
                    return 400, {'error': {'type': 'invalid_request_error', 'message': 'Session is not open'}}
                s['status'] = 'expired'
            return 200, s
        if parts[0] == 'subscriptions':
            subs = STATE['subscriptions']
            if len(parts) == 1 and method == 'GET':
                return listing([s for s in subs.values() if s['customer'] == query.get('customer')])
            s = subs.get(parts[1])
            if not s:
                return 404, 'subscription'
            if method == 'DELETE':
                s['status'] = 'canceled'
            elif method == 'POST':
                if 'cancel_at_period_end' in body:
                    s['cancel_at_period_end'] = body['cancel_at_period_end'] == 'true'
                if 'items' in body:
                    s['items']['data'][0]['price'] = price(body['items']['0']['price'].removeprefix('price_'))
            return 200, s
        if parts[:2] == ['billing_portal', 'sessions'] and method == 'POST':
            return 200, {'id': new_id('bps'), 'url': 'https://billing.mock/portal'}
        return 404, 'route'

    def control(self, method, path, body):
        with LOCK:
            if path == '/_mock/reset':
                reset()
                return self.reply(200, {'ok': True})
            if path == '/_mock/state':
                return self.reply(200, {k: STATE[k] for k in ('customers', 'sessions', 'subscriptions', 'calls')})
            if path == '/_mock/complete':
                s = STATE['sessions'][body['session']]
                if s['status'] != 'open':
                    return self.reply(400, {'error': 'session not open'})
                s['status'], s['payment_status'] = 'complete', 'paid'
                if s['mode'] == 'payment':
                    return self.reply(200, {'session': s})
                sub = subscription(s['customer'], s['product'], s['organizationId'])
                s['subscription'] = sub['id']
                return self.reply(200, {'session': s, 'subscription': sub})
            if path == '/_mock/expire':
                STATE['sessions'][body['session']]['status'] = 'expired'
                return self.reply(200, {'ok': True})
            if path == '/_mock/subscription':
                return self.reply(200, subscription(body['customer'], body['product'], body.get('organizationId')))
            if path == '/_mock/fail':
                STATE['failures'] = [] if body.get('clear') else STATE['failures'] + [dict(status=500, times=1) | body]
                return self.reply(200, {'ok': True})
            if path == '/_mock/delay':
                STATE['delays'] = [] if body.get('clear') else STATE['delays'] + [body]
                return self.reply(200, {'ok': True})
        self.reply(404, {'error': 'unknown control'})

    do_GET = lambda self: self.handle_any('GET')
    do_POST = lambda self: self.handle_any('POST')
    do_DELETE = lambda self: self.handle_any('DELETE')


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5175
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
