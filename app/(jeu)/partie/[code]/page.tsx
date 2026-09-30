import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GameView } from "@/components/squizz/game-view";

export const metadata: Metadata = { title: "Partie en cours", robots: { index: false } };

export default async function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^\d{6}$/.test(code)) notFound();
  return <GameView code={code} />;
}
