import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SoloPlay } from "@/components/squizz/solo-play";

export const metadata: Metadata = { title: "Quiz en autonomie", robots: { index: false } };

export default async function SoloPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{8,20}$/.test(id)) notFound();
  return <SoloPlay id={id} />;
}
