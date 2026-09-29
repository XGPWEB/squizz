import type { Plan } from "@prisma/client";

export type PlanLimits = {
  label: string;
  /** Quizzes an organisation can keep; null means unlimited. */
  maxQuizzes: number | null;
  maxPlayersPerGame: number;
  maxMembers: number | null;
  mediaBytes: number;
};

const MB = 1024 * 1024;

export const PLANS: Record<Plan, PlanLimits> = {
  FREE: { label: "Gratuit", maxQuizzes: 5, maxPlayersPerGame: 20, maxMembers: 3, mediaBytes: 100 * MB },
  PRO: {
    label: "Pro",
    maxQuizzes: null,
    maxPlayersPerGame: 100,
    maxMembers: null,
    mediaBytes: 5 * 1024 * MB,
  },
};

export const planLimits = (plan: Plan) => PLANS[plan];
