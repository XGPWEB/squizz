import "server-only";
import bcrypt from "bcryptjs";
import type { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { orgLimits } from "@/lib/plans";
import { withOrgLock } from "./org-lock";
import { fail } from "./http";
import { hashToken, newToken } from "./tokens";
import { appUrl, sendMail } from "./mail";
import { invitationEmail, passwordChangedEmail, resetEmail, verifyEmail } from "./email-templates";

export const hashPassword = (password: string) => bcrypt.hash(password, 12);

export async function assertEmailFree(email: string) {
  if (await prisma.user.findUnique({ where: { email } }))
    fail("Un compte existe déjà avec cette adresse email.", 409);
}

/**
 * Members plus pending invitations, checked against the plan's member cap. Call it inside `withOrgLock`.
 * `replacingEmail`: a new invitation to that address replaces the pending one, so it does not count.
 */
export async function assertSeatAvailable(
  organizationId: string,
  db: Prisma.TransactionClient = prisma,
  replacingEmail?: string,
) {
  const org = await db.organization.findUniqueOrThrow({ where: { id: organizationId } });
  const { maxMembers } = orgLimits(org);
  if (maxMembers === null) return;
  const [members, pending] = await Promise.all([
    db.user.count({ where: { organizationId, active: true } }),
    db.invitation.count({
      where: {
        organizationId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
        ...(replacingEmail && { email: { not: replacingEmail } }),
      },
    }),
  ]);
  if (members + pending >= maxMembers)
    fail(
      `Votre offre permet ${maxMembers} membre${maxMembers > 1 ? "s" : ""}. Passez à une offre supérieure (page Tarifs) pour inviter plus d’animateurs.`,
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
  const { token, tokenHash } = newToken();
  const invitation = await withOrgLock(organizationId, async (tx) => {
    await assertSeatAvailable(organizationId, tx, email);
    // A new invitation replaces any earlier pending one for the same address.
    await tx.invitation.deleteMany({ where: { organizationId, email, acceptedAt: null } });
    return tx.invitation.create({
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

export const VERIFY_HOURS = 24;

/**
 * Sends a new email-confirmation link (24 hours, single use; earlier unused links stop working). `next` is
 * the page to open after signing in (e.g. the chosen plan). Returns the link only when no email could be
 * sent in development, so local tests can follow it; never in production.
 */
export async function sendEmailVerification(
  user: { id: string; name: string; email: string },
  next?: string,
) {
  const { token, tokenHash } = newToken();
  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    prisma.emailVerificationToken.create({
      data: { tokenHash, userId: user.id, expiresAt: new Date(Date.now() + VERIFY_HOURS * 3600_000) },
    }),
  ]);
  const link = `${appUrl()}/verifier-email/${token}${next ? `?suite=${encodeURIComponent(next)}` : ""}`;
  const sent = await sendMail(user.email, verifyEmail({ name: user.name, link, hours: VERIFY_HOURS }));
  return { devLink: !sent && process.env.NODE_ENV !== "production" ? link : undefined };
}
