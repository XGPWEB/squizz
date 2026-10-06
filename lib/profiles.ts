import { isScored, type AnswerPayload, type Question } from "./question";

/**
 * A « quiz à profils » draws the portrait of a group instead of ranking people: each answer of a poll can
 * point to a profile (« Directif », « Participatif »…). The profile of the group is the one the answers of
 * everybody point to most often; nobody gets a profile of their own. The quiz is a profile quiz as soon as
 * one answer names a profile; it then has no scored question, no points and no ranking.
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
  /** Answers of the whole group that point to this profile. */
  votes: number;
  percent: number;
};

/**
 * The outcome of a profile quiz: how the answers of the whole group spread over the profiles. Answers are
 * counted together, never per person. `voters` is how many people gave at least one answer that counts.
 */
export function profileResults(questions: Question[], answers: ProfileAnswer[]) {
  const names = quizProfiles(questions);
  const votes = names.map(() => 0);
  const voters = new Set<string>();
  for (const a of answers) {
    const q = questions[a.question];
    if (q?.type !== "poll") continue;
    for (const choice of a.payload.choices ?? []) {
      const at = names.indexOf(clean(q.profiles?.[choice]));
      if (at < 0) continue;
      votes[at]++;
      voters.add(a.player);
    }
  }
  const total = votes.reduce((a, b) => a + b, 0);
  const shares: ProfileShare[] = names.map((name, i) => ({
    name,
    votes: votes[i],
    percent: total ? Math.round((100 * votes[i]) / total) : 0,
  }));
  return { shares, total, voters: voters.size };
}

/** The profiles in the lead (several when tied), none while no answer counts. */
export function leadingProfiles(shares: ProfileShare[]) {
  const top = Math.max(0, ...shares.map((s) => s.votes));
  return top ? shares.filter((s) => s.votes === top).map((s) => s.name) : [];
}
