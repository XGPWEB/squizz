import { writeFile } from 'node:fs/promises';
import http from 'node:http';
let input = '';
for await (const chunk of process.stdin) input += chunk;
const fixtures = JSON.parse(input);
const base = 'http://127.0.0.1:5190';
const agent = new http.Agent({ keepAlive: true, maxSockets: 128, maxFreeSockets: 128, scheduling: 'lifo' });
function send(url, options) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: options.method, headers: options.headers, agent }, response => {
      const chunks = [];
      response.on('data', c => chunks.push(c));
      response.on('error', reject);
      response.on('end', () => resolve({ status: response.statusCode, ok: response.statusCode < 400,
        cookies: response.headers['set-cookie'] ?? [], raw: Buffer.concat(chunks).toString('utf8') }));
    });
    req.setTimeout(5000, () => req.destroy(new Error('request timeout')));
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const metrics = {};
let bytes = 0;
const failures = [];
async function request(actor, action, data = {}, category = action, get = false) {
  const start = performance.now();
  const m = metrics[category] ??= { latencies: [], ok: 0, errors: 0, statuses: {} };
  try {
    const response = await send(base + '/api/game' + (get ? `?action=${action}&code=${actor.code}` : ''), {
      method: get ? 'GET' : 'POST',
      headers: { 'content-type': 'application/json', cookie: actor.cookie ?? '', 'x-real-ip': actor.ip },
      body: get ? undefined : JSON.stringify({ action, code: actor.code, ...data }),
      signal: AbortSignal.timeout(5000),
    });
    const cookies = response.cookies;
    if (cookies.length && !actor.cookie) actor.cookie = cookies.map(c => c.split(';')[0]).join('; ');
    const raw = response.raw; bytes += Buffer.byteLength(raw);
    m.statuses[response.status] = (m.statuses[response.status] ?? 0) + 1;
    const body = JSON.parse(raw);
    if (!response.ok) throw new Error(`${response.status}: ${body.error}`);
    m.ok++;
    return body;
  } catch (e) {
    m.errors++;
    if (failures.length < 3) console.log('Connection diagnostic:', String(e), String(e.cause), e.cause?.code);
    if (failures.length < 20) failures.push({ category, code: actor.code, error: String(e), cause: String(e.cause), cause_code: e.cause?.code ?? e.code });
    return null;
  } finally { m.latencies.push(performance.now() - start); }
}
const games = fixtures.map(f => ({ host: { ...f }, players: Array.from({ length: 80 }, (_, i) => ({ code: f.code, ip: f.ip, name: `J${i + 1}` })) }));
const beginning = performance.now();
// A classroom has one public IP; different organisations have different public IPs.
for (let batch = 0; batch < 80; batch += 10) {
  await Promise.all(games.flatMap(g => g.players.slice(batch, batch + 10).map(p => request(p, 'join', { name: p.name }))));
}
console.log(`Joined ${games.length * 80} players; errors: ${metrics.join.errors}`);
if (metrics.join.errors) throw new Error('Incomplete player setup');
let active = true;
const loops = games.flatMap(g => [g.host, ...g.players].map(async actor => {
  await sleep(Math.random() * 900);
  while (active) {
    await request(actor, 'state', {}, actor === g.host ? 'host_poll' : 'player_poll', true);
    await sleep(900);
  }
}));
// Account/library activity runs alongside the games.
const libraries = games.map(async g => {
  while (active) { await request(g.host, 'list', {}, 'library', true); await sleep(5000); }
});
const loadStart = performance.now();
for (let q = 0; q < 3; q++) {
  const starts = await Promise.all(games.map(g => request(g.host, q ? 'next' : 'start', q ? { question: q - 1 } : {}, 'host_action')));
  await sleep(Math.max(...starts.map(s => s?.startsIn ?? 0)) + 1500);
  // One minute per round, with a concentrated answer wave after ten seconds.
  await sleep(10000);
  await Promise.all(games.flatMap(g => g.players.map(async (p, i) => {
    await sleep((i % 20) * 100);
    await request(p, 'answer', { question: q, choice: q % 4 }, 'answer');
  })));
  await sleep(35000);
  const states = await Promise.all(games.map(g => request(g.host, 'state', {}, 'validation', true)));
  for (const [i, state] of states.entries()) {
    if (!state || state.players.length !== 80 || state.answered !== 80 || !state.revealed || !state.host) {
      failures.push({ category: 'integrity', round: q, game: i, players: state?.players.length, answered: state?.answered, host: state?.host });
    }
  }
  console.log(`Round ${q + 1}/3 completed; requests: ${Object.values(metrics).reduce((n, m) => n + m.ok + m.errors, 0)}; errors: ${Object.values(metrics).reduce((n, m) => n + m.errors, 0)}`);
}
await Promise.all(games.map(g => request(g.host, 'next', { question: 2 }, 'host_action')));
const final = await Promise.all(games.map(g => request(g.host, 'state', {}, 'validation', true)));
final.forEach((s, i) => { if (s?.phase !== 'finished' || s.players.length !== 80 || !s.players.every(p => p.score > 0)) failures.push({ category: 'final_integrity', game: i }); });
active = false;
await Promise.all([...loops, ...libraries]);
agent.destroy();
const loadSeconds = (performance.now() - loadStart) / 1000;
const summary = {};
for (const [name, m] of Object.entries(metrics)) {
  const sorted = m.latencies.sort((a, b) => a - b);
  const pct = p => Math.round(sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)]);
  summary[name] = { requests: sorted.length, ok: m.ok, errors: m.errors, statuses: m.statuses, p50_ms: pct(.5), p95_ms: pct(.95), p99_ms: pct(.99), max_ms: Math.round(sorted.at(-1)) };
}
const result = { clients: games.length, players_per_game: 80, players: games.length * 80, rounds: 3, mode: 'local production build, one Node worker, isolated database; HTTP clients, not rendered browsers', polling_delay_ms: 900, load_seconds: Math.round(loadSeconds), total_seconds: Math.round((performance.now() - beginning) / 1000), response_MB: Math.round(bytes / 1024 / 1024), polling_requests_per_second: Number(((metrics.host_poll.ok + metrics.player_poll.ok) / loadSeconds).toFixed(1)), summary, failures };
await writeFile(`audit/load-${games.length}x80.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (failures.length || Object.values(metrics).some(m => m.errors)) process.exitCode = 1;
