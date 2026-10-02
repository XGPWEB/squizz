import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, json, passwordSchema } from "@/lib/server/api";
import { newPasswordData, warnPasswordChanged } from "@/lib/server/accounts";
import { hashPassword } from "@/lib/server/passwords";
import { hashToken } from "@/lib/server/tokens";
import { fail } from "@/lib/server/http";

export const POST = route(async (req) => {
  const input = await json(req, z.object({ token: z.string().min(10), password: passwordSchema }));
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(input.token) } });
  if (!row || row.usedAt || row.expiresAt < new Date())
    fail("Ce lien n’est plus valable. Refaites une demande.", 404);
  // Hashed before the transaction (slow on purpose), so the transaction only writes.
  const passwordHash = await hashPassword(input.password);
  // The link is used up and the password changed together: if the password cannot be written, the link
  // still works. Claiming it first inside the transaction keeps the same link from being replayed.
  const user = await prisma.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (!claimed.count) fail("Ce lien a déjà été utilisé.", 409);
    // The reset link reached this mailbox: an unconfirmed address is now confirmed.
    await tx.user.updateMany({
      where: { id: row.userId, emailVerifiedAt: null },
      data: { emailVerifiedAt: new Date() },
    });
    return tx.user.update({ where: { id: row.userId }, data: newPasswordData(passwordHash) });
  });
  warnPasswordChanged(user);
  return { email: user.email, superAdmin: user.role === "SUPER_ADMIN" };
});
