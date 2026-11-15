import type { Metadata } from "next";
import { DemoPlay } from "@/components/squizz/demo-play";

export const metadata: Metadata = {
  title: "Démo jouable",
  description:
    "Essayez SQuizz sans inscription : cinq questions, la correction, le classement et le podium, contre des joueurs fictifs.",
  alternates: { canonical: "/demo" },
};

/** The public demo: everything happens in the browser (lib/demo-game.ts), nothing is stored. */
export default function DemoPage() {
  return <DemoPlay />;
}
