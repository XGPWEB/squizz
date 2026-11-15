"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, FlaskConical, RotateCcw, Sparkles, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { isScored, publicQuestion, type AnswerPayload } from "@/lib/question";
import {
  DEMO_BOTS,
  DEMO_PLAYER,
  DEMO_STEPS,
  botAnswers,
  demoAggregate,
  demoName,
  demoRanking,
  prepareDemoStep,
  scoreDemoAnswer,
  type DemoAnswer,
} from "@/lib/demo-game";
import { GameMark, Leaderboard, Podium } from "./game-parts";
import { QuestionPlay, QuestionResults } from "./question-play";
import { VoiceProvider } from "./voice";

type Phase = "intro" | "question" | "reveal" | "final";

/**
 * The public demo: a short game played alone, in the browser, against fictional players (lib/demo-game.ts).
 * The player's screen is the real one (QuestionPlay, QuestionResults, Leaderboard, Podium); nothing is sent
 * to the server. Addressed as « vous »: the visitor is discovering SQuizz as a future organiser.
 */
export function DemoPlay() {
  const steps = useMemo(() => DEMO_STEPS.map(prepareDemoStep), []);
  const [phase, setPhase] = useState<Phase>("intro"),
    [index, setIndex] = useState(0),
    [name, setName] = useState(""),
    [untimed, setUntimed] = useState(false),
    [startedAt, setStartedAt] = useState(0),
    [now, setNow] = useState(0),
    [mine, setMine] = useState<DemoAnswer | null>(null),
    [history, setHistory] = useState<DemoAnswer[][]>([]),
    [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  // The step whose correction is shown: an answer and the end of the clock can never both reveal it.
  const shown = useRef(-1);
  const q = steps[index];
  const player = demoName(name);
  const left = phase === "question" ? Math.max(0, q.duration * 1000 - (now - startedAt)) : 0;

  // Each new screen takes the focus, so keyboard and screen reader users start reading at its title.
  useEffect(() => {
    if (phase !== "intro") heading.current?.focus();
  }, [phase, index]);

  function start(at: number) {
    const t = Date.now();
    setIndex(at);
    setMine(null);
    setError("");
    setStartedAt(t);
    setNow(t);
    shown.current = -1;
    setPhase("question");
  }
  function reveal(answer: DemoAnswer | null) {
    if (shown.current === index) return;
    shown.current = index;
    setHistory((h) => {
      const next = h.slice(0, index);
      next[index] = [...(answer ? [answer] : []), ...botAnswers(q, index)];
      return next;
    });
    setPhase("reveal");
  }
  function answer(payload: AnswerPayload) {
    try {
      const scored = scoreDemoAnswer(q, payload, Date.now() - startedAt);
      const entry = { player: DEMO_PLAYER, ...scored };
      setMine(entry);
      // The fictional players have all answered: the correction comes at once, as when a host closes early.
      reveal(entry);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  // The clock of the question; time up with no answer shows the correction, as in a live game.
  useEffect(() => {
    if (phase !== "question") return;
    const tick = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (!untimed && t - startedAt >= q.duration * 1000) reveal(null);
    }, 250);
    return () => clearInterval(tick);
    // `reveal` and `q` follow `index`, which changes with `startedAt`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, startedAt, untimed]);

  const ranking = history[index] ? demoRanking(history, index, player) : [];
  const me = ranking.find((p) => p.me);
  const last = index + 1 >= steps.length;
  const scoredCount = steps.filter((s) => isScored(s.type)).length;

  return (
    <VoiceProvider theme="sober">
      <div className="game-theme theme-squizz demo-shell">
        <div className="play-top">
          <GameMark brand={undefined} href="/" />
        </div>
        <aside className="demo-banner" aria-label="Mode démonstration">
          <span className="sticker pink-sticker">
            <FlaskConical size={16} aria-hidden /> MODE DÉMO
          </span>
          <p>Contre {DEMO_BOTS.length} joueurs fictifs. Rien n’est enregistré.</p>
          <Link href="/" className="text-button">
            Quitter la démo
          </Link>
        </aside>

        {phase === "intro" && (
          <section className="panel game-panel demo-intro" aria-labelledby="demo-title">
            <p className="eyebrow">{steps.length} QUESTIONS · 2 MIN</p>
            <h1 id="demo-title">Objectif Lune… et au-delà</h1>
            <p className="lead">
              Vous jouez côté joueur. En vrai, la question s’affiche sur grand écran et chacun répond sur son
              téléphone.
            </p>
            <form
              method="post"
              className="response-form"
              onSubmit={(e) => {
                e.preventDefault();
                setHistory([]);
                start(0);
              }}
            >
              <label>
                Pseudo (facultatif)
                <input
                  value={name}
                  maxLength={24}
                  autoComplete="nickname"
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex. Capitaine Curieux"
                />
              </label>
              <label className="demo-check">
                <Checkbox checked={untimed} onCheckedChange={(v) => setUntimed(v === true)} />
                Sans chrono (la rapidité compte quand même)
              </label>
              <button className="button">
                Lancer la démo <ArrowRight size={18} aria-hidden />
              </button>
            </form>
          </section>
        )}

        {(phase === "question" || phase === "reveal") && (
          <section className="panel game-panel" aria-labelledby="demo-step">
            <div className="row spaced">
              <span>
                Question {index + 1} / {steps.length}
              </span>
              <span className="timer">
                {phase === "reveal" ? "Terminé" : untimed ? "Sans chrono" : `${Math.ceil(left / 1000)} s`}
              </span>
            </div>
            {!untimed && (
              <Progress
                value={phase === "reveal" ? 0 : (left / (q.duration * 1000)) * 100}
                className="question-progress"
                aria-label="Temps restant"
              />
            )}
            {phase === "reveal" && (
              <div
                className={`personal-result ${mine?.correct === false || !mine ? "missed" : "won"}`}
                role="status"
              >
                <div>
                  <p className="eyebrow">VOTRE RÉSULTAT</p>
                  <p className="demo-result-title">
                    {!mine
                      ? "Temps écoulé."
                      : mine.correct === null
                        ? "Réponse notée !"
                        : mine.correct
                          ? "Bien joué !"
                          : "Raté !"}
                  </p>
                  <p>
                    +{mine?.points ?? 0} points · {(me?.score ?? 0).toLocaleString("fr-FR")} au total
                    {me && ` · ${me.rank}${me.rank === 1 ? "er" : "e"} sur ${ranking.length}`}
                  </p>
                </div>
              </div>
            )}
            <h2 className="question-title" id="demo-step" ref={heading} tabIndex={-1}>
              {q.text}
            </h2>
            <QuestionPlay
              key={index}
              question={publicQuestion(q, phase === "reveal", index, false)}
              revealed={phase === "reveal"}
              disabled={phase !== "question"}
              submitted={mine?.payload ?? null}
              onSubmit={answer}
            />
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {phase === "reveal" && history[index] && (
              <>
                <QuestionResults
                  question={publicQuestion(q, true, index, false)}
                  aggregate={demoAggregate(q, history[index])}
                  players={DEMO_BOTS.length + 1}
                />
                <section className="demo-ranking" aria-labelledby="demo-ranking-title">
                  <h3 id="demo-ranking-title">Classement</h3>
                  <Leaderboard players={ranking} />
                </section>
                <button
                  className="button solo-next"
                  onClick={() => (last ? setPhase("final") : start(index + 1))}
                >
                  {last ? "Voir le podium" : "Question suivante"} <ArrowRight size={18} aria-hidden />
                </button>
              </>
            )}
          </section>
        )}

        {phase === "final" && (
          <section className="panel game-panel final-panel center" aria-labelledby="demo-final">
            <span className="sticker pink-sticker">FIN DE LA DÉMO</span>
            <h2 id="demo-final" ref={heading} tabIndex={-1}>
              {me?.rank === 1 ? "Victoire !" : "Bien joué !"}
            </h2>
            {/* The fictional players are crossed out one by one with a marker: only you remain. */}
            <div className="demo-podium">
              <Podium players={ranking} />
            </div>
            <div className="solo-result">
              <Trophy aria-hidden />
              <strong>{(me?.score ?? 0).toLocaleString("fr-FR")} points</strong>
              <span>
                {me?.correctCount ?? 0} / {scoredCount} bonne{(me?.correctCount ?? 0) > 1 ? "s" : ""} réponse
                {(me?.correctCount ?? 0) > 1 ? "s" : ""} · {me?.rank}
                {me?.rank === 1 ? "er" : "e"} sur {ranking.length}
              </span>
            </div>
            <div className="demo-next">
              <p className="demo-next-line">Place à vos vrais joueurs.</p>
              <div className="row demo-actions">
                <Link className="button" href="/inscription" data-conversion="signup_cta_click">
                  <Sparkles size={18} aria-hidden /> Créer mon espace gratuit
                </Link>
                <button
                  className="button secondary"
                  onClick={() => {
                    setHistory([]);
                    start(0);
                  }}
                >
                  <RotateCcw size={18} aria-hidden /> Rejouer
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </VoiceProvider>
  );
}
