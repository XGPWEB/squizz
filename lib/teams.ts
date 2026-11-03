/**
 * Team mode: the host splits the players into 2 to 6 teams. A team's score is the average of its
 * players' scores, so a team of three and a team of five stay comparable.
 */

export const MAX_TEAMS = 6;

/** Names and colours in the SQuizz palette, in this order. */
export const TEAMS = [
  { name: "Les Éclairs", color: "electric" },
  { name: "Les Citrons", color: "acid" },
  { name: "Les Flamants", color: "pink" },
  { name: "Les Mandarines", color: "orange" },
  { name: "Les Corbeaux", color: "ink" },
  { name: "Les Nuages", color: "cloud" },
] as const;

export const teamName = (index: number) => TEAMS[index]?.name ?? `Équipe ${index + 1}`;

type Member = { team: number | null; score: number; priorScore?: number };

export type TeamStanding = {
  index: number;
  name: string;
  color: string;
  players: number;
  score: number;
  rank: number;
  /** Places won (positive) or lost since the previous question; null before the first one. */
  movement: number | null;
};

const average = (scores: number[]) =>
  scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

/** Ranks of a list of scores: equal scores share a rank (1, 1, 3…). */
const ranks = (scores: number[]) => scores.map((s) => scores.filter((o) => o > s).length + 1);

/**
 * The teams in ranking order. With `previous`, each one also says how many places it won or lost
 * compared with the scores before the current question.
 */
export function teamStandings(count: number, members: Member[], previous = false): TeamStanding[] {
  const groups = Array.from({ length: count }, (_, i) => members.filter((m) => m.team === i));
  const scores = groups.map((g) => average(g.map((m) => m.score)));
  const before = groups.map((g) => average(g.map((m) => m.priorScore ?? 0)));
  const now = ranks(scores);
  const then = ranks(before);
  return groups
    .map((g, index) => ({
      index,
      name: teamName(index),
      color: TEAMS[index]?.color ?? "electric",
      players: g.length,
      score: scores[index],
      rank: now[index],
      movement: previous ? then[index] - now[index] : null,
    }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index);
}

/**
 * Places the players without a team in the emptiest teams (the lowest number first on a tie), and
 * returns the team given to each of them.
 */
export function fillTeams(count: number, players: { id: string; team: number | null }[]) {
  const sizes = Array.from({ length: count }, (_, i) => players.filter((p) => p.team === i).length);
  const placed = new Map<string, number>();
  for (const p of players) {
    if (p.team !== null && p.team < count) continue;
    const team = sizes.indexOf(Math.min(...sizes));
    sizes[team]++;
    placed.set(p.id, team);
  }
  return placed;
}
