"use client";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Copy, Play, Smartphone, Timer, X } from "lucide-react";
import type { Quiz } from "@/lib/quizzes";
import { estimateLabel } from "@/lib/quiz-duration";
import { LaunchDialog, type LaunchChoice } from "./launch-dialog";

/** The examples the guide suggests first: short, and played without writing anything. */
export const FIRST_STEPS_PICKS = ["modele-reunion", "espace", "modele-formation"];

const KEY = "squizz:first-steps-hidden:";
const EVENT = "squizz-first-steps";
function readHidden(userId: string) {
  try {
    return localStorage.getItem(KEY + userId) === "1";
  } catch {
    return false;
  }
}
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

/**
 * The library's first-visit guide: pick an example, launch it as it is or customise a copy, then join with
 * a phone. Shown until the organisation has played a game (the page checks), or until the person hides it
 * (kept in this browser, per account). It creates nothing by itself and marks no step as done: every action
 * is one of the library's own buttons, with the same rules (the copy counts in the quota, a launch does not).
 */
export function FirstSteps({
  userId,
  examples,
  full,
  maxQuizzes,
  busy,
  onLaunch,
  onCopy,
}: {
  userId: string;
  examples: Quiz[];
  full: boolean;
  maxQuizzes: number | null;
  busy: boolean;
  onLaunch: (id: string, choice: LaunchChoice) => Promise<void>;
  onCopy: (quiz: Quiz) => void;
}) {
  // Hidden on the server and until the browser says otherwise: a guide closed once never flashes again.
  const hidden = useSyncExternalStore(
    subscribe,
    () => readHidden(userId),
    () => true,
  );
  if (hidden || !examples.length) return null;
  const hide = () => {
    try {
      localStorage.setItem(KEY + userId, "1");
    } catch {
      // Private browsing: the guide simply comes back next time.
    }
    window.dispatchEvent(new Event(EVENT));
  };
  return (
    <section className="first-steps" aria-labelledby="first-steps-title">
      <div className="first-steps-head">
        <h2 id="first-steps-title">Votre première partie en 3 étapes</h2>
        <button type="button" className="text-button first-steps-close" onClick={hide}>
          Masquer le guide <X size={16} aria-hidden />
        </button>
      </div>
      <ol className="first-steps-list">
        {[
          "Choisissez un exemple",
          "Lancez-le, ou personnalisez une copie",
          "Rejoignez avec votre téléphone",
        ].map((step, i) => (
          <li key={step}>
            <span className="first-steps-num" aria-hidden>
              {i + 1}
            </span>
            <h3>{step}</h3>
          </li>
        ))}
      </ol>
      <ul className="first-steps-picks">
        {examples.map((q) => (
          <li key={q.id} className={`first-steps-pick pick-${q.color}`}>
            <p className="eyebrow">{q.usage ? "MODÈLE" : "SQUIZZ ORIGINALS"}</p>
            <h3>{q.title}</h3>
            <p className="hint">
              {q.questions.length} étapes · <Timer size={14} aria-hidden /> {estimateLabel(q.questions)}
            </p>
            <div className="row">
              <LaunchDialog
                title={q.title}
                busy={busy}
                onLaunch={(choice) => onLaunch(q.id, choice)}
                trigger={
                  <button
                    type="button"
                    className="button small"
                    disabled={busy}
                    aria-label={`Lancer « ${q.title} »`}
                  >
                    <Play size={16} fill="currentColor" aria-hidden /> Lancer
                  </button>
                }
              />
              <button
                type="button"
                className="button small secondary"
                disabled={busy || full}
                aria-label={`Personnaliser une copie de « ${q.title} »`}
                aria-describedby={full ? "first-steps-quota" : undefined}
                onClick={() => onCopy(q)}
              >
                <Copy size={16} aria-hidden /> Personnaliser
              </button>
            </div>
          </li>
        ))}
      </ul>
      {full && (
        <p className="info-box first-steps-quota" id="first-steps-quota">
          Vos {maxQuizzes} quiz sont utilisés : lancer un exemple reste possible.{" "}
          <Link href="/tarifs">Voir les offres d’équipe</Link>
        </p>
      )}
      <p className="hint first-steps-phone">
        <Smartphone size={15} aria-hidden /> Pas d’écran ? Ouvrez la partie ici et rejoignez-la sur votre
        téléphone.
      </p>
    </section>
  );
}
