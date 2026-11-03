"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { asksNothing, type Aggregate, type AnswerPayload, type PublicQuestion } from "@/lib/question";
import type { Brand } from "@/lib/brand";
import { postJson, UncertainError } from "@/lib/client/api";
import { GameMark } from "./game-parts";
import { Explanation, QuestionPlay, QuestionResults } from "./question-play";
import { sayFor, VoiceProvider } from "./voice";

type Base = {
  title: string;
  brand: Brand;
  total: number;
  totalScored: number;
  open: boolean;
  expiresAt: string;
};
type State =
  | (Base & { phase: "join" })
  | (Base & {
      phase: "finished";
      name: string;
      score: number;
      correct: number;
      rank: number;
      players: number;
    })
  | (Base & {
      phase: "question";
      name: string;
      index: number;
      score: number;
      duration: number;
      remaining: number;
      revealed: boolean;
      question: PublicQuestion;
      myAnswer: { answer: AnswerPayload; points: number; outcome: string } | null;
      timedOut: boolean;
      aggregate: Aggregate | null;
    });

/** A quiz played alone, at one's own pace, through a link (lib/server/solo.ts). */
export function SoloPlay({ id }: { id: string }) {
  const [state, setState] = useState<State | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [name, setName] = useState(""),
    [receivedAt, setReceivedAt] = useState(0),
    [now, setNow] = useState(0);
  const calling = useRef(false);

  async function call(action: string, data: Record<string, unknown> = {}) {
    if (calling.current) return;
    calling.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await postJson<State>("/api/solo", { action, id, ...data });
      setState(next);
      setReceivedAt(Date.now());
    } catch (e) {
      // Read once after a failed action, never recursively after a failed state request.
      let recovered = false;
      if (action !== "state") {
        try {
          const fresh = await postJson<State>("/api/solo", { action: "state", id });
          setState(fresh);
          setReceivedAt(Date.now());
          recovered =
            action === "join"
              ? fresh.phase !== "join"
              : fresh.phase === "finished" ||
                (fresh.phase === "question" &&
                  (fresh.index !== data.question || (action === "answer" && !!fresh.myAnswer)));
        } catch {
          // The retry button remains available even when both requests fail.
        }
      }
      if (!(e instanceof UncertainError) || !recovered) setError((e as Error).message);
    } finally {
      calling.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    const initial = setTimeout(() => void call("state"), 0);
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => {
      clearTimeout(initial);
      clearInterval(tick);
    };
    // Once, when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = state?.phase === "question" ? state : null;
  const left = q ? Math.max(0, q.remaining - Math.max(0, now - receivedAt)) : 0;
  // The time is up on this phone: the server confirms and shows the correction.
  useEffect(() => {
    if (!q || q.revealed || left !== 0 || !receivedAt || busy || error) return;
    // During the server's network grace period, zero seconds need not mean revealed yet.
    const timer = setTimeout(() => void call("state"), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left === 0, q?.index, q?.revealed, receivedAt, busy, error]);

  const brand = state?.brand;
  const say = sayFor(brand?.theme);
  return (
    <VoiceProvider theme={brand?.theme}>
      <div
        className={`game-theme theme-${brand?.theme ?? "squizz"}`}
        style={brand ? ({ "--brand": brand.accent } as React.CSSProperties) : undefined}
      >
        <div className="play-top">
          <GameMark brand={brand} href={null} />
        </div>
        {error && (
          <div className="error" role="alert">
            {error}{" "}
            <button className="text-button" disabled={busy} onClick={() => call("state")}>
              Réessayer
            </button>
          </div>
        )}
        {!state && !error && (
          <div className="panel center" role="status">
            Chargement du quiz…
          </div>
        )}
        {state?.phase === "join" && (
          <section className="panel game-panel solo-join">
            <p className="eyebrow">QUIZ EN AUTONOMIE</p>
            <h1>{state.title}</h1>
            {state.open ? (
              <>
                <p className="lead">
                  {state.total} étape{state.total > 1 ? "s" : ""}, {say("à ton rythme", "à votre rythme")} :
                  chaque question a son chrono, la correction s’affiche aussitôt.
                </p>
                <form
                  method="post"
                  className="response-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void call("join", { name });
                  }}
                >
                  <label>
                    {say("Ton pseudo", "Votre pseudo")}
                    <input
                      value={name}
                      maxLength={24}
                      required
                      autoComplete="nickname"
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex. Capitaine Curieux"
                    />
                  </label>
                  <button className="button" disabled={busy || !name.trim()}>
                    C’est parti <ArrowRight size={18} />
                  </button>
                </form>
                <p className="hint play-privacy">
                  {say(
                    "SQuizz retient ton pseudo et tes réponses",
                    "SQuizz retient votre pseudo et vos réponses",
                  )}{" "}
                  jusqu’à la fermeture de ce lien ; les résultats sont gardés 12 mois au plus pour
                  l’organisation qui l’a créé.
                </p>
              </>
            ) : (
              <p className="lead">Ce quiz est fermé : il ne peut plus être joué.</p>
            )}
          </section>
        )}
        {q && (
          <section className="panel game-panel">
            <div className="row spaced">
              <span>
                {asksNothing(q.question.type) ? "Étape" : "Question"} {q.index + 1} / {q.total}
              </span>
              <span className="timer">
                {asksNothing(q.question.type)
                  ? "Diapo"
                  : q.revealed
                    ? "Terminé"
                    : `${Math.ceil(left / 1000)} s`}
              </span>
            </div>
            <Progress
              value={q.revealed ? 0 : (left / (q.duration * 1000)) * 100}
              className="question-progress"
              aria-label="Temps restant"
            />
            {q.revealed && !asksNothing(q.question.type) && (
              <div
                className={`personal-result ${q.myAnswer?.outcome === "incorrect" || !q.myAnswer ? "missed" : "won"}`}
                role="status"
              >
                <div>
                  <p className="eyebrow">{say("TON RÉSULTAT", "VOTRE RÉSULTAT")}</p>
                  <h2>
                    {!q.myAnswer
                      ? say("Le chrono t’a devancé !", "Temps écoulé.")
                      : q.myAnswer.outcome === "correct"
                        ? "Bien joué !"
                        : q.myAnswer.outcome === "opinion"
                          ? say("Merci pour ta réponse !", "Merci pour votre réponse.")
                          : say("Raté… la suite est pour toi !", "Mauvaise réponse.")}
                  </h2>
                  <p>
                    +{q.myAnswer?.points ?? 0} points · {q.score.toLocaleString("fr-FR")} au total
                  </p>
                </div>
              </div>
            )}
            {q.question.type !== "slide" && <h2 className="question-title">{q.question.text}</h2>}
            <QuestionPlay
              key={q.index}
              question={q.question}
              revealed={q.revealed}
              disabled={busy || q.revealed || left === 0}
              submitted={q.myAnswer?.answer ?? null}
              onSubmit={(answer) => call("answer", { question: q.index, answer })}
            />
            {q.revealed && q.question.explanation && <Explanation text={q.question.explanation} />}
            {q.revealed && q.aggregate && <QuestionResults question={q.question} aggregate={q.aggregate} />}
            {q.revealed && (
              <button
                className="button solo-next"
                disabled={busy}
                onClick={() => call("next", { question: q.index })}
              >
                {q.index + 1 >= q.total ? "Voir mon résultat" : "Question suivante"} <ArrowRight size={18} />
              </button>
            )}
          </section>
        )}
        {state?.phase === "finished" && (
          <section className="panel game-panel final-panel center">
            <span className="sticker pink-sticker">
              {state.brand.theme === "sober" ? "TERMINÉ" : "BRAVO !"}
            </span>
            <h1>{state.title}</h1>
            <div className="solo-result">
              <Trophy aria-hidden />
              <strong>{state.score.toLocaleString("fr-FR")} points</strong>
              <span>
                {state.correct} / {state.totalScored} bonne{state.correct > 1 ? "s" : ""} réponse
                {state.correct > 1 ? "s" : ""}
              </span>
              <span>
                {state.players > 1
                  ? `${state.rank}${state.rank === 1 ? "er" : "e"} sur ${state.players} participants pour l’instant`
                  : say("Tu es le premier à terminer ce quiz !", "Vous êtes le premier à terminer ce quiz.")}
              </span>
            </div>
            <p className="hint">Merci d’avoir joué, {state.name}.</p>
          </section>
        )}
      </div>
    </VoiceProvider>
  );
}
