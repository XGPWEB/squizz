"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  Link2,
  Pencil,
  Play,
  Plus,
  Search,
  Sparkles,
  Timer,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import type { Quiz } from "@/lib/quizzes";
import type { OrgQuiz } from "@/lib/server/quiz-store";
import { gameApi, newClientKey, UncertainError, withRetry } from "@/lib/client/api";
import { estimateLabel } from "@/lib/quiz-duration";
import { MAX_TRANSFER_FILE_BYTES, MAX_TRANSFER_MEDIA_BYTES } from "@/lib/quiz-file";
import { formatSize } from "@/lib/media-limits";
import { parseCsv, readXlsx } from "@/lib/sheet";
import { rowsToQuestions, titleFromFile, type ImportResult } from "@/lib/sheet-import";
import { SoloLinkDialog } from "@/components/squizz/solo-link";

type Props = {
  quizzes: OrgQuiz[];
  demos: Quiz[];
  firstName: string;
  quota: { used: number; max: number | null; players: number };
  notice: "" | "created" | "updated";
};
type Sort = "recent" | "title" | "oldest";
type Imported = { id: string; title: string; count: number; notes: ImportResult["skipped"]; extra: number };

const MAX_SHEET_BYTES = 5 * 1024 * 1024;
const isSheet = (name: string) => /\.(xlsx|csv|tsv|txt)$/i.test(name);

/** A CSV saved by Excel on Windows is often not UTF-8: read it as Windows-1252 when UTF-8 does not fit. */
async function readCsv(file: File) {
  const bytes = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(bytes);
  return utf8.includes("\uFFFD") ? new TextDecoder("windows-1252").decode(bytes) : utf8;
}

/** Lowercase without accents, so « équipe » matches « equipe ». */
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

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
    ),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState<Sort>("recent"),
    [mineOnly, setMineOnly] = useState(false),
    [imported, setImported] = useState<Imported | null>(null);
  const full = quota.max !== null && quota.used >= quota.max;

  const matches = (q: Quiz) => !query.trim() || fold(q.title).includes(fold(query.trim()));
  const shown = useMemo(() => {
    const list = quizzes.filter((q) => (!mineOnly || q.mine) && matches(q));
    return list.sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title, "fr")
        : sort === "oldest"
          ? a.updatedAt.localeCompare(b.updatedAt)
          : b.updatedAt.localeCompare(a.updatedAt),
    );
    // `matches` only depends on `query`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizzes, mineOnly, query, sort]);
  const shownDemos = demos.filter(matches);

  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      setError(
        e instanceof UncertainError
          ? "La connexion est lente ou coupée : l’action n’a pas pu être confirmée. Réessayez dans un instant."
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  // One key per click: a retry after a lost response opens the same game, never a second one.
  const launch = (id: string) =>
    run(async () => {
      const clientKey = newClientKey();
      const { code } = await withRetry(() => gameApi<{ code: string }>("create", { quizId: id, clientKey }));
      router.push(`/partie/${code}`);
    });
  const duplicate = (q: Quiz) =>
    run(async () => {
      const clientKey = newClientKey();
      const { quiz } = await withRetry(() =>
        gameApi<{ quiz: OrgQuiz }>("duplicate", { quizId: q.id, clientKey }),
      );
      router.push(`/app/quiz/${quiz.id}`);
    });
  // A .squizz file: the quiz and its images, to keep a copy or import it into another space.
  const exportQuiz = (q: Quiz) =>
    run(async () => {
      const { file } = await gameApi<{ file: unknown }>("export", { quizId: q.id }, 120_000);
      const blob = new Blob([JSON.stringify(file)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${
        fold(q.title)
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "quiz"
      }.squizz`;
      link.click();
      URL.revokeObjectURL(link.href);
    });
  const picker = useRef<HTMLInputElement>(null);
  // An Excel or CSV list of questions: read here, then saved like a quiz made in the editor.
  const importSheet = (file: File) =>
    run(async () => {
      setImported(null);
      setMessage("");
      if (file.size > MAX_SHEET_BYTES)
        throw new Error(`Fichier trop lourd : ${formatSize(MAX_SHEET_BYTES)} maximum pour un tableur.`);
      const rows = /\.xlsx$/i.test(file.name)
        ? await readXlsx(new Uint8Array(await file.arrayBuffer()))
        : parseCsv(await readCsv(file));
      const { questions, skipped, extra } = rowsToQuestions(rows);
      if (!questions.length)
        throw new Error(
          skipped.length
            ? `Aucune question n’a pu être importée. ${skipped
                .slice(0, 3)
                .map((n) => `Ligne ${n.row} : ${n.reason}.`)
                .join(" ")}`
            : "Aucune question trouvée dans ce fichier.",
        );
      const title = titleFromFile(file.name);
      const clientKey = newClientKey();
      const { quiz } = await withRetry(() =>
        gameApi<{ quiz: OrgQuiz }>("save", { quiz: { title, questions }, clientKey }),
      );
      setImported({ id: quiz.id, title: quiz.title, count: questions.length, notes: skipped, extra });
      router.refresh();
    });
  const importFile = (file: File) =>
    run(async () => {
      if (file.size > MAX_TRANSFER_FILE_BYTES)
        throw new Error(
          `Fichier trop lourd : ${formatSize(MAX_TRANSFER_FILE_BYTES)} maximum (soit environ ${formatSize(MAX_TRANSFER_MEDIA_BYTES)} de médias).`,
        );
      let content: unknown;
      try {
        content = JSON.parse(await file.text());
      } catch {
        throw new Error("Ce fichier n’est pas un quiz SQuizz (.squizz).");
      }
      const clientKey = newClientKey();
      const { quiz } = await withRetry(() =>
        gameApi<{ quiz: OrgQuiz }>("import", { file: content, clientKey }, 120_000),
      );
      setMessage(`« ${quiz.title} » est importé : il est prêt à jouer.`);
      router.refresh();
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
        <span className={`pill ${"visibility" in q ? `pill-${q.visibility.toLowerCase()}` : ""}`}>
          {!own
            ? "SQuizz Originals"
            : "visibility" in q && q.visibility === "PRIVATE"
              ? "Brouillon privé"
              : "visibility" in q && q.visibility === "SELECTED"
                ? `Partagé avec ${q.sharedWith.length} personne${q.sharedWith.length > 1 ? "s" : ""}`
                : "Votre équipe"}
        </span>
      </div>
      <div className="card-content">
        <p className="eyebrow">
          {"createdBy" in q && q.createdBy ? `PAR ${q.createdBy.toUpperCase()}` : q.tag}
        </p>
        <h3>{q.title}</h3>
        <p>{q.desc}</p>
        {"updatedAt" in q && (
          <p className="card-updated">
            Modifié le {new Date(q.updatedAt).toLocaleDateString("fr-FR")}
            {q.updatedBy && q.updatedBy !== q.createdBy ? ` par ${q.updatedBy}` : ""}
          </p>
        )}
        <div className="card-bottom">
          <span title="Durée indicative : réponses, résultats et « Prêt ? » compris ; l’animateur donne le rythme.">
            <Users size={15} /> {q.questions.length} étape{q.questions.length > 1 ? "s" : ""} ·{" "}
            <Timer size={15} /> {estimateLabel(q.questions)}
          </span>
          <span className="card-actions">
            {"canEdit" in q && q.canEdit && (
              <Link
                aria-label={`Modifier ${q.title}`}
                title="Modifier"
                href={`/app/quiz/${q.id}`}
                className="card-action"
              >
                <Pencil size={16} />
              </Link>
            )}
            <button
              disabled={busy || full}
              aria-label={own ? `Dupliquer ${q.title}` : `Copier ${q.title} pour le modifier`}
              title={
                full
                  ? "Limite de quiz atteinte"
                  : own
                    ? "Dupliquer (la copie vous appartient)"
                    : "Créer une copie modifiable"
              }
              onClick={() => duplicate(q)}
              className="card-action"
            >
              <Copy size={16} />
            </button>
            {own && (
              <button
                disabled={busy}
                aria-label={`Exporter ${q.title}`}
                title="Exporter (fichier .squizz avec ses images)"
                onClick={() => exportQuiz(q)}
                className="card-action"
              >
                <Download size={16} />
              </button>
            )}
            {"canEdit" in q && q.canEdit && (q.canManage || q.visibility === "TEAM") && (
              <button
                disabled={busy}
                aria-label={`Supprimer ${q.title}`}
                title="Supprimer"
                onClick={() => remove(q)}
                className="card-action danger"
              >
                <Trash2 size={16} />
              </button>
            )}
            <SoloLinkDialog
              title={`« ${q.title} » en autonomie`}
              days
              create={async (days) => (await gameApi<{ id: string }>("solo", { quizId: q.id, days })).id}
              trigger={
                <button
                  type="button"
                  aria-label={`Lien en autonomie pour ${q.title}`}
                  title="Lien en autonomie : chacun joue à son rythme"
                  className="card-action"
                >
                  <Link2 size={16} />
                </button>
              }
            />
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
      {imported && (
        <div className="import-report" role="status">
          <div className="import-report-head">
            <span className="import-report-badge" aria-hidden>
              <FileSpreadsheet size={22} />
            </span>
            <div>
              <strong>
                « {imported.title} » est importé : {imported.count} étape{imported.count > 1 ? "s" : ""}.
              </strong>
              <p>Ajoutez-y des images ou des vidéos et vérifiez-le dans l’éditeur avant de le lancer.</p>
            </div>
            <Link className="button small" href={`/app/quiz/${imported.id}`}>
              <Pencil size={16} /> Vérifier
            </Link>
            <button className="text-button" onClick={() => setImported(null)} aria-label="Fermer le message">
              <X size={16} />
            </button>
          </div>
          {(imported.notes.length > 0 || imported.extra > 0) && (
            <ul>
              {imported.notes.map((n) => (
                <li key={`${n.row}-${n.reason}`} className={n.kept ? "kept" : ""}>
                  <b>Ligne {n.row}</b> {n.kept ? "gardée" : "ignorée"} : {n.reason}.
                </li>
              ))}
              {imported.extra > 0 && (
                <li>
                  <b>
                    {imported.extra} ligne{imported.extra > 1 ? "s" : ""}
                  </b>{" "}
                  en trop : un quiz compte 30 étapes au plus.
                </li>
              )}
            </ul>
          )}
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
          <span className="info-box">
            Limite de quiz atteinte : supprimez-en un ou{" "}
            <Link href="/tarifs">passez à une offre supérieure</Link>.
          </span>
        ) : (
          <div className="row library-create">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => picker.current?.click()}
              title="Importer un fichier Excel ou CSV (une question par ligne), ou un quiz .squizz"
            >
              <Upload size={18} /> Importer
            </button>
            <a
              className="text-button template-link"
              href="/api/modele-import"
              download
              title="Le tableur à remplir : une question par ligne"
            >
              <FileSpreadsheet size={16} /> Modèle Excel
            </a>
            <Link className="button" href="/app/quiz/nouveau">
              <Plus size={18} /> Créer un quiz
            </Link>
            <input
              ref={picker}
              type="file"
              accept=".squizz,.xlsx,.csv,application/json,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) (isSheet(file.name) ? importSheet : importFile)(file);
              }}
            />
          </div>
        )}
      </div>
      <div className="library-tools" role="search">
        <label className="library-search">
          <Search size={18} aria-hidden />
          <input
            type="search"
            placeholder="Rechercher un quiz…"
            aria-label="Rechercher un quiz par son titre"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="library-sort">
          <span>Trier</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="recent">Dernière modification</option>
            <option value="title">Titre (A → Z)</option>
            <option value="oldest">Les plus anciens</option>
          </select>
        </label>
        <label className="library-mine">
          <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
          Mes quiz
        </label>
      </div>
      <div className="section-heading">
        <h2>Les quiz de l’équipe</h2>
      </div>
      {shown.length ? (
        <div className="quiz-grid">{shown.map((q) => card(q, true))}</div>
      ) : quizzes.length ? (
        <p className="hint library-empty">
          Aucun quiz ne correspond{mineOnly ? " parmi les vôtres" : ""}.{" "}
          <button
            className="text-button"
            onClick={() => {
              setQuery("");
              setMineOnly(false);
            }}
          >
            Tout afficher
          </button>
        </p>
      ) : (
        <div className="creator">
          <Sparkles />
          <div>
            <h3>Vos questions. Votre terrain de jeu.</h3>
            <p>Aucun quiz pour l’instant. Préparez le premier, ou copiez un SQuizz Original ci-dessous.</p>
          </div>
          {!full && (
            <Link className="button dark" href="/app/quiz/nouveau">
              <Plus size={18} /> Créer mon quiz
            </Link>
          )}
        </div>
      )}
      {!mineOnly && shownDemos.length > 0 && (
        <>
          <div className="section-heading">
            <div>
              <p className="eyebrow">PRÊTS À LANCER</p>
              <h2>SQuizz Originals</h2>
            </div>
          </div>
          <div className="quiz-grid">{shownDemos.map((q) => card(q, false))}</div>
        </>
      )}
    </>
  );
}
