"use client";
import { useState } from "react";
import { Dialog } from "radix-ui";
import { Plus, X, ArrowUp, ArrowDown, Eye } from "lucide-react";
import {
  newQuestion,
  questionTypes,
  slideLayoutLabel,
  validateQuestion,
  type Question,
  type QuestionType,
} from "@/lib/question";
import { StepWizard } from "./step-wizard";
import { QuestionPreview } from "./question-preview";
import { QuestionFields } from "./question-fields";
export function QuizEditor({
  title,
  questions,
  setTitle,
  setQuestions,
  busy,
  setBusy,
  onError,
  onSave,
  editing = false,
}: {
  title: string;
  questions: Question[];
  setTitle: (s: string) => void;
  setQuestions: (q: Question[]) => void;
  busy: boolean;
  setBusy: (b: boolean) => void;
  onError: (s: string) => void;
  onSave: () => void;
  editing?: boolean;
}) {
  const [active, setActive] = useState(0);
  const [picker, setPicker] = useState(false),
    [preview, setPreview] = useState(false);
  const index = Math.min(active, questions.length - 1);
  const q = questions[index];
  const patch = (value: Partial<Question>) =>
    setQuestions(questions.map((x, i) => (i === index ? { ...x, ...value } : x)));
  const setType = (type: QuestionType) =>
    patch({ ...newQuestion(type), text: q.text, media: q.media, duration: q.duration });
  const add = (step: Question) => {
    setQuestions([...questions, step]);
    setActive(questions.length);
    setPicker(false);
  };
  function submit() {
    for (let i = 0; i < questions.length; i++) {
      try {
        validateQuestion(questions[i]);
      } catch (e) {
        setActive(i);
        onError(`Question ${i + 1} : ${(e as Error).message}`);
        return;
      }
    }
    onSave();
  }
  return (
    <section className="quiz-editor">
      <div className="editor-title">
        <span className="sticker pink-sticker">{editing ? "RETOUCHES EN COURS" : "À VOUS DE CRÉER"}</span>
        <h1>{editing ? "On peaufine votre quiz." : "Votre quiz. Vos règles."}</h1>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <fieldset disabled={busy}>
          <label className="quiz-title-input">
            Titre du quiz
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={90}
              placeholder="Ex. Qui connaît vraiment notre équipe ?"
              required
            />
          </label>
          <div className="editor-layout">
            <aside className="editor-steps">
              <h3>Les étapes</h3>
              {questions.map((step, i) => (
                <button
                  key={i}
                  type="button"
                  className={`step-button ${i === index ? "active" : ""}`}
                  aria-current={i === index ? "step" : undefined}
                  onClick={() => setActive(i)}
                >
                  <b>{i + 1}</b>
                  <span>
                    {step.text || "Nouvelle question"}
                    <small>
                      {step.type === "slide"
                        ? `Diapo · ${slideLayoutLabel(step.layout)}`
                        : questionTypes.find((t) => t.id === step.type)?.label}
                    </small>
                  </span>
                </button>
              ))}
              <button
                type="button"
                className="button small secondary"
                disabled={questions.length >= 30}
                onClick={() => setPicker(true)}
              >
                <Plus size={16} /> Ajouter une étape
              </button>
              <p className="hint">{questions.length} / 30 étapes</p>
            </aside>
            <section className="question-workspace">
              <div className="row spaced">
                <h2>Question {index + 1}</h2>
                <div className="row">
                  <button type="button" className="button small secondary" onClick={() => setPreview(true)}>
                    <Eye size={16} /> Aperçu
                  </button>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        setQuestions(questions.filter((_, i) => i !== index));
                        setActive(Math.max(0, index - 1));
                      }}
                    >
                      <X size={18} /> Supprimer
                    </button>
                  )}
                </div>
              </div>
              <QuestionFields
                q={q}
                patch={patch}
                part="all"
                mediaKey={index}
                setType={setType}
                onBusy={setBusy}
                onError={onError}
              />
              <div className="row spaced editor-move">
                <button
                  type="button"
                  className="button small secondary"
                  disabled={index === 0}
                  onClick={() => {
                    const items = [...questions];
                    [items[index - 1], items[index]] = [items[index], items[index - 1]];
                    setQuestions(items);
                    setActive(index - 1);
                  }}
                >
                  <ArrowUp size={16} /> Monter l’étape
                </button>
                <button
                  type="button"
                  className="button small secondary"
                  disabled={index === questions.length - 1}
                  onClick={() => {
                    const items = [...questions];
                    [items[index + 1], items[index]] = [items[index], items[index + 1]];
                    setQuestions(items);
                    setActive(index + 1);
                  }}
                >
                  <ArrowDown size={16} /> Descendre l’étape
                </button>
              </div>
            </section>
          </div>
          <StepWizard
            open={picker}
            number={questions.length + 1}
            onClose={() => setPicker(false)}
            onAdd={add}
            onBusy={setBusy}
          />
          <Dialog.Root open={preview} onOpenChange={setPreview}>
            <Dialog.Portal>
              <Dialog.Overlay className="host-overlay" />
              <Dialog.Content className="host-modal wizard" aria-describedby={undefined}>
                <div className="host-modal-head">
                  <div>
                    <span className="eyebrow">APERÇU · ÉTAPE {index + 1}</span>
                    <Dialog.Title className="host-modal-title">{q.text || "Sans titre"}</Dialog.Title>
                  </div>
                  <Dialog.Close className="host-modal-close" aria-label="Fermer">
                    <X size={22} />
                  </Dialog.Close>
                </div>
                <div className="host-modal-body">
                  <QuestionPreview question={q} index={index} />
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          <div className="editor-save">
            <span>
              {busy ? "Import ou enregistrement en cours…" : "Tout est prêt ? Enregistrez votre quiz."}
            </span>
            <button type="submit" className="button" disabled={busy}>
              {busy ? "Un instant…" : editing ? "Enregistrer les modifications" : "Enregistrer le quiz"}
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
