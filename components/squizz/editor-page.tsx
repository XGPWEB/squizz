"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { X } from "lucide-react";
import { QuizEditor } from "@/components/squizz/editor";
import { newQuestion, type Question } from "@/lib/question";
import { gameApi } from "@/lib/client/api";

/** Creates a quiz, or edits one when `quiz` is given, then returns to the library. */
export function EditorPage({ quiz }: { quiz?: { id: string; title: string; questions: Question[] } }) {
  const router = useRouter();
  const [title, setTitle] = useState(quiz?.title ?? ""),
    [questions, setQuestions] = useState<Question[]>(
      quiz ? structuredClone(quiz.questions) : [newQuestion()],
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (quiz) await gameApi("update", { quizId: quiz.id, quiz: { title, questions } });
      else await gameApi("save", { quiz: { title, questions } });
      router.push(`/app?ok=${quiz ? "modifie" : "cree"}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <>
      {error && (
        <div className="error" role="alert">
          {error}{" "}
          <button className="text-button" onClick={() => setError("")} aria-label="Fermer le message">
            <X size={16} />
          </button>
        </div>
      )}
      <QuizEditor
        title={title}
        questions={questions}
        setTitle={setTitle}
        setQuestions={setQuestions}
        busy={busy}
        setBusy={setBusy}
        onError={setError}
        onSave={save}
        editing={!!quiz}
      />
    </>
  );
}
