import type { Metadata } from "next";
import { brandOf } from "@/lib/brand";
import { isPaid } from "@/lib/plans";
import { pageUser } from "@/lib/server/guard";
import { AppearanceManager } from "./appearance-manager";

export const metadata: Metadata = { title: "Apparence" };

export default async function AppearancePage() {
  const user = await pageUser({ admin: true });
  const org = user.organization!;
  const mayHideCredit =
    isPaid(org.plan) || org.partner || (!!org.eventPassUntil && org.eventPassUntil > new Date());
  return <AppearanceManager initial={brandOf(org)} organization={org.name} mayHideCredit={mayHideCredit} />;
}
