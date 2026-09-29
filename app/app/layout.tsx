import { AppHeader } from "@/components/site/app-header";
import { pageUser } from "@/lib/server/guard";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await pageUser();
  return (
    <>
      <AppHeader user={user} area="app" />
      <main>{children}</main>
    </>
  );
}
