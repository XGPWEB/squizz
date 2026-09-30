"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Pencil, Play, Plus, Sparkles, Trash2, Users, X } from "lucide-react";
import type { Quiz } from "@/lib/quizzes";
import type { OrgQuiz } from "@/lib/server/quiz-store";
import { gameApi } from "@/lib/client/api";

type Props = {
  quizzes: OrgQuiz[];
  demos: Quiz[];
  firstName: string;
  quota: { used: number; max: number | null; players: number };
  notice: "" | "created" | "updated";
};

export function Library({ quizzes, demos, firstName, quota, notice }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(
      notice === "created"
        ? "Votre quiz est enregistré. Il est prêt à jouer."
        : notice === "updated"
          ? "Vos modifications sont enregistrées."
          : "",
    );
  const full = quota.max !== null && quota.used >= quota.max;

  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const launch = (id: string) =>
    run(async () => {
      const { code } = await gameApi<{ code: string }>("create", { quizId: id });
      router.push(`/partie/${code}`);
    });
  const remove = (q: Quiz) => {
    if (!confirm(`Supprimer « ${q.title} » ? Cette action est définitive.`)) return;
    run(async () => {
      await gameApi("delete", { quizId: q.id });
      setMessage("Le quiz a été supprimé.");
      router.refresh();
    });
  };

  const card = (q: Quiz | OrgQuiz, own: boolean) => (
    <article className="quiz-card" key={q.id}>
      <div className={`card-art ${q.color}`}>
        <span aria-hidden="true">{q.symbol}</span>
        <span className="pill">{own ? "Votre équipe" : "SQuizz Originals"}</span>
      </div>
      <div className="card-content">
        <p className="eyebrow">
          {"createdBy" in q && q.createdBy ? `PAR ${q.createdBy.toUpperCase()}` : q.tag}
        </p>
        <h3>{q.title}</h3>
        <p>{q.desc}</p>
        <div className="card-bottom">
          <span>
            <Users size={15} /> {q.questions.length} question{q.questions.length > 1 ? "s" : ""} · ~
            {Math.ceil(q.questions.length * 0.5)} min
          </span>
          <span className="card-actions">
            {"canEdit" in q && q.canEdit && (
              <>
                <Link
                  aria-label={`Modifier ${q.title}`}
                  title="Modifier"
                  href={`/app/quiz/${q.id}`}
                  className="card-action"
                >
                  <Pencil size={16} />
                </Link>
                <button
                  disabled={busy}
                  aria-label={`Supprimer ${q.title}`}
                  title="Supprimer"
                  onClick={() => remove(q)}
                  className="card-action danger"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
            <button
              disabled={busy}
              aria-label={`Lancer ${q.title}`}
              title="Lancer une partie"
              onClick={() => launch(q.id)}
              className="play"
            >
              <Play size={18} fill="currentColor" />
            </button>
          </span>
        </div>
      </div>
    </article>
  );

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
      {message && (
        <div className="success" role="status">
          <Check size={18} /> {message}
        </div>
      )}
      <div className="dash-heading">
        <div>
          <p className="eyebrow">VOTRE BIBLIOTHÈQUE</p>
          <h1>Bonjour {firstName} !</h1>
          <p className="hint">
            {quota.max === null ? `${quota.used} quiz` : `${quota.used} / ${quota.max} quiz`} · jusqu’à{" "}
            {quota.players} joueurs par partie
          </p>
        </div>
        {full ? (
          <span className="info-box">Limite de quiz atteinte : supprimez-en un ou passez à l’offre Pro.</span>
        ) : (
          <Link className="button" href="/app/quiz/nouveau">
            <Plus size={18} /> Créer un quiz
          </Link>
        )}
      </div>
      <div className="section-heading">
        <h2>Les quiz de l’équipe</h2>
      </div>
      {quizzes.length ? (
        <div className="quiz-grid">{quizzes.map((q) => card(q, true))}</div>
      ) : (
        <div className="creator">
          <Sparkles />
          <div>
            <h3>Vos questions. Votre terrain de jeu.</h3>
            <p>Aucun quiz pour l’instant. Préparez le premier, ou lancez un SQuizz Original ci-dessous.</p>
          </div>
          {!full && (
            <Link className="button dark" href="/app/quiz/nouveau">
              <Plus size={18} /> Créer mon quiz
            </Link>
          )}
        </div>
      )}
      <div className="section-heading">
        <div>
          <p className="eyebrow">PRÊTS À LANCER</p>
          <h2>SQuizz Originals</h2>
        </div>
      </div>
      <div className="quiz-grid">{demos.map((q) => card(q, false))}</div>
    </>
  );
}
