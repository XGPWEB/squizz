import type { Metadata } from "next";
import { pageUser } from "@/lib/server/guard";
import { AccountForms } from "@/app/app/compte/account-forms";

export const metadata: Metadata = { title: "Mon compte" };

export default async function AdminAccountPage() {
  const user = await pageUser({ superAdmin: true });
  return <AccountForms name={user.name} email={user.email} viewingAs={user.viewingAs} superAdmin />;
}
