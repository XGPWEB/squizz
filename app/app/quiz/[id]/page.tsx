import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { pageUser } from "@/lib/server/guard";
import { findQuiz, type OrgQuiz } from "@/lib/server/quiz-store";
import { isDemo } from "@/lib/server/quiz-store";
import { EditorPage } from "@/components/squizz/editor-page";

export const metadata: Metadata = { title: "Modifier le quiz" };

export default async function EditQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (isDemo(id)) redirect("/app");
  const user = await pageUser();
  const quiz = (await findQuiz(user as Parameters<typeof findQuiz>[0], id)) as OrgQuiz | null;
  if (!quiz) notFound();
  if (!quiz.canEdit) redirect("/app");
  return (
    <EditorPage
      userId={user.id}
      quiz={{ id: quiz.id, title: quiz.title, questions: quiz.questions, version: quiz.version }}
    />
  );
}
