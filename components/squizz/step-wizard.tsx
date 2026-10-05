"use client";
import { useState } from "react";
import { Dialog } from "radix-ui";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { newQuestion, questionTypes, slideLayouts, validateQuestion, type Question } from "@/lib/question";
import { LayoutPreview, TypePreview } from "./type-preview";
import { QuestionFields } from "./question-fields";
import { QuestionPreview } from "./question-preview";

type Step = "type" | "content" | "preview";
const LABELS: Record<Step, string> = {
  type: "Type",
  content: "Contenu",
  preview: "Aperçu",
};

/**
 * Pop-up window that builds a new quiz step in stages: pick the type, write the content and its
 * settings, check the preview, then add it to the quiz.
 */
export function StepWizard({
  open,
  number,
  onClose,
  onAdd,
  onBusy,
}: {
  open: boolean;
  /** Position the new step will take in the quiz (1-based). */
  number: number;
  onClose: () => void;
  onAdd: (step: Question) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [draft, setDraft] = useState<Question | null>(null),
    [step, setStep] = useState<Step>("type"),
    [error, setError] = useState(""),
    [uploading, setUploading] = useState(false);
  const steps: Step[] = ["type", "content", "preview"];
  const at = steps.indexOf(step);
  const patch = (value: Partial<Question>) => setDraft((d) => (d ? { ...d, ...value } : d));
  const reset = () => {
    setDraft(null);
    setStep("type");
    setError("");
  };
  const pick = (q: Question) => {
    // Keep what was already written when switching type.
    setDraft(draft ? { ...q, text: draft.text, media: draft.media } : q);
    setStep("content");
    setError("");
  };
  /** Checks the step before the preview and the final add; returns false with a message if invalid. */
  const check = () => {
    try {
      validateQuestion(draft);
      setError("");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  };
  const go = (target: Step) => {
    if (!draft && target !== "type") return;
    if (target === "preview" && step === "content" && !check()) return;
    setStep(target);
  };
  const busy = (b: boolean) => {
    setUploading(b);
    onBusy(b);
  };
  const typeLabel =
    draft?.type === "slide"
      ? `Diapo · ${slideLayouts.find((l) => l.id === draft.layout)?.label}`
      : questionTypes.find((t) => t.id === draft?.type)?.label;
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o && !uploading) {
          onClose();
          reset();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="host-overlay" />
        <Dialog.Content className="host-modal wizard" aria-describedby={undefined}>
          <div className="host-modal-head">
            <div>
              <span className="eyebrow">ÉTAPE {number} DU QUIZ</span>
              <Dialog.Title className="host-modal-title">
                {draft ? typeLabel : "Quel type d’étape ?"}
              </Dialog.Title>
            </div>
            <Dialog.Close className="host-modal-close" aria-label="Fermer" disabled={uploading}>
              <X size={22} />
            </Dialog.Close>
          </div>
          <ol className="wizard-steps">
            {steps.map((s, i) => (
              <li key={s}>
                <button
                  type="button"
                  className={`${s === step ? "current" : ""} ${i < at ? "done" : ""}`}
                  aria-current={s === step ? "step" : undefined}
                  disabled={!draft && s !== "type"}
                  onClick={() => go(s)}
                >
                  <b>{i < at ? <Check size={14} strokeWidth={4} /> : i + 1}</b>
                  {LABELS[s]}
                </button>
              </li>
            ))}
          </ol>
          <div className="host-modal-body wizard-body" key={step}>
            {step === "type" && (
              <>
                {["Tester les connaissances", "Collecter des avis"].map((group) => (
                  <div key={group}>
                    <h3>{group}</h3>
                    <div className="type-grid">
                      {questionTypes
                        .filter((t) => t.group === group)
                        .map((t) => (
                          <TypeCard
                            key={t.id}
                            selected={draft?.type === t.id}
                            preview={<TypePreview type={t.id} />}
                            label={t.label}
                            hint={t.hint}
                            onPick={() => pick(newQuestion(t.id))}
                          />
                        ))}
                    </div>
                  </div>
                ))}
                <div>
                  <h3>Diapos multimédias</h3>
                  <div className="type-grid">
                    {slideLayouts.map((l) => (
                      <TypeCard
                        key={l.id}
                        selected={draft?.type === "slide" && draft.layout === l.id}
                        preview={<LayoutPreview layout={l.id} />}
                        label={l.label}
                        hint={l.hint}
                        onPick={() => pick(newQuestion("slide", l.id))}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
            {draft && step === "content" && (
              <div className="wizard-fields">
                <QuestionFields
                  q={draft}
                  patch={patch}
                  mediaKey={`wizard-${number}`}
                  onBusy={busy}
                  onError={setError}
                />
              </div>
            )}
            {draft && step === "preview" && <QuestionPreview question={draft} index={number - 1} />}
          </div>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <div className="host-modal-foot">
            {at > 0 ? (
              <button type="button" className="button secondary" onClick={() => setStep(steps[at - 1])}>
                <ArrowLeft size={18} /> Précédent
              </button>
            ) : (
              <span className="hint">Choisissez un format pour commencer.</span>
            )}
            {step === "preview" ? (
              <button
                type="button"
                className="button host-primary"
                disabled={uploading}
                onClick={() => {
                  if (!draft || !check()) return setStep("content");
                  onAdd(draft);
                  reset();
                }}
              >
                <Check size={20} /> Ajouter au quiz
              </button>
            ) : (
              step !== "type" && (
                <button
                  type="button"
                  className="button host-primary"
                  disabled={uploading}
                  onClick={() => go(steps[at + 1])}
                >
                  Suivant <ArrowRight size={18} />
                </button>
              )
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TypeCard({
  preview,
  label,
  hint,
  selected,
  onPick,
}: {
  preview: React.ReactNode;
  label: string;
  hint: string;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <button type="button" className={selected ? "selected" : ""} aria-pressed={selected} onClick={onPick}>
      {preview}
      <strong>{label}</strong>
      <span>{hint}</span>
    </button>
  );
}
