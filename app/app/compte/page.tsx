import type { Metadata } from "next";
import { pageUser } from "@/lib/server/guard";
import { AccountForms } from "./account-forms";

export const metadata: Metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const user = await pageUser();
  return <AccountForms name={user.name} email={user.email} />;
}
