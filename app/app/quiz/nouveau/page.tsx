import type { Metadata } from "next";
import { EditorPage } from "@/components/squizz/editor-page";
import { pageUser } from "@/lib/server/guard";
import { teammates } from "@/lib/server/quiz-store";

export const metadata: Metadata = { title: "Nouveau quiz" };

export default async function NewQuizPage() {
  const user = await pageUser();
  return <EditorPage userId={user.id} teammates={await teammates(user)} />;
}
