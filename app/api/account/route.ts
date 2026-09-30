import { rm } from "node:fs/promises";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, json } from "@/lib/server/api";
import { getSessionUser } from "@/lib/server/guard";
import { audit } from "@/lib/server/audit";
import { fail } from "@/lib/server/http";
import { mediaPath } from "@/lib/server/media-store";

/**
 * Deletes one's own account (right to erasure). The last administrator of an organisation with
 * other members must hand over the role first; if they are alone, the whole organisation goes.
 */
export const DELETE = route(async (req) => {
  const user = await getSessionUser();
  if (!user) fail("Connecte-toi pour continuer.", 401);
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
    const [otherAdmins, otherMembers] = await Promise.all([
      prisma.user.count({
        where: { organizationId: orgId, role: "ORG_ADMIN", active: true, id: { not: user.id } },
      }),
      prisma.user.count({ where: { organizationId: orgId, id: { not: user.id } } }),
    ]);
    if (!otherAdmins && otherMembers)
      fail(
        "Vous êtes le dernier administrateur : nommez d’abord un autre administrateur dans l’équipe.",
        409,
      );
    if (!otherMembers) {
      // Alone in the organisation: delete it with its quizzes, games and media files.
      const media = await prisma.media.findMany({ where: { organizationId: orgId }, select: { id: true } });
      await audit(user, "organization.self_delete", null, { id: orgId, name: user.organization?.name });
      await prisma.organization.delete({ where: { id: orgId } });
      await Promise.all(media.map((m) => rm(mediaPath(m.id), { force: true })));
      return { deleted: "organization" };
    }
  }
  await audit(user, "account.self_delete", orgId, { email: user.email });
  await prisma.user.delete({ where: { id: user.id } });
  return { deleted: "account" };
});
