import "server-only";
import bcrypt from "bcryptjs";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { planLimits } from "@/lib/plans";
import { fail } from "./http";
import { hashToken, newToken } from "./tokens";
import { appUrl, sendMail } from "./mail";
import { invitationEmail, passwordChangedEmail, resetEmail } from "./email-templates";

export const hashPassword = (password: string) => bcrypt.hash(password, 12);

export async function assertEmailFree(email: string) {
  if (await prisma.user.findUnique({ where: { email } }))
    fail("Un compte existe déjà avec cette adresse email.", 409);
}

/** Members plus pending invitations, checked against the plan's member cap. */
export async function assertSeatAvailable(organizationId: string) {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
  const { maxMembers } = planLimits(org.plan);
  if (maxMembers === null) return;
  const [members, pending] = await Promise.all([
    prisma.user.count({ where: { organizationId, active: true } }),
    prisma.invitation.count({ where: { organizationId, acceptedAt: null, expiresAt: { gt: new Date() } } }),
  ]);
  if (members + pending >= maxMembers)
    fail(
      `Votre offre permet ${maxMembers} membres. Passez à l’offre Pro pour inviter plus d’animateurs.`,
      403,
    );
}

const INVITE_DAYS = 7;

export async function createInvitation(
  organizationId: string,
  email: string,
  role: UserRole,
  invitedById: string | null,
  inviterName: string,
) {
  if (role === "SUPER_ADMIN") fail("Rôle invalide.");
  await assertEmailFree(email);
  await assertSeatAvailable(organizationId);
  // A new invitation replaces any earlier pending one for the same address.
  await prisma.invitation.deleteMany({ where: { organizationId, email, acceptedAt: null } });
  const { token, tokenHash } = newToken();
  const invitation = await prisma.invitation.create({
    data: {
      tokenHash,
      email,
      role,
      organizationId,
      invitedById,
      expiresAt: new Date(Date.now() + INVITE_DAYS * 86400_000),
    },
    include: { organization: true },
  });
  const link = `${appUrl()}/invitation/${token}`;
  const sent = await sendMail(
    email,
    invitationEmail({
      organization: invitation.organization.name,
      inviter: inviterName,
      role,
      link,
      days: INVITE_DAYS,
    }),
  );
  return { invitation, link, sent };
}

export async function findInvitation(token: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { organization: true },
  });
  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date())
    fail("Cette invitation n’est plus valable. Demandez-en une nouvelle.", 404);
  if (invitation.organization.status !== "ACTIVE") fail("Cette organisation est suspendue.", 403);
  return invitation;
}

const RESET_MINUTES = 60;

/** Always behaves the same whether or not the email exists, so it cannot be used to probe accounts. */
export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) return null;
  const link = await createResetLink(user.id);
  await sendMail(email, resetEmail({ name: user.name, link, minutes: RESET_MINUTES }));
  return link;
}

export async function createResetLink(userId: string) {
  await prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } });
  const { token, tokenHash } = newToken();
  await prisma.passwordResetToken.create({
    data: { tokenHash, userId, expiresAt: new Date(Date.now() + RESET_MINUTES * 60_000) },
  });
  return `${appUrl()}/reinitialiser/${token}`;
}

/** Sets a new password, revokes every open session of that user and warns them by email. */
export async function setPassword(userId: string, password: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(password),
      sessionVersion: { increment: 1 },
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });
  void sendMail(user.email, passwordChangedEmail({ name: user.name }));
}
