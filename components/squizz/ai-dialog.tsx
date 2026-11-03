"use client";
import { Dialog } from "radix-ui";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FileText, KeyRound, Sparkles, Trash2, X } from "lucide-react";
import { AI_COUNTS, AI_LEVELS, AI_MAX_PDF, AI_MAX_TEXT, AI_TYPES, type AiType } from "@/lib/ai-quiz";
import type { Question } from "@/lib/question";
import { gameApi, getJson, newClientKey, postJson, withRetry } from "@/lib/client/api";

type Settings = {
  ready: boolean;
  provider: "anthropic" | "openai" | null;
  hint: string | null;
  model: string | null;
  defaults: Record<"anthropic" | "openai", string>;
  canEdit: boolean;
};
const NAMES = { anthropic: "Claude", openai: "ChatGPT" } as const;
type Generated = { quiz: { title: string; questions: Question[] }; clientKey: string };

const toBase64 = async (file: File) => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};

/** The organisation's AI account: connect it (administrators), replace or remove the key. */
function AiConnect({ settings, onSaved }: { settings: Settings; onSaved: (s: Settings | null) => void }) {
  const [provider, setProvider] = useState<"anthropic" | "openai">(settings.provider ?? "anthropic"),
    [key, setKey] = useState(""),
    [model, setModel] = useState(settings.model ?? ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      method="post"
      className="ai-connect"
      onSubmit={async (e) => {
        e.preventDefault();
        // Only this form's own submit (React bubbles submits through portals).
        if (e.target !== e.currentTarget) return;
        setBusy(true);
        setError("");
        try {
          onSaved(await postJson<Settings>("/api/org/ai", { provider, key, model }, "PUT"));
          setKey("");
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>
        L’IA fonctionne avec le compte de votre organisation : les questions sont générées par Claude ou
        ChatGPT, et facturées par eux sur ce compte. La clé est chiffrée dès son enregistrement et n’est plus
        jamais affichée.
      </p>
      <div className="ai-providers" role="radiogroup" aria-label="Fournisseur">
        {(["anthropic", "openai"] as const).map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={provider === p}
            className={provider === p ? "on" : ""}
            onClick={() => setProvider(p)}
          >
            {NAMES[p]}
          </button>
        ))}
      </div>
      <label>
        Clé API {NAMES[provider]}
        <input
          type="password"
          autoComplete="off"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={
            settings.provider === provider && settings.hint
              ? `Clé enregistrée (…${settings.hint}) : laissez vide pour la garder`
              : provider === "anthropic"
                ? "sk-ant-…"
                : "sk-…"
          }
        />
      </label>
      <label>
        Modèle (facultatif)
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={`Par défaut : ${settings.defaults[provider]}`}
          maxLength={80}
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="row">
        <button className="button" disabled={busy}>
          <KeyRound size={16} /> Enregistrer
        </button>
        {settings.provider && (
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={async () => {
              if (!confirm("Retirer le compte IA de l’organisation ? La clé sera effacée.")) return;
              await postJson("/api/org/ai", undefined, "DELETE");
              onSaved(null);
            }}
          >
            <Trash2 size={16} /> Retirer le compte
          </button>
        )}
      </div>
    </form>
  );
}

/** « Créer avec l'IA »: a draft quiz from a text or a PDF, opened in the editor to be checked. */
export function AiDialog({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false),
    [settings, setSettings] = useState<Settings | null>(null),
    [editing, setEditing] = useState(false),
    [text, setText] = useState(""),
    [file, setFile] = useState<File | null>(null),
    [count, setCount] = useState<number>(10),
    [types, setTypes] = useState<AiType[]>(["quiz", "truefalse"]),
    [level, setLevel] = useState("medium"),
    [topic, setTopic] = useState(""),
    [pending, setPending] = useState<Generated | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const picker = useRef<HTMLInputElement>(null);
  const load = async () => {
    try {
      setSettings(await getJson<Settings>("/api/org/ai"));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const generate = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      let draft = pending;
      if (!draft) {
        let pdf: string | null = null;
        let source = text;
        if (file) {
          if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
            if (file.size > AI_MAX_PDF) throw new Error("Document PDF trop lourd : 10 Mo au plus.");
            pdf = await toBase64(file);
          } else source = `${await file.text()}\n${text}`.trim();
        }
        const result = await postJson<{ title: string; questions: Question[]; dropped: number }>(
          "/api/ai/generate",
          { text: source.slice(0, AI_MAX_TEXT), pdf, count, types, level, topic },
          "POST",
          190_000,
        );
        draft = { quiz: { title: result.title, questions: result.questions }, clientKey: newClientKey() };
        setPending(draft);
      }
      const saved = draft;
      const { quiz } = await withRetry(() => gameApi<{ quiz: { id: string } }>("save", saved));
      router.push(`/app/quiz/${quiz.id}?ok=ia`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };
  const connected = settings?.provider && !editing;
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (busy) return;
        setOpen(o);
        if (o && !settings) void load();
      }}
    >
      <Dialog.Trigger asChild>
        <button
          className="button secondary ai-trigger"
          disabled={disabled}
          title="Générer un quiz depuis un texte ou un PDF"
        >
          <Sparkles size={18} /> Créer avec l’IA
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="host-overlay" />
        <Dialog.Content className="host-modal ai-modal" aria-describedby={undefined}>
          <div className="host-modal-head">
            <Dialog.Title className="host-modal-title">Créer un quiz avec l’IA</Dialog.Title>
            <Dialog.Close className="host-modal-close" aria-label="Fermer" disabled={busy}>
              <X size={22} />
            </Dialog.Close>
          </div>
          <div className="host-modal-body ai-body">
            {!settings && !error && <p className="hint">Chargement…</p>}
            {settings && !settings.ready && (
              <p className="info-box">
                La génération par IA n’est pas encore activée sur SQuizz. Revenez bientôt !
              </p>
            )}
            {settings?.ready && !settings.provider && !settings.canEdit && (
              <p className="info-box">
                Votre organisation n’a pas encore connecté de compte Claude ou ChatGPT : demandez-le à un
                administrateur.
              </p>
            )}
            {settings?.ready && settings.canEdit && (!settings.provider || editing) && (
              <AiConnect
                settings={settings}
                onSaved={(s) => {
                  setEditing(false);
                  if (s) setSettings(s);
                  else void load();
                }}
              />
            )}
            {pending && (
              <div className="ai-form">
                <p className="info-box">
                  « {pending.quiz.title} » est généré ({pending.quiz.questions.length} questions). Le quiz
                  reste disponible dans cette fenêtre : réessayez l’enregistrement sans relancer l’IA.
                </p>
                <button className="button ai-go" disabled={busy} onClick={() => void generate()}>
                  {busy ? "Enregistrement…" : "Réessayer l’enregistrement"}
                </button>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => {
                    if (!confirm("Abandonner le quiz généré ? Son contenu sera perdu.")) return;
                    setPending(null);
                    setError("");
                  }}
                >
                  Abandonner le quiz généré
                </button>
              </div>
            )}
            {settings?.ready && connected && !pending && (
              <form
                method="post"
                className={`ai-form ${busy ? "busy" : ""}`}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (e.target !== e.currentTarget) return;
                  void generate();
                }}
              >
                <p className="hint">
                  Avec le compte {NAMES[settings.provider!]} de votre organisation
                  {settings.canEdit && (
                    <>
                      {" · "}
                      <button type="button" className="text-button" onClick={() => setEditing(true)}>
                        réglages
                      </button>
                    </>
                  )}
                </p>
                <label>
                  Le contenu
                  <textarea
                    rows={6}
                    value={text}
                    maxLength={AI_MAX_TEXT}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Collez ici un cours, une procédure, un article, un compte rendu…"
                  />
                </label>
                <div className="ai-file">
                  <button
                    type="button"
                    className="button small secondary"
                    onClick={() => picker.current?.click()}
                  >
                    <FileText size={16} />{" "}
                    {file ? "Changer de document" : "Ajouter un PDF ou un fichier texte"}
                  </button>
                  {file && (
                    <span>
                      {file.name}{" "}
                      <button
                        type="button"
                        className="text-button"
                        aria-label="Retirer le document"
                        onClick={() => setFile(null)}
                      >
                        <X size={14} />
                      </button>
                    </span>
                  )}
                  <input
                    ref={picker}
                    type="file"
                    hidden
                    accept="application/pdf,.pdf,.txt,.md,text/plain"
                    onChange={(e) => {
                      setFile(e.target.files?.[0] ?? null);
                      e.target.value = "";
                    }}
                  />
                </div>
                <div className="ai-options">
                  <label>
                    Questions
                    <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
                      {AI_COUNTS.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Niveau
                    <select value={level} onChange={(e) => setLevel(e.target.value)}>
                      {AI_LEVELS.map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <fieldset className="ai-types">
                  <legend>Types de questions</legend>
                  {AI_TYPES.map(([v, l]) => (
                    <label key={v}>
                      <input
                        type="checkbox"
                        checked={types.includes(v)}
                        onChange={(e) =>
                          setTypes(e.target.checked ? [...types, v] : types.filter((t) => t !== v))
                        }
                      />
                      {l}
                    </label>
                  ))}
                </fieldset>
                <label>
                  Précisions (facultatif)
                  <input
                    value={topic}
                    maxLength={500}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Ex. pour des nouveaux arrivants, insister sur la sécurité"
                  />
                </label>
                {error && (
                  <p className="error" role="alert">
                    {error}
                  </p>
                )}
                <button className="button ai-go" disabled={busy || (!text.trim() && !file) || !types.length}>
                  <Sparkles size={18} /> {busy ? "Génération en cours…" : "Générer le quiz"}
                </button>
                {busy && (
                  <p className="hint ai-wait" role="status">
                    L’IA lit le contenu et prépare les questions : cela prend souvent une minute. Le quiz
                    s’ouvrira ensuite dans l’éditeur pour que vous le vérifiiez.
                  </p>
                )}
              </form>
            )}
            {error && (!connected || pending) && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
