import type { Metadata } from "next";
import { OrganizationDetail } from "./organization-detail";

export const metadata: Metadata = { title: "Organisation" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrganizationDetail id={id} />;
}
