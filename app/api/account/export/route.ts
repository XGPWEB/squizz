import { prisma } from "@/lib/prisma";
import { route } from "@/lib/server/api";
import { getSessionUser } from "@/lib/server/guard";
import { fail } from "@/lib/server/http";

/** Right of access and portability: the account and the quizzes the user created, as JSON. */
export const GET = route(async () => {
  const user = await getSessionUser();
  if (!user) fail("Connectez-vous pour continuer.", 401);
  const row = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      email: true,
      name: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
      organization: { select: { name: true, plan: true, createdAt: true } },
      quizzes: { select: { title: true, questions: true, createdAt: true, updatedAt: true } },
    },
  });
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify({ exportéLe: new Date().toISOString(), compte: row }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="squizz-mes-donnees-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
