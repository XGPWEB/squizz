"use client";
import { useState } from "react";
import { Eye, EyeOff, Monitor, Smartphone } from "lucide-react";
import { publicQuestion, type AnswerPayload, type Question } from "@/lib/question";
import { Explanation, QuestionPlay } from "./question-play";

/**
 * Shows a step as the players will see it on their phone, or as it appears on the projected
 * screen, with the answer revealed on demand. Nothing is sent: answers stay in the preview.
 */
export function QuestionPreview({ question, index = 0 }: { question: Question; index?: number }) {
  const [view, setView] = useState<"phone" | "screen">("phone"),
    [revealed, setRevealed] = useState(false),
    [answer, setAnswer] = useState<AnswerPayload | null>(null);
  const pq = publicQuestion(question, revealed, index, view === "screen");
  const slide = question.type === "slide";
  // Switching view starts the preview afresh (the component keeps its own draft answer).
  const key = view;
  return (
    <div className="question-preview">
      <div className="preview-bar">
        <div className="host-tabs" role="tablist" aria-label="Aperçu">
          <button
            type="button"
            role="tab"
            aria-selected={view === "phone"}
            onClick={() => {
              setView("phone");
              setAnswer(null);
            }}
          >
            <Smartphone size={17} /> Sur le téléphone
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "screen"}
            onClick={() => {
              setView("screen");
              setAnswer(null);
            }}
          >
            <Monitor size={17} /> Sur l’écran
          </button>
        </div>
        {!slide && (
          <button type="button" className="button secondary small" onClick={() => setRevealed((r) => !r)}>
            {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
            {revealed ? "Masquer la correction" : "Montrer la correction"}
          </button>
        )}
      </div>
      <div className={`preview-stage ${view}`}>
        <div className={view === "phone" ? "preview-phone" : "preview-screen"}>
          <div className="preview-top">
            <span>
              {slide ? "Étape" : "Question"} {index + 1}
            </span>
            {!slide && <span className="timer">{question.duration} s</span>}
          </div>
          {!slide && <h2 className="question-title">{question.text || "Votre question…"}</h2>}
          <QuestionPlay
            key={key}
            question={pq}
            revealed={revealed}
            disabled={revealed}
            submitted={answer}
            onSubmit={setAnswer}
          />
          {revealed && question.explanation.trim() && <Explanation text={question.explanation.trim()} />}
        </div>
      </div>
      <p className="hint center">
        {slide
          ? "Les diapos s’affichent ainsi pour tout le monde, sans chronomètre."
          : answer
            ? "Réponse envoyée (pour de faux). Montrez la correction pour voir le résultat."
            : "Essayez de répondre : rien n’est enregistré."}
      </p>
    </div>
  );
}
