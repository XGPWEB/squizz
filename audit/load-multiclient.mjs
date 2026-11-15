import { writeFile } from 'node:fs/promises';
import http from 'node:http';
let input = '';
for await (const chunk of process.stdin) input += chunk;
const fixtures = JSON.parse(input);
const base = 'http://127.0.0.1:5190';
// Optional conditions (all off by default, so the reference scenario is unchanged). Each one is its own
// case, measured and checked on its own; a player is in at most one case per round (chosen by a fixed rule,
// so two runs pick the same players):
//   LOAD_BURST=1          every player of a game answers at the same instant (no 100 ms staggering)
//   LOAD_LATENCY_MS=n     each request waits 0 to n ms before leaving (slow mobile network)
//   LOAD_DUPLICATE=0.05   share of answers sent twice on purpose, both responses received: the second must
//                         be ignored (idempotence)
//   LOAD_LOSS=0.05        share of answers whose response is lost after the server handled it: the client
//                         re-reads the game, as the app does, and sends again only if the answer is missing
//   LOAD_RECONNECT=0.1    share of players cut off from the start of the answer wave for 8 s (no request at
//                         all), then back with the same cookie: they read the game again, then answer, still
//                         in time; the answer must be counted exactly once
//   LOAD_LATE=1           two players per game and per round answer after the host closed the question:
//                         a clean rejection is expected, and nothing is counted
const BURST = process.env.LOAD_BURST === '1';
const LATENCY = Math.max(0, Number(process.env.LOAD_LATENCY_MS ?? 0));
const share = name => Math.min(1, Math.max(0, Number(process.env[name] ?? 0)));
const DUPLICATE = share('LOAD_DUPLICATE');
const LOSS = share('LOAD_LOSS');
const RECONNECT = share('LOAD_RECONNECT');
const LATE = process.env.LOAD_LATE === '1';
const degraded = BURST || LATENCY > 0 || DUPLICATE > 0 || LOSS > 0 || RECONNECT > 0 || LATE;
const events = {
  duplicates_sent: 0, duplicates_ignored: 0,
  responses_lost: 0, lost_found_on_reread: 0, lost_resent: 0,
  offline_windows: 0, reconnected_answers_counted_once: 0,
  late_answers_sent: 0, late_answers_rejected: 0,
};
/** The case of player i in round q: late, reconnect, loss, duplicate or normal. */
function caseOf(i, q) {
  if (LATE && i % 40 === q) return 'late';
  const draw = (k1, k2) => ((i * k1 + q * k2) % 100) / 100;
  if (draw(7, 13) < RECONNECT) return 'reconnect';
  if (draw(13, 19) < LOSS) return 'loss';
  if (draw(11, 17) < DUPLICATE) return 'duplicate';
  return 'normal';
}
const agent = new http.Agent({ keepAlive: true, maxSockets: 128, maxFreeSockets: 128, scheduling: 'lifo' });
function send(url, options) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: options.method, headers: options.headers, agent }, response => {
      // The server has handled the request and answered; the client never gets to read it.
      if (options.dropResponse) {
        response.destroy();
        req.destroy();
        return reject(new Error('response lost'));
      }
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
async function request(actor, action, data = {}, category = action, get = false, opts = {}) {
  if (LATENCY) await sleep(Math.random() * LATENCY);
  const start = performance.now();
  const m = metrics[category] ??= { latencies: [], ok: 0, errors: 0, statuses: {} };
  try {
    const response = await send(base + '/api/game' + (get ? `?action=${action}&code=${actor.code}` : ''), {
      method: get ? 'GET' : 'POST',
      headers: { 'content-type': 'application/json', cookie: actor.cookie ?? '', 'x-real-ip': actor.ip },
      body: get ? undefined : JSON.stringify({ action, code: actor.code, ...data }),
      dropResponse: opts.dropResponse,
    });
    const cookies = response.cookies;
    if (cookies.length && !actor.cookie) actor.cookie = cookies.map(c => c.split(';')[0]).join('; ');
    const raw = response.raw; bytes += Buffer.byteLength(raw);
    m.statuses[response.status] = (m.statuses[response.status] ?? 0) + 1;
    const body = JSON.parse(raw);
    // An expected rejection (a late answer) is a success for the test, and only that exact one.
    if (opts.expectStatus) {
      if (response.status !== opts.expectStatus || !opts.expectError.test(body.error ?? ''))
        throw new Error(`expected ${opts.expectStatus}, got ${response.status}: ${body.error}`);
      m.ok++;
      return body;
    }
    if (!response.ok) throw new Error(`${response.status}: ${body.error}`);
    m.ok++;
    return body;
  } catch (e) {
    // A response dropped on purpose is the scenario itself, not a failure.
    if (opts.dropResponse && e.message === 'response lost') { m.ok++; return null; }
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
    // Offline (tunnel, Wi-Fi switch): no request at all, then polling resumes with the same cookie.
    if (actor.offlineUntil > Date.now()) { await sleep(actor.offlineUntil - Date.now()); continue; }
    await request(actor, 'state', {}, actor === g.host ? 'host_poll' : 'player_poll', true);
    await sleep(900);
  }
}));
// Account/library activity runs alongside the games.
const libraries = games.map(async g => {
  while (active) { await request(g.host, 'list', {}, 'library', true); await sleep(5000); }
});
const loadStart = performance.now();
const accepted = games.map(g => g.players.map(() => 0));
for (let q = 0; q < 3; q++) {
  const starts = await Promise.all(games.map(g => request(g.host, q ? 'next' : 'start', q ? { question: q - 1 } : {}, 'host_action')));
  await sleep(Math.max(...starts.map(s => s?.startsIn ?? 0)) + 1500);
  // A concentrated answer wave ten seconds into the question (each question lasts 120 s).
  await sleep(10000);
  const waveStart = Date.now();
  for (const g of games) g.players.forEach((p, i) => {
    // The cut starts with the wave itself, so it overlaps the answers being sent.
    if (caseOf(i, q) === 'reconnect') { p.offlineUntil = waveStart + 8000; events.offline_windows++; }
  });
  const body = { question: q, choice: q % 4 };
  await Promise.all(games.flatMap((g, gi) => g.players.map(async (p, i) => {
    const kind = caseOf(i, q);
    if (kind === 'late') return;
    if (!BURST) await sleep((i % 20) * 100);
    if (kind === 'reconnect') {
      await sleep(Math.max(0, p.offlineUntil - Date.now()));
      // Back online: the phone reads the game first, then answers, still within the question's time.
      const before = await request(p, 'state', {}, 'reconnect_state', true);
      if (before?.phase !== 'question' || before.revealed || before.myAnswer)
        failures.push({ category: 'reconnect_resume', game: gi, player: p.name, phase: before?.phase, revealed: before?.revealed });
      if (await request(p, 'answer', body, 'answer_after_reconnect')) accepted[gi][i]++;
      const after = await request(p, 'state', {}, 'reconnect_state', true);
      if (after?.myAnswer) events.reconnected_answers_counted_once++;
      else failures.push({ category: 'reconnect_answer_missing', game: gi, player: p.name });
      return;
    }
    if (kind === 'loss') {
      events.responses_lost++;
      await request(p, 'answer', body, 'answer_response_lost', false, { dropResponse: true });
      // The app's way (UncertainError): read the game again, send again only if the answer is missing.
      const state = await request(p, 'state', {}, 'reread_after_loss', true);
      if (state?.myAnswer) { events.lost_found_on_reread++; accepted[gi][i]++; return; }
      events.lost_resent++;
      if (await request(p, 'answer', body, 'answer_resent')) accepted[gi][i]++;
      return;
    }
    if (await request(p, 'answer', body, 'answer')) accepted[gi][i]++;
    if (kind === 'duplicate') {
      events.duplicates_sent++;
      // The same answer again, response received: accepted without a second count.
      if (await request(p, 'answer', body, 'answer_duplicate')) events.duplicates_ignored++;
    }
  })));
  // The host closes the question; then the late players answer: a clean « time is up ».
  await Promise.all(games.map(g => request(g.host, 'close', { question: q }, 'host_action')));
  await Promise.all(games.flatMap(g => g.players.map(async (p, i) => {
    if (caseOf(i, q) !== 'late') return;
    events.late_answers_sent++;
    const rejected = await request(p, 'answer', body, 'answer_late', false, { expectStatus: 400, expectError: /temps est écoulé/ });
    if (rejected) events.late_answers_rejected++;
  })));
  await sleep(20000);
  const states = await Promise.all(games.map(g => request(g.host, 'state', {}, 'validation', true)));
  for (const [i, state] of states.entries()) {
    const expected = games[i].players.filter((_, k) => caseOf(k, q) !== 'late').length;
    if (!state || state.players.length !== 80 || state.answered !== expected || !state.revealed || !state.host) {
      failures.push({ category: 'integrity', round: q, game: i, players: state?.players.length, answered: state?.answered, expected, host: state?.host });
    }
  }
  console.log(`Round ${q + 1}/3 completed; requests: ${Object.values(metrics).reduce((n, m) => n + m.ok + m.errors, 0)}; errors: ${Object.values(metrics).reduce((n, m) => n + m.errors, 0)}`);
}
await Promise.all(games.map(g => request(g.host, 'next', { question: 2 }, 'host_action')));
const final = await Promise.all(games.map(g => request(g.host, 'state', {}, 'validation', true)));
final.forEach((s, i) => { if (s?.phase !== 'finished' || s.players.length !== 80) failures.push({ category: 'final_integrity', game: i }); });
// Scores: k right answers accepted (3 minus the late rounds) give k × 500 to k × 1 000 points, never more —
// a duplicate, a lost-then-resent or a reconnected answer counted twice would break it. The ranking is
// sorted, and each rank is one more than the number of strictly better scores (ties share a place).
final.forEach((s, i) => {
  const players = s?.players ?? [];
  const k = name => accepted[i][games[i].players.findIndex(p => p.name === name)];
  const bad = players.filter((p, j) =>
    p.score < 500 * k(p.name) || p.score > 1000 * k(p.name) ||
    (j > 0 && players[j - 1].score < p.score) ||
    p.rank !== 1 + players.filter(o => o.score > p.score).length ||
    (p.correctCount !== undefined && p.correctCount !== k(p.name)));
  if (bad.length) failures.push({ category: 'score_consistency', game: i, players: bad.slice(0, 3) });
});
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
const result = { clients: games.length, players_per_game: 80, players: games.length * 80, rounds: 3, mode: 'local production build, one Node worker, isolated database; HTTP clients, not rendered browsers', conditions: { burst: BURST, latency_ms: LATENCY, duplicate: DUPLICATE, loss: LOSS, reconnect: RECONNECT, late: LATE }, events, polling_delay_ms: 900, load_seconds: Math.round(loadSeconds), total_seconds: Math.round((performance.now() - beginning) / 1000), response_MB: Math.round(bytes / 1024 / 1024), polling_requests_per_second: Number(((metrics.host_poll.ok + metrics.player_poll.ok) / loadSeconds).toFixed(1)), summary, failures };
await writeFile(`audit/load-${games.length}x80${degraded ? '-degraded' : ''}.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (failures.length || Object.values(metrics).some(m => m.errors)) process.exitCode = 1;
