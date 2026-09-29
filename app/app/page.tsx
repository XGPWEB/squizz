import type { Metadata } from "next";
import { pageUser } from "@/lib/server/guard";
import { prisma } from "@/lib/prisma";
import { demos } from "@/lib/quizzes";
import { planLimits } from "@/lib/plans";
import { listQuizzes } from "@/lib/server/quiz-store";
import { Library } from "./library";

export const metadata: Metadata = { title: "Mes quiz" };

export default async function AppHome({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const user = await pageUser();
  const member = user as typeof user & {
    organizationId: string;
    organization: NonNullable<typeof user.organization>;
  };
  const quizzes = await listQuizzes(member);
  const limits = planLimits(member.organization.plan);
  const count = await prisma.quiz.count({ where: { organizationId: member.organizationId } });
  const { ok } = await searchParams;
  return (
    <Library
      quizzes={quizzes}
      demos={demos}
      firstName={user.name.split(" ")[0]}
      quota={{ used: count, max: limits.maxQuizzes, players: limits.maxPlayersPerGame }}
      notice={ok === "cree" ? "created" : ok === "modifie" ? "updated" : ""}
    />
  );
}
