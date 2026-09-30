import type { Metadata } from "next";
import { JoinForm } from "./join-form";

export const metadata: Metadata = {
  description: "Entrez le code de la partie affiché par votre animateur et choisissez un pseudo pour jouer.",
  alternates: { canonical: "/jouer" },
  title: "Rejoindre une partie",
};

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  return <JoinForm initialCode={/^\d{6}$/.test(code ?? "") ? code! : ""} />;
}
