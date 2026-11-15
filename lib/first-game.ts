/**
 * When the library's first-steps guide goes away by itself: once the organisation has really played a live
 * game to its end. A waiting room or a game left halfway keeps it; a self-paced link (« solo-… » reports)
 * is not a live game. The person can also hide it at any time (kept in the browser).
 */
export type RoomTrace = { phase: string };
export type ReportTrace = { id: string; finished: boolean };

export const isFinishedLiveGame = {
  room: (r: RoomTrace) => r.phase === "finished",
  report: (r: ReportTrace) => r.finished && !r.id.startsWith("solo-"),
};

export const firstGameStillAhead = (rooms: RoomTrace[], reports: ReportTrace[]) =>
  !rooms.some(isFinishedLiveGame.room) && !reports.some(isFinishedLiveGame.report);

/** The same rule as database filters, for the library page (one indexed lookup each). */
export const finishedRoomWhere = (organizationId: string) => ({ organizationId, phase: "finished" });
export const finishedReportWhere = (organizationId: string) => ({
  organizationId,
  finished: true,
  NOT: { id: { startsWith: "solo-" } },
});
