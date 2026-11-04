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

/** Longest team name the host can type. */
export const MAX_TEAM_NAME = 32;

/** A team's name: the one chosen at launch, else the default of its place. */
export const teamName = (index: number, names: readonly string[] = []) =>
  names[index]?.trim() || TEAMS[index]?.name || `Équipe ${index + 1}`;

/** The names sent with a launch, cleaned: trimmed, cut to the limit, a blank one left to its default. */
export function cleanTeamNames(raw: unknown, count: number): string[] {
  const list = Array.isArray(raw) ? raw : [];
  return Array.from({ length: count }, (_, i) =>
    String(typeof list[i] === "string" ? list[i] : "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_TEAM_NAME),
  );
}

/**
 * Funny team names, drawn on the host's device: an animal or a thing, then an adjective agreed
 * with it (« Les Cornichons Survoltés », « Les Loutres Masquées »). No word comes twice in a draw.
 */
const NOUNS: [string, "m" | "f"][] = [
  ["Pingouins", "m"],
  ["Cornichons", "m"],
  ["Hérissons", "m"],
  ["Lamas", "m"],
  ["Yétis", "m"],
  ["Pandas", "m"],
  ["Croissants", "m"],
  ["Ninjas", "m"],
  ["Wombats", "m"],
  ["Dinosaures", "m"],
  ["Ratons laveurs", "m"],
  ["Poulpes", "m"],
  ["Koalas", "m"],
  ["Castors", "m"],
  ["Licornes", "f"],
  ["Patates", "f"],
  ["Sardines", "f"],
  ["Chaussettes", "f"],
  ["Tortues", "f"],
  ["Crevettes", "f"],
  ["Loutres", "f"],
  ["Mouettes", "f"],
  ["Baguettes", "f"],
  ["Girafes", "f"],
  ["Fusées", "f"],
  ["Myrtilles", "f"],
];
const ADJECTIVES: [string, string][] = [
  ["Survoltés", "Survoltées"],
  ["Masqués", "Masquées"],
  ["Givrés", "Givrées"],
  ["Déchaînés", "Déchaînées"],
  ["Affamés", "Affamées"],
  ["Futés", "Futées"],
  ["Volants", "Volantes"],
  ["Rugissants", "Rugissantes"],
  ["Pétillants", "Pétillantes"],
  ["Joyeux", "Joyeuses"],
  ["Intrépides", "Intrépides"],
  ["Cosmiques", "Cosmiques"],
  ["Atomiques", "Atomiques"],
  ["Galactiques", "Galactiques"],
  ["Légendaires", "Légendaires"],
  ["Rebelles", "Rebelles"],
  ["Sauvages", "Sauvages"],
  ["Turbo", "Turbo"],
  ["Fluo", "Fluo"],
  ["en Folie", "en Folie"],
];

const draw = <T>(list: T[], taken: Set<T>, random: () => number) => {
  const free = list.filter((x) => !taken.has(x));
  const pick = (free.length ? free : list)[Math.floor(random() * (free.length || list.length))];
  taken.add(pick);
  return pick;
};

/** `count` different funny names, none of those in `avoid` (the names already on screen). */
export function randomTeamNames(count: number, avoid: readonly string[] = [], random = Math.random) {
  const nouns = new Set(NOUNS.filter(([n]) => avoid.some((a) => a.includes(n))));
  const adjectives = new Set(
    ADJECTIVES.filter(([m, f]) => avoid.some((a) => a.endsWith(m) || a.endsWith(f))),
  );
  return Array.from({ length: count }, () => {
    const [noun, gender] = draw(NOUNS, nouns, random);
    const [m, f] = draw(ADJECTIVES, adjectives, random);
    return `Les ${noun} ${gender === "m" ? m : f}`;
  });
}

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
export function teamStandings(
  count: number,
  members: Member[],
  previous = false,
  names: readonly string[] = [],
): TeamStanding[] {
  const groups = Array.from({ length: count }, (_, i) => members.filter((m) => m.team === i));
  const scores = groups.map((g) => average(g.map((m) => m.score)));
  const before = groups.map((g) => average(g.map((m) => m.priorScore ?? 0)));
  const now = ranks(scores);
  const then = ranks(before);
  return groups
    .map((g, index) => ({
      index,
      name: teamName(index, names),
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
