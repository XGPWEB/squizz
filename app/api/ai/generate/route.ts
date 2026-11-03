import { prisma } from "@/lib/prisma";
import { route } from "@/lib/server/api";
import { generateQuiz } from "@/lib/server/ai";
import { requireMember } from "@/lib/server/guard";
import { fail, readBody } from "@/lib/server/http";

export const dynamic = "force-dynamic";
/** A long document can take the provider a couple of minutes. */
export const maxDuration = 180;

/** A draft quiz from a text or a PDF, with the organisation's own AI account (lib/server/ai.ts). */
export const POST = route(async (req) => {
  const user = await requireMember();
  const body = await readBody(req);
  const org = await prisma.organization.findUnique({ where: { id: user.organizationId } });
  if (!org) fail("Organisation introuvable.", 404);
  return generateQuiz(org, body);
});
