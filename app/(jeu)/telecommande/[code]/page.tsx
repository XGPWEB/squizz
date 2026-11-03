import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RemoteControl } from "@/components/squizz/remote-control";

export const metadata: Metadata = { title: "Télécommande", robots: { index: false } };

export default async function RemotePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^\d{6}$/.test(code)) notFound();
  return <RemoteControl code={code} />;
}
