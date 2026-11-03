export type ScoreRow = {
  id: string;
  name: string;
  score: number;
  priorScore: number;
  correctCount: number;
  /** Team mode: the player's team, null when none. */
  team?: number | null;
};
export function rankPlayers(rows: ScoreRow[], viewer: string, revealed: boolean, index: number) {
  const previous = [...rows].sort((a, b) => b.priorScore - a.priorScore || a.name.localeCompare(b.name));
  const visible = rows
    .map((p) => ({ ...p, score: revealed ? p.score : p.priorScore }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return visible.map((p) => {
    const rank = visible.findIndex((other) => other.score === p.score) + 1;
    const previousRank = previous.findIndex((other) => other.priorScore === p.priorScore) + 1;
    return {
      name: p.name,
      score: p.score,
      me: p.id === viewer,
      rank,
      movement: revealed && index > 0 ? previousRank - rank : null,
      correctCount: revealed ? p.correctCount : undefined,
      team: p.team ?? null,
    };
  });
}
