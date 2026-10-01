import { rm } from "node:fs/promises";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, json } from "@/lib/server/api";
import { accountUser } from "@/lib/server/guard";
import { audit } from "@/lib/server/audit";
import { fail } from "@/lib/server/http";
import { mediaPath } from "@/lib/server/media-store";
import { sendMail } from "@/lib/server/mail";
import { accountDeletedEmail } from "@/lib/server/email-templates";
import { stopBillingForDeletion } from "@/lib/server/billing";
import { assertAnotherAdmin } from "@/lib/server/members";
import { withOrgLock } from "@/lib/server/org-lock";

/**
 * Deletes one's own account (right to erasure). The last administrator of an organisation with
 * other members must hand over the role first; if they are alone, the whole organisation goes.
 */
export const DELETE = route(async (req) => {
  const user = await accountUser(req);
  if (!user) fail("Connectez-vous pour continuer.", 401);
  if (user.viewingAs || user.realRole === "SUPER_ADMIN")
    fail("Le compte super-admin ne peut pas être supprimé ici.", 403);
  const { password } = await json(
    req,
    z.object({ password: z.string().min(1, "Indiquez votre mot de passe.") }),
  );
  const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await bcrypt.compare(password, row.passwordHash))) fail("Mot de passe incorrect.", 403);

  const orgId = user.organizationId;
  if (orgId && user.role === "ORG_ADMIN") {
    // Decided inside the organisation lock, in the same transaction as what follows from it: two
    // administrators leaving at the same moment cannot both see the other one still in place.
    const outcome = await withOrgLock(orgId, async (tx) => {
      const others = await tx.user.count({ where: { organizationId: orgId, id: { not: user.id } } });
      if (others) {
        const me = await tx.user.findUnique({ where: { id: user.id } });
        if (me?.role === "ORG_ADMIN" && me.active) await assertAnotherAdmin(tx, orgId, user.id);
        await tx.user.delete({ where: { id: user.id } });
        return "account" as const;
      }
      // Alone: the whole organisation goes. Pending invitations are removed now, so nobody can join while
      // its subscription is being cancelled.
      await tx.invitation.deleteMany({ where: { organizationId: orgId } });
      return "organization" as const;
    });
    if (outcome === "account") {
      await audit(user, "account.self_delete", orgId, { email: user.email });
      void sendMail(row.email, accountDeletedEmail({ name: row.name }));
      return { deleted: "account" };
    }
    // Stripe first: if the subscription cannot be cancelled, nothing is deleted and the person can retry.
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    const { cancelled } = await stopBillingForDeletion(org);
    const media = await prisma.media.findMany({ where: { organizationId: orgId }, select: { id: true } });
    await audit(user, "organization.self_delete", null, { id: orgId, name: org.name, cancelled });
    await prisma.organization.delete({ where: { id: orgId } });
    await Promise.all(media.map((m) => rm(mediaPath(m.id), { force: true })));
    void sendMail(row.email, accountDeletedEmail({ name: row.name, organization: org.name }));
    return { deleted: "organization" };
  }
  await audit(user, "account.self_delete", orgId, { email: user.email });
  await prisma.user.delete({ where: { id: user.id } });
  void sendMail(row.email, accountDeletedEmail({ name: row.name }));
  return { deleted: "account" };
});
