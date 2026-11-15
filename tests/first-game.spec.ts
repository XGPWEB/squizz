import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { finishedReportWhere, finishedRoomWhere, firstGameStillAhead } from "@/lib/first-game";

test("guide : gardé pour une salle créée ou une partie commencée, retiré après une partie terminée", () => {
  // Nothing yet.
  expect(firstGameStillAhead([], [])).toBe(true);
  // Room created, still waiting for players.
  expect(firstGameStillAhead([{ phase: "lobby" }], [])).toBe(true);
  // Game started, then left halfway: its report exists but is not finished.
  expect(firstGameStillAhead([{ phase: "question" }], [{ id: "123456-1", finished: false }])).toBe(true);
  // Game played to its end: the room says so for a day, the report for 12 months.
  expect(firstGameStillAhead([{ phase: "finished" }], [])).toBe(false);
  expect(firstGameStillAhead([], [{ id: "123456-1", finished: true }])).toBe(false);
  // A self-paced link is not a live game.
  expect(firstGameStillAhead([], [{ id: "solo-abc", finished: true }])).toBe(true);
});

test("guide : la bibliothèque interroge la base avec la même règle", () => {
  expect(finishedRoomWhere("org")).toEqual({ organizationId: "org", phase: "finished" });
  expect(finishedReportWhere("org")).toMatchObject({ organizationId: "org", finished: true });
  const page = readFileSync("app/app/page.tsx", "utf8");
  expect(page).toContain("finishedReportWhere(member.organizationId)");
  expect(page).toContain("finishedRoomWhere(member.organizationId)");
  expect(page).toContain("firstGame={!finished}");
});
