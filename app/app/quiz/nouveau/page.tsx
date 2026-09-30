import type { Metadata } from "next";
import { EditorPage } from "@/components/squizz/editor-page";
import { pageUser } from "@/lib/server/guard";

export const metadata: Metadata = { title: "Nouveau quiz" };

export default async function NewQuizPage() {
  const user = await pageUser();
  return <EditorPage userId={user.id} />;
}
