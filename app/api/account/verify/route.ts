import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, json } from "@/lib/server/api";
import { hashToken } from "@/lib/server/tokens";
import { fail } from "@/lib/server/http";
import { sendMail } from "@/lib/server/mail";
import { welcomeEmail } from "@/lib/server/email-templates";

/** Confirms an address from the emailed link: single use, before it expires. Sent by the page, not by GET. */
export const POST = route(async (req) => {
  const { token } = await json(req, z.object({ token: z.string().min(10).max(200) }));
  const row = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { organization: true } } },
  });
  if (!row || row.expiresAt < new Date())
    fail("Ce lien n’est plus valable. Connectez-vous pour en recevoir un nouveau.", 404);
  if (row.usedAt) return { email: row.user.email, already: true };
  // Claimed atomically, so the same link cannot confirm twice in parallel.
  const claimed = await prisma.emailVerificationToken.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (!claimed.count) return { email: row.user.email, already: true };
  const first = !row.user.emailVerifiedAt;
  if (first) {
    await prisma.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: new Date() } });
    if (row.user.organization)
      void sendMail(
        row.user.email,
        welcomeEmail({ name: row.user.name, organization: row.user.organization.name }),
      );
  }
  return { email: row.user.email };
});
