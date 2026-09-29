import type { Metadata } from "next";
import { EditorPage } from "@/components/squizz/editor-page";

export const metadata: Metadata = { title: "Nouveau quiz" };

export default function NewQuizPage() {
  return <EditorPage />;
}
