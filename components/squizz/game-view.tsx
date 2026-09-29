"use client";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import { Play, Users, Trophy, Copy, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { QuestionPlay, QuestionResults } from "@/components/squizz/question-play";
import { type PublicQuestion, type Aggregate, type AnswerPayload } from "@/lib/question";
import { invitationOrigin } from "@/lib/invitation";
import { gameApi as api } from "@/lib/client/api";

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
  maxPlayers: number;
  question: PublicQuestion | null;
  aggregate: Aggregate | null;
  players: RankedPlayer[];
  personal:
    | (RankedPlayer & { points: number; outcome: "correct" | "incorrect" | "timeout" | "opinion" | "slide" })
    | null;
  answered: number;
  myAnswer: { choice: number; answer: AnswerPayload; points?: number } | null;
};

/** The live game for hosts and players; polls the server state every 900 ms. */
export function GameView({ code }: { code: string }) {
  const [game, setGame] = useState<Game | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [name, setName] = useState(""),
    [copied, setCopied] = useState(false),
    [clock, setClock] = useState(() => Date.now()),
    [origin, setOrigin] = useState("");
  const received = useRef(0);
  useEffect(() => {
    setOrigin(invitationOrigin(location.origin, process.env.NEXT_PUBLIC_LAN_HOST ?? ""));
  }, []);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const r = await fetch(`/api/game?action=state&code=${code}`, { cache: "no-store" });
        const d = await r.json();
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
  }, [code]);
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
  const remaining = game ? Math.max(0, Math.ceil((game.remaining - (clock - received.current)) / 1000)) : 0;
  const joinUrl = `${origin}/jouer?code=${code}`;
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
      {!game && !error && (
        <div className="panel center" role="status">
          Connexion à la partie…
        </div>
      )}
      {!game && error && (
        <div className="center" style={{ marginTop: 20 }}>
          <Link className="button" href="/jouer">
            Rejoindre une autre partie
          </Link>
        </div>
      )}
      {game && (
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
                        const url = joinUrl;
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
                      value={joinUrl}
                      size={224}
                      level="M"
                      marginSize={4}
                      title="Scanner pour rejoindre cette partie SQuizz"
                    />
                  )}
                  <strong>SCANNE & JOUE</strong>
                  <a href={joinUrl} target="_blank" rel="noopener noreferrer">
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
                <span className="hint"> · {game.maxPlayers} maximum</span>
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
                <Link className="button" href={game.host ? "/app" : "/"}>
                  {game.host ? "Retour à mes quiz" : "On remet ça ?"}
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="row spaced" style={{ marginTop: 22 }}>
                <span>
                  {game.question?.type === "slide" ? "Étape" : "Question"} {game.index + 1} / {game.total}
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
              {game.question?.type !== "slide" && <h2 className="question-title">{game.question?.text}</h2>}
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
                      {game.index + 1 === game.total
                        ? "Voir le podium"
                        : game.question?.type === "slide"
                          ? "Continuer"
                          : "Question suivante"}
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
