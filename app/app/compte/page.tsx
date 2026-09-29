import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { pageUser } from "@/lib/server/guard";
import { AccountForms } from "./account-forms";

export const metadata: Metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const user = await pageUser();
  // In "view as" mode this page would edit the super-admin's own account: send them to theirs.
  if (user.viewingAs) redirect("/admin/compte");
  return <AccountForms name={user.name} email={user.email} />;
}
