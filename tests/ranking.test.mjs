import assert from "node:assert/strict";
import { rankPlayers } from "../lib/game-results.ts";
const rows = [
  { id: "a", name: "Alice", score: 1500, priorScore: 900, correctCount: 2 },
  { id: "b", name: "Bob", score: 1700, priorScore: 800, correctCount: 2 },
  { id: "c", name: "Chloé", score: 1500, priorScore: 700, correctCount: 2 },
];
const ranked = rankPlayers(rows, "b", true, 1);
assert.deepEqual(
  ranked.map((p) => [p.name, p.rank, p.movement]),
  [
    ["Bob", 1, 1],
    ["Alice", 2, -1],
    ["Chloé", 2, 1],
  ],
);
assert.equal(ranked[0].me, true);
const hidden = rankPlayers(rows, "b", false, 1);
assert.deepEqual(
  hidden.map((p) => p.score),
  [900, 800, 700],
);
assert(hidden.every((p) => p.movement === null && p.correctCount === undefined));
assert(rankPlayers(rows, "b", true, 0).every((p) => p.movement === null));
assert.deepEqual(rankPlayers([], "b", true, 0), []);
console.log("PASS: rank changes, ties, hidden current scores, first round and empty ranking.");
