import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { pageUser } from "@/lib/server/guard";
import { prisma } from "@/lib/prisma";
import { demos } from "@/lib/quizzes";
import { offerOf, orgLimits } from "@/lib/plans";
import { listQuizzes } from "@/lib/server/quiz-store";
import { finishedReportWhere, finishedRoomWhere } from "@/lib/first-game";
import { Library } from "./library";

export const metadata: Metadata = { title: "Mes quiz" };

export default async function AppHome({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const user = await pageUser();
  const member = user as typeof user & {
    organizationId: string;
    organization: NonNullable<typeof user.organization>;
  };
  // First visit after choosing an offer on the pricing page: straight to it (the page then forgets it).
  const wanted = offerOf(member.organization.wantedOffer);
  if (wanted && user.role === "ORG_ADMIN" && !user.viewingAs) redirect(`/app/abonnement?offre=${wanted}`);
  const quizzes = await listQuizzes(member);
  const limits = orgLimits(member.organization);
  const count = await prisma.quiz.count({ where: { organizationId: member.organizationId } });
  // The guide stays until a live game has been played to its end (lib/first-game.ts): a waiting room or a
  // game left halfway keeps it. Reports are kept 12 months, finished rooms for a day.
  const finished =
    (await prisma.gameReport.findFirst({
      where: finishedReportWhere(member.organizationId),
      select: { id: true },
    })) ??
    (await prisma.room.findFirst({
      where: finishedRoomWhere(member.organizationId),
      select: { code: true },
    }));
  const { ok } = await searchParams;
  return (
    <Library
      quizzes={quizzes}
      demos={demos}
      firstName={user.name.split(" ")[0]}
      quota={{ used: count, max: limits.maxQuizzes, players: limits.maxPlayersPerGame }}
      notice={ok === "cree" ? "created" : ok === "modifie" ? "updated" : ""}
      userId={user.id}
      firstGame={!finished}
    />
  );
}
