import type { Metadata } from "next";
import { NotCountedInAudience } from "@/components/site/analytics";
import { AppHeader } from "@/components/site/app-header";
import { prisma } from "@/lib/prisma";
import { pageUser } from "@/lib/server/guard";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Super-admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await pageUser({ superAdmin: true });
  const pendingMessages = await prisma.contactMessage.count({ where: { handled: false } });
  return (
    <>
      <NotCountedInAudience />
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>
      <AppHeader user={user} area="admin" pendingMessages={pendingMessages} />
      <main id="contenu" tabIndex={-1}>
        {children}
      </main>
      <footer className="app-footer">SQuizz v{APP_VERSION}</footer>
    </>
  );
}
