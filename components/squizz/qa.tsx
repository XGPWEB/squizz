"use client";
import { Dialog } from "radix-ui";
import { useState } from "react";
import { Check, CheckCheck, EyeOff, MessageCircleQuestion, ThumbsUp, Undo2, X } from "lucide-react";
import type { Game } from "./game-parts";
import { useSay } from "./voice";

type Item = NonNullable<Game["qa"]>["questions"][number];
type Send = (action: string, data: Record<string, unknown>) => Promise<void>;

const MAX = 280;

/** The pop-up windows open outside the game's frame: they carry its theme themselves. */
const themeOf = (game: Game) => (game.brand?.theme === "sober" ? "theme-sober" : "");
const brandStyle = (game: Game) =>
  game.brand?.theme === "sober" ? ({ "--brand": game.brand.accent } as React.CSSProperties) : undefined;

/** One question of the wall, with its votes. */
function QaRow({ q, children }: { q: Item; children?: React.ReactNode }) {
  return (
    <li className={`qa-row is-${q.status} ${q.mine ? "is-mine" : ""}`}>
      <span className="qa-votes" aria-label={`${q.votes} vote${q.votes > 1 ? "s" : ""}`}>
        <ThumbsUp size={14} aria-hidden /> {q.votes}
      </span>
      <span className="qa-text">
        {q.text}
        <small>
          {q.author ?? "Anonyme"}
          {q.status === "pending" && " · en attente de validation"}
          {q.status === "answered" && " · répondue"}
          {q.status === "hidden" && " · non retenue"}
        </small>
      </span>
      {children}
    </li>
  );
}

/** A player's view: ask a question (with their nickname or anonymously) and support the others'. */
export function QaPlayer({ game, send, busy }: { game: Game; send: Send; busy: boolean }) {
  const [open, setOpen] = useState(false),
    [text, setText] = useState(""),
    [anonymous, setAnonymous] = useState(false),
    [sent, setSent] = useState(false);
  const say = useSay();
  const qa = game.qa;
  if (!qa?.open && !qa?.questions.some((q) => q.mine)) return null;
  const shown = qa.questions.filter((q) => q.status !== "hidden" || q.mine);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className="qa-fab">
          <MessageCircleQuestion size={20} aria-hidden /> Poser une question
          {shown.length > 0 && <b>{shown.length}</b>}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={`host-overlay ${themeOf(game)}`} />
        <Dialog.Content
          className={`qa-sheet ${themeOf(game)}`}
          style={brandStyle(game)}
          aria-describedby={undefined}
        >
          <div className="qa-sheet-head">
            <Dialog.Title>Vos questions</Dialog.Title>
            <Dialog.Close className="host-modal-close" aria-label="Fermer">
              <X size={20} />
            </Dialog.Close>
          </div>
          {qa.open ? (
            <form
              method="post"
              className="qa-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!text.trim()) return;
                await send("qa-ask", { text, anonymous });
                setText("");
                setSent(true);
              }}
            >
              <label>
                {say("Ta question pour l’animateur", "Votre question pour l’animateur")}
                <textarea
                  rows={3}
                  maxLength={MAX}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setSent(false);
                  }}
                  placeholder="Ex. Pourra-t-on avoir le support après la séance ?"
                />
              </label>
              <div className="qa-form-row">
                <label className="qa-anonymous">
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                  />
                  Anonyme
                </label>
                <small>
                  {text.length} / {MAX}
                </small>
                <button className="button small" disabled={busy || !text.trim()}>
                  Envoyer
                </button>
              </div>
              {sent && (
                <p className="hint" role="status">
                  {qa.moderated
                    ? "Envoyée : elle s’affichera une fois validée par l’animateur."
                    : "Envoyée, merci !"}
                </p>
              )}
            </form>
          ) : (
            <p className="hint">Les questions sont fermées pour le moment.</p>
          )}
          {shown.length ? (
            <ol className="qa-list">
              {shown.map((q) => (
                <QaRow key={q.id} q={q}>
                  {!q.mine && q.status !== "pending" && (
                    <button
                      type="button"
                      className={`qa-vote ${q.voted ? "on" : ""}`}
                      disabled={busy}
                      aria-pressed={q.voted}
                      aria-label={q.voted ? "Retirer mon vote" : "Voter pour cette question"}
                      onClick={() => send("qa-vote", { id: q.id, vote: !q.voted })}
                    >
                      <ThumbsUp size={16} />
                    </button>
                  )}
                </QaRow>
              ))}
            </ol>
          ) : (
            <p className="hint">
              {say("Pas encore de question. Lance-toi !", "Pas encore de question : soyez le premier.")}
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** The host's controls: open the wall, choose moderation, approve, hide or mark questions as answered. */
export function QaModeration({ game, send, busy }: { game: Game; send: Send; busy: boolean }) {
  const qa = game.qa ?? { open: false, moderated: false, questions: [] };
  const pending = qa.questions.filter((q) => q.status === "pending");
  const others = qa.questions.filter((q) => q.status !== "pending");
  return (
    <div className="qa-moderation">
      <div className="qa-switches">
        <label>
          <input
            type="checkbox"
            checked={qa.open}
            disabled={busy}
            onChange={(e) => send("qa-settings", { open: e.target.checked, moderated: qa.moderated })}
          />
          Questions ouvertes aux participants
        </label>
        <label>
          <input
            type="checkbox"
            checked={qa.moderated}
            disabled={busy}
            onChange={(e) => send("qa-settings", { open: qa.open, moderated: e.target.checked })}
          />
          Valider chaque question avant de l’afficher
        </label>
      </div>
      {pending.length > 0 && (
        <>
          <h3>À valider ({pending.length})</h3>
          <ol className="qa-list">
            {pending.map((q) => (
              <QaRow key={q.id} q={q}>
                <span className="qa-actions">
                  <button
                    type="button"
                    className="button small"
                    disabled={busy}
                    onClick={() => send("qa-moderate", { id: q.id, status: "visible" })}
                  >
                    <Check size={15} /> Valider
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    disabled={busy}
                    aria-label="Ne pas retenir"
                    onClick={() => send("qa-moderate", { id: q.id, status: "hidden" })}
                  >
                    <EyeOff size={16} />
                  </button>
                </span>
              </QaRow>
            ))}
          </ol>
        </>
      )}
      <h3>{pending.length ? "Affichées" : "Les questions"}</h3>
      {others.length ? (
        <ol className="qa-list">
          {others.map((q) => (
            <QaRow key={q.id} q={q}>
              <span className="qa-actions">
                {q.status === "visible" && (
                  <button
                    type="button"
                    className="button small secondary"
                    disabled={busy}
                    onClick={() => send("qa-moderate", { id: q.id, status: "answered" })}
                  >
                    <CheckCheck size={15} /> Répondue
                  </button>
                )}
                {q.status === "visible" ? (
                  <button
                    type="button"
                    className="text-button"
                    disabled={busy}
                    aria-label="Masquer"
                    onClick={() => send("qa-moderate", { id: q.id, status: "hidden" })}
                  >
                    <EyeOff size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="text-button"
                    disabled={busy}
                    aria-label="Afficher à nouveau"
                    onClick={() => send("qa-moderate", { id: q.id, status: "visible" })}
                  >
                    <Undo2 size={16} />
                  </button>
                )}
              </span>
            </QaRow>
          ))}
        </ol>
      ) : (
        <p className="hint">
          {qa.open
            ? "Pas encore de question. Les participants les posent depuis leur téléphone."
            : "Ouvrez les questions : un bouton « Poser une question » apparaît sur les téléphones."}
        </p>
      )}
    </div>
  );
}

/** The big screen's button: the wall's state at a glance, and its moderation in a pop-up window. */
export function QaHostButton({ game, send, busy }: { game: Game; send: Send; busy: boolean }) {
  const [open, setOpen] = useState(false);
  const pending = game.qa?.questions.filter((q) => q.status === "pending").length ?? 0;
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className={`button secondary small host-qa ${game.qa?.open ? "on" : ""}`}>
          <MessageCircleQuestion size={16} /> <span>Questions</span>
          {pending > 0 && <b className="tab-badge">{pending}</b>}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={`host-overlay ${themeOf(game)}`} />
        <Dialog.Content
          className={`host-modal ${themeOf(game)}`}
          style={brandStyle(game)}
          aria-describedby={undefined}
        >
          <div className="host-modal-head">
            <Dialog.Title className="host-modal-title">Questions du public</Dialog.Title>
            <Dialog.Close className="host-modal-close" aria-label="Fermer">
              <X size={22} />
            </Dialog.Close>
          </div>
          <div className="host-modal-body">
            <QaModeration game={game} send={send} busy={busy} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
