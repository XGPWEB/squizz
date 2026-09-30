import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, json, passwordSchema } from "@/lib/server/api";
import { setPassword } from "@/lib/server/accounts";
import { hashToken } from "@/lib/server/tokens";
import { fail } from "@/lib/server/http";

export const POST = route(async (req) => {
  const input = await json(req, z.object({ token: z.string().min(10), password: passwordSchema }));
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(input.token) } });
  if (!row || row.usedAt || row.expiresAt < new Date())
    fail("Ce lien n’est plus valable. Refaites une demande.", 404);
  // Mark used first so the same link cannot be replayed concurrently.
  const claimed = await prisma.passwordResetToken.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (!claimed.count) fail("Ce lien a déjà été utilisé.", 409);
  await setPassword(row.userId, input.password);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: row.userId } });
  return { email: user.email, superAdmin: user.role === "SUPER_ADMIN" };
});
