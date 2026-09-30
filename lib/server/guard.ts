import "server-only";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Organization, UserRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail } from "./http";
import { readViewToken, VIEW_COOKIE } from "./view-as";
import { adminCookieName, readAdminToken } from "./admin-session";

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

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  organizationId: true,
  organization: true,
  active: true,
  sessionVersion: true,
} as const;

const toSessionUser = (u: {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string | null;
  organization: Organization | null;
}): SessionUser => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  realRole: u.role,
  organizationId: u.organizationId,
  organization: u.organization,
  viewingAs: false,
});

/**
 * The super-admin signed in to the super-admin space (its own cookie, see admin-session.ts),
 * re-read from the database: a password change, deactivation or role change ends the session.
 */
export async function getAdminUser(): Promise<SessionUser | null> {
  const token = await readAdminToken((await cookies()).get(adminCookieName())?.value);
  if (!token) return null;
  const user = await prisma.user.findUnique({ where: { id: token.id }, select: userSelect });
  if (!user || !user.active || user.role !== "SUPER_ADMIN" || user.sessionVersion !== token.sessionVersion)
    return null;
  return toSessionUser(user);
}

/**
 * The client signed in to the application (NextAuth session), read fresh from the database so role
 * and organisation changes apply immediately. While the super-admin views an organisation ("view
 * as" cookie + super-admin session), they act in it as its administrator, whoever else is signed in.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const viewCookie = (await cookies()).get(VIEW_COOKIE)?.value;
  if (viewCookie) {
    const admin = await getAdminUser();
    const view = admin && readViewToken(viewCookie, admin.id);
    const organization =
      view && (await prisma.organization.findUnique({ where: { id: view.organizationId } }));
    if (admin && organization)
      return { ...admin, role: "ORG_ADMIN", organizationId: organization.id, organization, viewingAs: true };
  }
  const session = await getServerSession(authOptions).catch(() => null);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: userSelect });
  // A super-admin never uses the client session (older sessions from before the split are ignored).
  if (!user || !user.active || user.role === "SUPER_ADMIN") return null;
  return toSessionUser(user);
}

/** Account routes serve both spaces: `?espace=super-admin` targets the super-admin's own account. */
export async function accountUser(req: Request) {
  return new URL(req.url).searchParams.get("espace") === "super-admin" ? getAdminUser() : getSessionUser();
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
  const user = await getAdminUser();
  if (!user) fail("Connectez-vous pour continuer.", 401);
  if (user.realRole !== "SUPER_ADMIN") fail("Réservé au super-administrateur.", 403);
  return user;
}

/** For pages: redirects instead of throwing. */
export async function pageUser(options: { admin?: boolean; superAdmin?: boolean } = {}) {
  if (options.superAdmin) {
    const admin = await getAdminUser();
    if (!admin) redirect("/super-admin/connexion");
    return admin;
  }
  const user = await getSessionUser();
  if (!user) redirect("/connexion");
  if (blocked(user)) redirect("/connexion?suspendu=1");
  if (options.admin && user.role === "HOST") redirect("/app");
  return user;
}
