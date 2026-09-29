"use client";
import { QuizEditor } from "@/components/squizz/editor";
import { QuestionPlay, QuestionResults } from "@/components/squizz/question-play";
import { newQuestion, type PublicQuestion, type Aggregate, type AnswerPayload } from "@/lib/question";
import { invitationOrigin } from "@/lib/invitation";
declare const __SQUIZZ_PREVIEW_HOST__: string;
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import {
  Zap,
  Plus,
  Play,
  Users,
  Sparkles,
  ArrowLeft,
  Check,
  Trophy,
  Copy,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { demos, type Quiz, type Question } from "@/lib/quizzes";
type RankedPlayer = {
  name: string;
  score: number;
  me: boolean;
  rank: number;
  movement: number | null;
  correctCount?: number;
};
type Game = {
  code: string;
  host: boolean;
  title: string;
  phase: string;
  index: number;
  total: number;
  totalScored: number;
  duration: number;
  remaining: number;
  revealed: boolean;
  question: PublicQuestion | null;
  aggregate: Aggregate | null;
  players: RankedPlayer[];
  personal:
    | (RankedPlayer & { points: number; outcome: "correct" | "incorrect" | "timeout" | "opinion" | "slide" })
    | null;
  answered: number;
  myAnswer: { choice: number; answer: AnswerPayload; points?: number } | null;
};
const blank = (): Question => newQuestion();
async function api(action: string, data: Record<string, unknown> = {}) {
  const res = await fetch("/api/game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...data }),
  });
  const out: any = await res.json();
  if (!res.ok) throw new Error(out.error || "Une erreur est survenue.");
  return out;
}
export default function Home() {
  const [view, setView] = useState("home"),
    [quizzes, setQuizzes] = useState<Quiz[]>(demos),
    [code, setCode] = useState(""),
    [name, setName] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [game, setGame] = useState<Game | null>(null),
    [title, setTitle] = useState(""),
    [questions, setQuestions] = useState<Question[]>([blank()]),
    [saved, setSaved] = useState<"" | "created" | "updated" | "deleted">(""),
    [editingId, setEditingId] = useState<string | null>(null),
    [copied, setCopied] = useState(false),
    [clock, setClock] = useState(Date.now()),
    [origin, setOrigin] = useState("");
  const received = useRef(Date.now());
  const load = async () => {
    const r = await fetch("/api/game");
    const d: any = await r.json();
    if (!r.ok) throw new Error(d.error);
    setQuizzes(d.quizzes);
  };
  useEffect(() => {
    setOrigin(invitationOrigin(location.origin, __SQUIZZ_PREVIEW_HOST__));
    load().catch((e) => setError(e.message));
    const params = new URLSearchParams(location.search);
    const room = params.get("room");
    if (room && /^\d{6}$/.test(room)) {
      setCode(room);
      setView("game");
      return;
    }
    const c = params.get("code");
    if (c && /^\d{6}$/.test(c)) {
      setCode(c);
      setView("join");
    }
  }, []);
  useEffect(() => {
    if (view !== "game") return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const r = await fetch(`/api/game?action=state&code=${code}`);
        const d: any = await r.json();
        if (!r.ok) throw new Error(d.error);
        if (active) {
          received.current = Date.now();
          setGame(d);
          setError("");
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      }
      if (active) timer = setTimeout(poll, 900);
    };
    poll();
    const tick = setInterval(() => setClock(Date.now()), 200);
    return () => {
      active = false;
      clearTimeout(timer);
      clearInterval(tick);
    };
  }, [view, code]);
  useEffect(() => {
    const context = (document as any).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    Promise.resolve(
      context.registerTool(
        {
          name: "start_quiz_creation",
          title: "Créer un quiz SQuizz",
          description: "Ouvre l’éditeur de quiz sans enregistrer de quiz ni démarrer de partie.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
          annotations: { readOnlyHint: false },
          execute(input: unknown) {
            if (!input || typeof input !== "object" || Object.keys(input).length)
              throw new Error("Aucun paramètre attendu.");
            setEditingId(null);
            setView("editor");
            setSaved("");
            return { view: "editor" };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, []);
  async function run(task: () => Promise<void>) {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      await task();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const home = () => {
    setView("home");
    setError("");
    setGame(null);
    history.replaceState(null, "", "/");
  };
  const editor = (quiz?: Quiz) => {
    setEditingId(quiz?.id ?? null);
    setTitle(quiz?.title ?? "");
    setQuestions(quiz ? structuredClone(quiz.questions) : [blank()]);
    setView("editor");
    setSaved("");
    setError("");
    window.scrollTo(0, 0);
  };
  const launch = (quizId: string) =>
    run(async () => {
      const d = await api("create", { quizId });
      setCode(d.code);
      setGame(null);
      history.replaceState(null, "", `/?room=${d.code}`);
      setView("game");
    });
  const join = () =>
    run(async () => {
      await api("join", { code, name });
      setGame(null);
      history.replaceState(null, "", `/?room=${code}`);
      setView("game");
    });
  const save = () =>
    run(async () => {
      const quiz = { title, questions };
      if (editingId) {
        const d = await api("update", { quizId: editingId, quiz });
        setQuizzes((list) => list.map((q) => (q.id === editingId ? d.quiz : q)));
      } else {
        const d = await api("save", { quiz });
        setQuizzes((list) => [...list, d.quiz]);
      }
      setSaved(editingId ? "updated" : "created");
      setEditingId(null);
      setTitle("");
      setQuestions([blank()]);
      setView("home");
    });
  const remove = (quiz: Quiz) => {
    if (!confirm(`Supprimer « ${quiz.title} » ? Cette action est définitive.`)) return;
    run(async () => {
      await api("delete", { quizId: quiz.id });
      setQuizzes((list) => list.filter((q) => q.id !== quiz.id));
      setSaved("deleted");
    });
  };
  const patch = (i: number, value: Partial<Question>) =>
    setQuestions((q) => q.map((x, j) => (j === i ? { ...x, ...value } : x)));
  const remaining = game ? Math.max(0, Math.ceil((game.remaining - (clock - received.current)) / 1000)) : 0;
  return (
    <>
      <header>
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            home();
          }}
        >
          S<span>Q</span>uizz<span className="brand-dot">.</span>
        </a>
        <span className="header-note">LE QUIZ · VERSION COLLECTIVE</span>
        {view === "home" ? (
          <button className="button small" onClick={() => editor()}>
            <Plus size={18} /> Créer un quiz
          </button>
        ) : (
          <button className="button small secondary" onClick={home}>
            <ArrowLeft size={16} /> Accueil
          </button>
        )}
      </header>
      <main>
        {error && (
          <div className="error" role="alert">
            {error}{" "}
            <button className="text-button" onClick={() => setError("")} aria-label="Fermer le message">
              <X size={16} />
            </button>
          </div>
        )}
        {view === "home" && (
          <>
            {saved && (
              <div className="success" role="status">
                <Check size={18} />{" "}
                {saved === "deleted"
                  ? "Le quiz a été supprimé."
                  : saved === "updated"
                    ? "Vos modifications sont enregistrées."
                    : "Votre quiz est enregistré. Il est prêt à jouer."}
              </div>
            )}
            <div className="intro">
              <div>
                <p className="eyebrow">LE SAVOIR, ÇA SE JOUE.</p>
                <h1>
                  Moins de blabla.
                  <br />
                  Plus de <span>défis.</span>
                </h1>
                <p className="lead">
                  Tes potes. Ton téléphone. Tes meilleures réponses.
                  <br />
                  Qui va prendre la première place ?
                </p>
              </div>
              <form
                className="join"
                onSubmit={(e) => {
                  e.preventDefault();
                  setView("join");
                  setError("");
                }}
              >
                <div className="icon-box">
                  <Zap />
                </div>
                <h2>T’es dans la partie ?</h2>
                <p>Entrez le code affiché par votre animateur.</p>
                <label htmlFor="code">Code de la partie</label>
                <input
                  id="code"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  required
                  maxLength={6}
                />
                <button className="button dark" type="submit">
                  Rejoindre la partie
                </button>
                <span className="hint">Un pseudo suffit pour participer.</span>
              </form>
            </div>
            <div className="section-heading">
              <div>
                <p className="eyebrow">LE PLUS DUR, C’EST DE CHOISIR</p>
                <h2>On joue à quoi ?</h2>
              </div>
              <span className="hint">Des quiz prêts à lancer</span>
            </div>
            <div className="quiz-grid">
              {quizzes.map((q) => {
                const own = !demos.some((x) => x.id === q.id);
                return (
                  <article className="quiz-card" key={q.id}>
                    <div className={`card-art ${q.color}`}>
                      <span aria-hidden="true">{q.symbol}</span>
                      <span className="pill">{own ? "Votre quiz" : "SQuizz Originals"}</span>
                    </div>
                    <div className="card-content">
                      <p className="eyebrow">{q.tag}</p>
                      <h3>{q.title}</h3>
                      <p>{q.desc}</p>
                      <div className="card-bottom">
                        <span>
                          <Users size={15} /> {q.questions.length} question{q.questions.length > 1 ? "s" : ""}{" "}
                          · ~{Math.ceil(q.questions.length * 0.5)} min
                        </span>
                        <span className="card-actions">
                          {own && (
                            <>
                              <button
                                disabled={busy}
                                aria-label={`Modifier ${q.title}`}
                                title="Modifier"
                                onClick={() => editor(q)}
                                className="card-action"
                              >
                                <Pencil size={16} />
                              </button>
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
              })}
            </div>
            <div className="creator">
              <Sparkles />
              <div>
                <h3>Tes questions. Ton terrain de jeu.</h3>
                <p>Prépare le quiz dont tout le monde va parler.</p>
              </div>
              <button className="button dark" onClick={() => editor()}>
                <Plus size={18} /> Créer mon quiz
              </button>
            </div>
          </>
        )}
        {view === "join" && (
          <section className="panel" style={{ maxWidth: 480 }}>
            <p className="eyebrow">ENTREZ DANS LA PARTIE</p>
            <h1 style={{ fontSize: 40 }}>À toi de jouer !</h1>
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                join();
              }}
            >
              <label>
                Code de la partie
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                />
              </label>
              <label>
                Ton pseudo
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex. Capitaine Curieux"
                  maxLength={24}
                  required
                  autoComplete="nickname"
                />
              </label>
              <button disabled={busy} className="button">
                {busy ? "Connexion…" : "C’est parti !"}
              </button>
            </form>
          </section>
        )}
        {view === "editor" && (
          <QuizEditor
            title={title}
            questions={questions}
            setTitle={setTitle}
            setQuestions={setQuestions}
            busy={busy}
            setBusy={setBusy}
            onError={setError}
            onSave={save}
            editing={editingId !== null}
          />
        )}
        {view === "game" && !game && (
          <div className="panel center" role="status">
            Connexion à la partie…
          </div>
        )}
        {view === "game" && game && (
          <section className={`panel game-panel ${game.phase === "finished" ? "final-panel" : ""}`}>
            <div className="row spaced">
              <span className="eyebrow">{game.host ? "ÉCRAN ANIMATEUR" : "VOUS ÊTES DANS LA PARTIE"}</span>
              <span className="hint">{game.title}</span>
            </div>
            {game.phase === "lobby" ? (
              <>
                <div className="lobby-heading">
                  <span className="sticker">LE DÉFI VA COMMENCER</span>
                  <h1>Ramène ton équipe.</h1>
                  <p className="handnote">Scanne. Choisis ton pseudo. Joue !</p>
                </div>
                <div className="lobby-connect">
                  <div className="invitation">
                    <span className="eyebrow">LE CODE DE LA PARTIE</span>
                    <div className="code">{game.code}</div>
                    <p>
                      Ouvre SQuizz sur ton téléphone
                      <br />
                      et entre ce code, ou scanne à côté.
                    </p>
                    <button
                      className="button secondary small"
                      onClick={() =>
                        run(async () => {
                          const url = `${origin}/?code=${game.code}`;
                          if (navigator.clipboard) {
                            await navigator.clipboard.writeText(url);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          } else {
                            setError(`Copie ce lien : ${url}`);
                          }
                        })
                      }
                    >
                      <Copy size={16} />
                      {copied ? "Lien copié !" : "Copier l’invitation"}
                    </button>
                  </div>
                  <div className="qr-sticker">
                    {origin && (
                      <QRCodeSVG
                        value={`${origin}/?code=${game.code}`}
                        size={224}
                        level="M"
                        marginSize={4}
                        title="Scanner pour rejoindre cette partie SQuizz"
                      />
                    )}
                    <strong>SCANNE & JOUE</strong>
                    <a href={`${origin}/?code=${game.code}`} target="_blank" rel="noopener noreferrer">
                      Ouvrir le lien de la partie
                    </a>
                  </div>
                </div>
                {origin && /localhost|127\.0\.0\.1/.test(origin) && (
                  <p className="preview-note">
                    Aperçu sur cet ordinateur : ouvre l’adresse réseau de SQuizz pour scanner depuis un
                    téléphone connecté au même Wi-Fi.
                  </p>
                )}
                <h3 style={{ marginTop: 30 }}>
                  <Users size={20} style={{ display: "inline", verticalAlign: "middle" }} />{" "}
                  {game.players.length} joueur{game.players.length > 1 ? "s" : ""}
                </h3>
                <div className="row" style={{ margin: "20px 0 30px" }}>
                  {game.players.length ? (
                    game.players.map((p) => (
                      <span className="player" key={p.name}>
                        {p.name}
                        {p.me ? " (vous)" : ""}
                      </span>
                    ))
                  ) : (
                    <p className="hint">Les joueurs apparaîtront ici dès leur arrivée.</p>
                  )}
                </div>
                {game.host ? (
                  <>
                    <button
                      className="button"
                      disabled={busy || game.players.length === 0}
                      onClick={() =>
                        run(async () => {
                          await api("start", { code });
                        })
                      }
                    >
                      <Play size={18} /> Lancer le quiz
                    </button>
                    {!game.players.some((p) => p.me) && (
                      <form
                        className="row"
                        style={{ marginTop: 20 }}
                        onSubmit={(e) => {
                          e.preventDefault();
                          run(async () => {
                            await api("join", { code, name });
                          });
                        }}
                      >
                        <input
                          style={{ flex: 1, width: 200 }}
                          aria-label="Ton pseudo pour jouer aussi"
                          placeholder="Ton pseudo pour jouer aussi"
                          required
                          maxLength={24}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                        <button disabled={busy} className="button secondary">
                          Jouer aussi
                        </button>
                      </form>
                    )}
                  </>
                ) : (
                  <p className="center lead">Vous êtes prêt ! L’animateur va lancer le quiz.</p>
                )}
              </>
            ) : game.phase === "finished" ? (
              <>
                <div className="center final-heading">
                  <span className="sticker pink-sticker">FIN DU GAME</span>
                  <h1>Place aux légendes.</h1>
                  <p className="handnote">
                    {game.players.filter((p) => p.rank === 1).length > 1
                      ? "Ex æquo au sommet. Bien joué !"
                      : `${game.players[0]?.name} prend la couronne !`}
                  </p>
                </div>
                <Podium players={game.players} />
                {game.personal && <PersonalResult game={game} final />}
                <div className="section-heading">
                  <h2>Tout le classement</h2>
                  <span className="eyebrow">
                    {game.total} QUESTIONS · {game.players.length} JOUEURS
                  </span>
                </div>
                <Leaderboard players={game.players} />
                <div className="center" style={{ marginTop: 25 }}>
                  <button className="button" onClick={home}>
                    On remet ça ?
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="row spaced" style={{ marginTop: 22 }}>
                  <span>
                    Question {game.index + 1} / {game.total}
                  </span>
                  <span className="timer">
                    {game.question?.type === "slide" ? "Diapo" : game.revealed ? "Terminé" : `${remaining} s`}
                  </span>
                </div>
                <Progress
                  value={game.revealed ? 0 : (remaining / game.duration) * 100}
                  className="question-progress"
                  aria-label="Temps restant"
                />
                <h2 className="question-title">{game.question?.text}</h2>
                {game.question && (
                  <QuestionPlay
                    key={`${code}-${game.index}`}
                    question={game.question}
                    revealed={game.revealed}
                    disabled={busy || game.revealed || remaining === 0 || !game.players.some((p) => p.me)}
                    submitted={game.myAnswer?.answer ?? null}
                    onSubmit={(answer) =>
                      run(async () => {
                        await api("answer", { code, question: game.index, answer });
                        setGame((g) =>
                          g ? { ...g, myAnswer: { choice: answer.choices?.[0] ?? -1, answer } } : g,
                        );
                      })
                    }
                  />
                )}{" "}
                {game.question?.type !== "slide" && (
                  <p className="center hint" role="status">
                    {game.myAnswer && !game.revealed
                      ? "Réponse envoyée. On attend les autres…"
                      : `${game.answered} / ${game.players.length} réponses reçues`}
                  </p>
                )}
                {game.revealed && (
                  <>
                    {game.personal && game.question?.type !== "slide" && <PersonalResult game={game} />}{" "}
                    {game.question && <QuestionResults question={game.question} aggregate={game.aggregate} />}{" "}
                    {game.question?.type !== "slide" && (
                      <>
                        <h2 style={{ marginTop: 24 }}>Qui mène le jeu ?</h2>
                        <Leaderboard players={game.players} />
                      </>
                    )}
                    {game.host ? (
                      <button
                        className="button"
                        style={{ marginTop: 24 }}
                        disabled={busy}
                        onClick={() =>
                          run(async () => {
                            await api("next", { code, question: game.index });
                          })
                        }
                      >
                        {game.index + 1 === game.total ? "Voir le podium" : "Question suivante"}
                      </button>
                    ) : (
                      <p className="center lead">L’animateur prépare la suite…</p>
                    )}
                  </>
                )}
              </>
            )}
          </section>
        )}
      </main>
      <footer>SQUIZZ · ON JOUE ENSEMBLE. ON BRILLE CHACUN SON TOUR.</footer>
    </>
  );
}
function Leaderboard({ players }: { players: Game["players"] }) {
  return (
    <ol className="leaderboard">
      {players.map((p) => (
        <li key={p.name} className={`score-row ${p.me ? "is-me" : ""}`}>
          <span>
            <strong className="rank">{p.rank}</strong> {p.name}
            {p.me ? " (vous)" : ""}
          </span>
          <span className="score-end">
            {p.movement !== null && (
              <span
                className={`movement ${p.movement > 0 ? "up" : ""}`}
                aria-label={`${p.movement > 0 ? "Gain" : "Perte"} de ${Math.abs(p.movement)} places`}
              >
                {p.movement > 0 ? `↑ ${p.movement}` : p.movement < 0 ? `↓ ${-p.movement}` : "—"}
              </span>
            )}
            <strong>{p.score.toLocaleString("fr-FR")} pts</strong>
          </span>
        </li>
      ))}
    </ol>
  );
}

function PersonalResult({ game, final = false }: { game: Game; final?: boolean }) {
  const p = game.personal;
  if (!p) return null;
  const message =
    p.outcome === "correct"
      ? "Bien joué !"
      : p.outcome === "opinion"
        ? "Ta voix compte !"
        : p.outcome === "incorrect"
          ? "Raté… mais rien n’est joué !"
          : "Le chrono t’a devancé !";
  return (
    <div
      className={`personal-result ${p.outcome === "correct" || p.outcome === "opinion" || final ? "won" : "missed"}`}
      role="status"
    >
      <div>
        <p className="eyebrow">{final ? "TON RÉSULTAT FINAL" : "TON RÉSULTAT"}</p>
        <h2>{final ? `${p.correctCount} / ${game.totalScored} bonnes réponses` : message}</h2>
        <p>
          {final
            ? `${p.score.toLocaleString("fr-FR")} points au total`
            : p.outcome === "opinion"
              ? "Réponse enregistrée · question sans points"
              : `+${p.points} points · ${p.score.toLocaleString("fr-FR")} au total`}
        </p>
        <span className="movement-copy">
          {final
            ? "Merci d’avoir joué !"
            : p.movement === null
              ? "Le classement est lancé."
              : p.movement > 0
                ? `Tu gagnes ${p.movement} place${p.movement > 1 ? "s" : ""} !`
                : p.movement < 0
                  ? `Tu recules de ${-p.movement} place${p.movement < -1 ? "s" : ""}. À toi de rebondir !`
                  : "Tu gardes ta place. Garde le rythme !"}
        </span>
      </div>
      <div className="place-sticker">
        <strong>#{p.rank}</strong>
        <span>TA PLACE</span>
        <small>SUR {game.players.length}</small>
      </div>
    </div>
  );
}
function Podium({ players }: { players: RankedPlayer[] }) {
  const top = players.filter((p) => p.rank <= 3);
  const order = top.length >= 2 ? [top[1], top[0], ...top.slice(2)] : top;
  return (
    <div className="podium" aria-label="Podium final">
      {order.map((p) => (
        <div key={p.name} className={`podium-player place-${Math.min(p.rank, 3)}`}>
          <span className="podium-name">
            {p.rank === 1 && <Trophy size={30} />} {p.name}
          </span>
          <div className="podium-step">
            <strong>{p.rank}</strong>
            <span>{p.score.toLocaleString("fr-FR")} pts</span>
            {p.me && <b>C’EST TOI !</b>}
          </div>
        </div>
      ))}
    </div>
  );
}
