import { AppHeader } from "@/components/site/app-header";
import { pageUser } from "@/lib/server/guard";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await pageUser({ superAdmin: true });
  return (
    <>
      <AppHeader user={user} area="admin" />
      <main>{children}</main>
    </>
  );
}
