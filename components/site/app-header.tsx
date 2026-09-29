import type { SessionUser } from "@/lib/server/guard";
import { PLANS } from "@/lib/plans";
import { Brand } from "./brand";
import { AppBar } from "./app-bar";
import { ViewAsBanner } from "./view-as-banner";

const roleLabel = { SUPER_ADMIN: "Super-admin", ORG_ADMIN: "Administrateur", HOST: "Animateur" } as const;

/** Header of the signed-in areas: the organisation dashboard and the super-admin. */
export function AppHeader({ user, area }: { user: SessionUser; area: "app" | "admin" }) {
  const org = area === "app" ? user.organization : null;
  return (
    <>
      {user.viewingAs && user.organization && (
        <ViewAsBanner organization={user.organization.name} organizationId={user.organization.id} />
      )}
      <header className="app-header">
        <Brand href={area === "admin" ? "/admin" : "/app"} />
        <AppBar
          area={area}
          name={user.name}
          email={user.email}
          roleLabel={user.viewingAs ? "Super-admin · vue administrateur" : roleLabel[user.realRole]}
          organization={org?.name ?? (area === "admin" ? "Super-admin" : null)}
          plan={org ? { label: PLANS[org.plan].label, pro: org.plan === "PRO" } : null}
          canTeam={user.role !== "HOST"}
          isSuperAdmin={user.realRole === "SUPER_ADMIN"}
          viewingAs={user.viewingAs}
        />
      </header>
    </>
  );
}
