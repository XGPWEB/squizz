import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, json, nameSchema, passwordSchema } from "@/lib/server/api";
import { assertEmailFree, findInvitation, hashPassword } from "@/lib/server/accounts";
import { sendMail } from "@/lib/server/mail";
import { memberJoinedEmail, memberWelcomeEmail } from "@/lib/server/email-templates";

export const GET = route<{ token: string }>(async (_, { token }) => {
  const inv = await findInvitation(token);
  return { email: inv.email, role: inv.role, organization: inv.organization.name };
});

/** Accepting creates the account inside the inviting organisation with the invited role. */
export const POST = route<{ token: string }>(async (req, { token }) => {
  const input = await json(req, z.object({ name: nameSchema, password: passwordSchema }));
  const inv = await findInvitation(token);
  await assertEmailFree(inv.email);
  const passwordHash = await hashPassword(input.password);
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.invitation.updateMany({
      where: { id: inv.id, acceptedAt: null },
      data: { acceptedAt: new Date() },
    });
    if (!claimed.count) throw new Error("Invitation déjà utilisée.");
    await tx.user.create({
      data: {
        email: inv.email,
        name: input.name,
        passwordHash,
        role: inv.role,
        organizationId: inv.organizationId,
      },
    });
  });
  const organization = inv.organization.name;
  void sendMail(inv.email, memberWelcomeEmail({ name: input.name, organization, role: inv.role }));
  const inviter = inv.invitedById
    ? await prisma.user.findFirst({ where: { id: inv.invitedById, active: true } })
    : null;
  if (inviter)
    void sendMail(
      inviter.email,
      memberJoinedEmail({ inviter: inviter.name, member: input.name, email: inv.email, organization }),
    );
  return { email: inv.email };
});
