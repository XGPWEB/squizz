import { AppHeader } from "@/components/site/app-header";
import { pageUser } from "@/lib/server/guard";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await pageUser();
  return (
    <>
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>
      <AppHeader user={user} area="app" />
      <main id="contenu" tabIndex={-1}>
        {children}
      </main>
      <footer className="app-footer">SQuizz v{APP_VERSION}</footer>
    </>
  );
}
