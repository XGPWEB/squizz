"""Polling latency of a live game (host signed in + 50 anonymous players): bash scripts/e2e.sh perf-polling.
A measurement on the local test server, to compare before and after a change; not a regression test."""
import json, os, statistics, threading, time, urllib.request
from helpers import BASE, client, call, signup, set_plan
import secrets

name = f'Org perf {secrets.token_hex(3)}'
host, _, _ = signup(name)
set_plan(name, 'PRO')
code = call(host, 'create', quizId='general')['code']
players = [client() for _ in range(50)]
for i, p in enumerate(players):
    call(p, 'join', code=code, name=f'J{i}')
call(host, 'start', code=code)

def poll(c):
    t = time.perf_counter()
    r = c.open(urllib.request.Request(f'{BASE}/api/game?action=state&code={code}'), timeout=30)
    r.read()
    return (time.perf_counter() - t) * 1000, r.status

def burst(clients, total, workers=20):
    times, lock, idx = [], threading.Lock(), iter(range(total))
    def work():
        while True:
            with lock:
                i = next(idx, None)
            if i is None: return
            ms, status = poll(clients[i % len(clients)])
            assert status == 200
            with lock: times.append(ms)
    threads = [threading.Thread(target=work) for _ in range(workers)]
    t0 = time.perf_counter(); [t.start() for t in threads]; [t.join() for t in threads]
    times.sort()
    return {'n': total, 'total_s': round(time.perf_counter() - t0, 3), 'median_ms': round(statistics.median(times), 1),
            'p95_ms': round(times[int(len(times) * .95) - 1], 1), 'max_ms': round(times[-1], 1)}

burst(players, 100)  # warm-up (compilation, caches)
out = {'players': burst(players, 400), 'host': burst([host], 200), 'mixed': burst(players + [host] * 10, 400)}
print(json.dumps(out))
path = os.environ.get('PERF_OUT')
if path: open(path, 'w').write(json.dumps(out))
