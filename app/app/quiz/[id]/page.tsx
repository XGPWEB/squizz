import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { pageUser } from "@/lib/server/guard";
import { findQuiz, type OrgQuiz } from "@/lib/server/quiz-store";
import { isDemo, teammates } from "@/lib/server/quiz-store";
import { EditorPage } from "@/components/squizz/editor-page";

export const metadata: Metadata = { title: "Modifier le quiz" };

export default async function EditQuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const { id } = await params;
  const { ok } = await searchParams;
  if (isDemo(id)) redirect("/app");
  const user = await pageUser();
  const quiz = (await findQuiz(user as Parameters<typeof findQuiz>[0], id)) as OrgQuiz | null;
  if (!quiz) notFound();
  if (!quiz.canEdit) redirect("/app");
  return (
    <EditorPage
      userId={user.id}
      teammates={await teammates(user)}
      generated={ok === "ia"}
      quiz={{
        id: quiz.id,
        title: quiz.title,
        questions: quiz.questions,
        version: quiz.version,
        visibility: quiz.visibility,
        sharedWith: quiz.sharedWith,
        canManage: quiz.canManage,
        author: quiz.createdBy,
      }}
    />
  );
}
