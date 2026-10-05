import { isScored, type AnswerPayload, type Question } from "./question";

/**
 * A « quiz à profils » sorts people into categories instead of ranking them: each answer of a poll can
 * point to a profile (« Directif », « Participatif »…). A person's profile is the one their answers point
 * to most often. The quiz is a profile quiz as soon as one answer names a profile; it then has no scored
 * question, no points and no ranking.
 */
export const MAX_PROFILES = 6;
export const MAX_PROFILE_NAME = 40;

const clean = (name: unknown) => (typeof name === "string" ? name.trim() : "");

/** The profiles of a quiz, in the order they first appear. */
export function quizProfiles(questions: Pick<Question, "type" | "profiles">[]): string[] {
  const names: string[] = [];
  for (const q of questions)
    if (q.type === "poll")
      for (const raw of q.profiles ?? []) {
        const name = clean(raw);
        if (name && !names.includes(name)) names.push(name);
      }
  return names;
}

export const isProfileQuiz = (questions: Pick<Question, "type" | "profiles">[]) =>
  quizProfiles(questions).length > 0;

/** Checks what only makes sense for the whole quiz; throws a message for the person editing it. */
export function validateProfiles(questions: Question[]) {
  const names = quizProfiles(questions);
  if (!names.length) return;
  if (names.length < 2) throw new Error("Un quiz à profils a besoin d’au moins deux profils différents.");
  if (names.length > MAX_PROFILES)
    throw new Error(`Un quiz à profils est limité à ${MAX_PROFILES} profils (${names.length} ici).`);
  const scored = questions.findIndex((q) => isScored(q.type));
  if (scored >= 0)
    throw new Error(
      `Étape ${scored + 1} : un quiz à profils ne contient pas de question à points. Transformez-la en sondage ou supprimez-la.`,
    );
}

export type ProfileAnswer = { player: string; question: number; payload: AnswerPayload };
export type ProfileShare = {
  name: string;
  /** People whose answers point to this profile most often (a tie counts for each tied profile). */
  people: number;
  percent: number;
};
export type PersonalProfile = {
  /** The dominant profile; several names when the person's answers are tied. */
  names: string[];
  scores: { name: string; count: number; percent: number }[];
};

/** How many of one person's answers point to each profile. */
function tally(questions: Question[], names: string[], answers: ProfileAnswer[]) {
  const counts = names.map(() => 0);
  for (const a of answers) {
    const q = questions[a.question];
    if (q?.type !== "poll") continue;
    for (const choice of a.payload.choices ?? []) {
      const at = names.indexOf(clean(q.profiles?.[choice]));
      if (at >= 0) counts[at]++;
    }
  }
  return counts;
}

function personal(names: string[], counts: number[]): PersonalProfile | null {
  const total = counts.reduce((a, b) => a + b, 0);
  if (!total) return null;
  const top = Math.max(...counts);
  return {
    names: names.filter((_, i) => counts[i] === top),
    scores: names.map((name, i) => ({
      name,
      count: counts[i],
      percent: Math.round((100 * counts[i]) / total),
    })),
  };
}

/**
 * The outcome of a profile quiz: how the group spreads over the profiles, and the profile of `viewer`.
 * People who answered nothing that points to a profile are left out of the percentages.
 */
export function profileResults(questions: Question[], answers: ProfileAnswer[], viewer?: string) {
  const names = quizProfiles(questions);
  const byPlayer = new Map<string, ProfileAnswer[]>();
  for (const a of answers) byPlayer.set(a.player, [...(byPlayer.get(a.player) ?? []), a]);
  const people = names.map(() => 0);
  let profiled = 0,
    tied = 0,
    mine: PersonalProfile | null = null;
  for (const [player, own] of byPlayer) {
    const result = personal(names, tally(questions, names, own));
    if (player === viewer) mine = result;
    if (!result) continue;
    profiled++;
    if (result.names.length > 1) tied++;
    for (const name of result.names) people[names.indexOf(name)]++;
  }
  const shares: ProfileShare[] = names.map((name, i) => ({
    name,
    people: people[i],
    percent: profiled ? Math.round((100 * people[i]) / profiled) : 0,
  }));
  return { shares, profiled, tied, mine };
}
