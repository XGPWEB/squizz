import type { Metadata } from "next";
import type { Brand } from "@/lib/brand";
import { prisma } from "@/lib/prisma";
import { JoinForm } from "./join-form";

export const metadata: Metadata = {
  description: "Entrez le code de la partie affiché par votre animateur et choisissez un pseudo pour jouer.",
  alternates: { canonical: "/jouer" },
  title: "Rejoindre une partie",
};

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  const initialCode = /^\d{6}$/.test(code ?? "") ? code! : "";
  // Reached from the QR code or the invitation link, the page already knows the game: it takes its look
  // and its voice (« vous » in the sober theme). A code typed by hand only reveals them once in the game.
  const room = initialCode
    ? await prisma.room.findUnique({ where: { code: initialCode }, select: { brand: true } })
    : null;
  return <JoinForm initialCode={initialCode} brand={(room?.brand as Brand | null) ?? null} />;
}
