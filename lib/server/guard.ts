import "server-only";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Organization, UserRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail } from "./http";
import { readViewToken, VIEW_COOKIE } from "./view-as";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  /** Effective role: ORG_ADMIN while a super-admin is viewing an organisation. */
  role: UserRole;
  /** The role stored in the database; super-admin checks always use this one. */
  realRole: UserRole;
  organizationId: string | null;
  organization: Organization | null;
  /** Set while a super-admin is viewing an organisation as its administrator. */
  viewingAs: boolean;
};

/**
 * The signed-in user, read fresh from the database so role and organisation changes apply immediately.
 * A super-admin with a valid "view as" cookie gets the viewed organisation and the ORG_ADMIN role.
 */
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
  const base = { ...user, realRole: user.role, viewingAs: false };
  if (user.role !== "SUPER_ADMIN") return base;
  const view = readViewToken((await cookies()).get(VIEW_COOKIE)?.value, user.id);
  if (!view) return base;
  const organization = await prisma.organization.findUnique({ where: { id: view.organizationId } });
  if (!organization) return base;
  return { ...base, role: "ORG_ADMIN", organizationId: organization.id, organization, viewingAs: true };
}

const blocked = (u: SessionUser) => u.realRole !== "SUPER_ADMIN" && u.organization?.status !== "ACTIVE";

/** For API routes: a member of an active organisation (or a super-admin viewing one). */
export async function requireMember(): Promise<
  SessionUser & { organizationId: string; organization: Organization }
> {
  const user = await getSessionUser();
  if (!user) fail("Connectez-vous pour continuer.", 401);
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
  if (!user) fail("Connectez-vous pour continuer.", 401);
  if (user.realRole !== "SUPER_ADMIN") fail("Réservé au super-administrateur.", 403);
  return user;
}

/** For pages: redirects instead of throwing. */
export async function pageUser(options: { admin?: boolean; superAdmin?: boolean } = {}) {
  const user = await getSessionUser();
  if (!user) redirect("/connexion");
  if (options.superAdmin && user.realRole !== "SUPER_ADMIN") redirect("/app");
  if (!options.superAdmin && user.role === "SUPER_ADMIN" && !user.organizationId) redirect("/admin");
  if (blocked(user)) redirect("/connexion?suspendu=1");
  if (options.admin && user.role === "HOST") redirect("/app");
  return user;
}
