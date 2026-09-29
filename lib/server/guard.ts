import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { Organization, UserRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail } from "./http";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string | null;
  organization: Organization | null;
};

/** The signed-in user, read fresh from the database so role and organisation changes apply immediately. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions).catch(() => null);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      organizationId: true,
      organization: true,
      active: true,
    },
  });
  if (!user || !user.active) return null;
  return user;
}

const blocked = (u: SessionUser) => u.role !== "SUPER_ADMIN" && u.organization?.status !== "ACTIVE";

/** For API routes: a member of an active organisation (or a super-admin). */
export async function requireMember(): Promise<
  SessionUser & { organizationId: string; organization: Organization }
> {
  const user = await getSessionUser();
  if (!user) fail("Connecte-toi pour continuer.", 401);
  if (blocked(user)) fail("Votre organisation est suspendue.", 403);
  if (!user.organizationId || !user.organization) fail("Aucune organisation associée à ce compte.", 403);
  return user as SessionUser & { organizationId: string; organization: Organization };
}

export async function requireOrgAdmin() {
  const user = await requireMember();
  if (user.role !== "ORG_ADMIN" && user.role !== "SUPER_ADMIN")
    fail("Réservé aux administrateurs de l’organisation.", 403);
  return user;
}

export async function requireSuperAdmin() {
  const user = await getSessionUser();
  if (!user) fail("Connecte-toi pour continuer.", 401);
  if (user.role !== "SUPER_ADMIN") fail("Réservé au super-administrateur.", 403);
  return user;
}

/** For pages: redirects instead of throwing. */
export async function pageUser(options: { admin?: boolean; superAdmin?: boolean } = {}) {
  const user = await getSessionUser();
  if (!user) redirect("/connexion");
  if (options.superAdmin && user.role !== "SUPER_ADMIN") redirect("/app");
  if (!options.superAdmin && user.role === "SUPER_ADMIN" && !user.organizationId) redirect("/admin");
  if (blocked(user)) redirect("/connexion?suspendu=1");
  if (options.admin && user.role === "HOST") redirect("/app");
  return user;
}
