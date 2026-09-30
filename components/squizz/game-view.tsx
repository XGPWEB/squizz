"use client";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};
import { X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { QuestionPlay, QuestionResults } from "@/components/squizz/question-play";
import { type Game, Leaderboard, PersonalResult, Podium } from "./game-parts";
import { HostStage } from "./host-stage";
import { invitationOrigin } from "@/lib/invitation";
import { gameApi as api } from "@/lib/client/api";
import { Brand } from "@/components/site/brand";

const LOST = "Connexion perdue, reconnexion…";

/**
 * The live game for hosts and players. Polls the server state: every 0.9 s during a question,
 * every 1.5 s in the lobby, not at all once the game is over or while the tab is hidden.
 */
export function GameView({ code }: { code: string }) {
  const [game, setGame] = useState<Game | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [clock, setClock] = useState(() => Date.now());
  // Read on the client only; the server render has no window (empty until hydration).
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => invitationOrigin(location.origin, process.env.NEXT_PUBLIC_LAN_HOST ?? ""),
    () => "",
  );
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = (ms: number) => {
      if (active) timer = setTimeout(poll, ms);
    };
    async function poll() {
      if (!active || document.hidden) return; // resumed by the visibility listener
      let next = 900;
      try {
        // A phone switching networks can hang a request: give up after 5 s and try again.
        const r = await fetch(`/api/game?action=state&code=${code}`, {
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        });
        const d = await r.json().catch(() => null);
        if (!r.ok || !d) {
          if (r.status === 403 || r.status === 404) {
            if (active) setError(d?.error ?? "Cette partie est introuvable.");
            return; // nothing more to wait for
          }
          throw new Error(d?.error ?? LOST);
        }
        if (!active) return;
        setGame({ ...d, receivedAt: Date.now() });
        setError("");
        if (d.phase === "finished") return;
        next = d.phase === "lobby" ? 1500 : d.startsIn > 0 ? Math.min(900, d.startsIn + 60) : 900;
      } catch (e) {
        if (active)
          setError(e instanceof TypeError || e instanceof DOMException ? LOST : (e as Error).message);
        next = 2000;
      }
      schedule(next);
    }
    const onVisibility = () => {
      if (document.hidden) return;
      clearTimeout(timer);
      poll();
    };
    document.addEventListener("visibilitychange", onVisibility);
    poll();
    const tick = setInterval(() => setClock(Date.now()), 200);
    return () => {
      active = false;
      clearTimeout(timer);
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisibility);
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
  const elapsed = game ? Math.max(0, clock - game.receivedAt) : 0;
  const startsLeft = game ? Math.max(0, game.startsIn - elapsed) : 0;
  const remaining = game
    ? Math.max(0, Math.ceil((game.remaining - Math.max(0, elapsed - game.startsIn)) / 1000))
    : 0;
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
      {game?.host ? (
        <HostStage
          game={game}
          busy={busy}
          run={run}
          joinUrl={joinUrl}
          origin={origin}
          remaining={remaining}
          startsLeft={startsLeft}
          onError={setError}
        />
      ) : game && game.phase === "lobby" ? (
        <PlayerWaiting game={game} />
      ) : (
        game && (
          <>
            <div className="play-top">
              <Brand href={null} />
            </div>
            <section className={`panel game-panel ${game.phase === "finished" ? "final-panel" : ""}`}>
              {game.phase === "finished" ? (
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
                    <Link className="button" href="/">
                      On remet ça ?
                    </Link>
                  </div>
                </>
              ) : !game.question ? (
                // "Ready?" countdown: the question opens at the same moment on every screen.
                <div className="ready-countdown" role="status" aria-live="assertive">
                  <span className="eyebrow">
                    ÉTAPE {game.index + 1} / {game.total}
                  </span>
                  <strong>Prêt ?</strong>
                  <span className="ready-number" key={Math.ceil(startsLeft / 1000)}>
                    {Math.max(1, Math.ceil(startsLeft / 1000))}
                  </span>
                </div>
              ) : (
                <>
                  <div className="row spaced" style={{ marginTop: 22 }}>
                    <span>
                      {game.question?.type === "slide" ? "Étape" : "Question"} {game.index + 1} / {game.total}
                    </span>
                    <span className="timer">
                      {game.question?.type === "slide"
                        ? "Diapo"
                        : game.revealed
                          ? "Terminé"
                          : `${remaining} s`}
                    </span>
                  </div>
                  <Progress
                    value={game.revealed ? 0 : (remaining / game.duration) * 100}
                    className="question-progress"
                    aria-label="Temps restant"
                  />
                  {game.question?.type !== "slide" && (
                    <h2 className="question-title" aria-live="polite">
                      {game.question?.text}
                    </h2>
                  )}
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
                      {game.question && (
                        <QuestionResults question={game.question} aggregate={game.aggregate} />
                      )}{" "}
                      {game.question?.type !== "slide" && (
                        <>
                          <h2 style={{ marginTop: 24 }}>Qui mène le jeu ?</h2>
                          <Leaderboard players={game.players} />
                        </>
                      )}
                      <p className="center lead">L’animateur prépare la suite…</p>
                    </>
                  )}
                </>
              )}
            </section>
          </>
        )
      )}
    </>
  );
}

/** What a player sees once registered, until the host starts the quiz. */
function PlayerWaiting({ game }: { game: Game }) {
  const me = game.players.find((p) => p.me);
  const others = game.players.length - (me ? 1 : 0);
  return (
    <div className="play-waiting" role="status" aria-live="polite">
      <Brand href={null} className="brand-live brand-big" />
      {me ? (
        <>
          <h1>
            C’est bon, <span>{me.name}</span> !
          </h1>
          <p className="lead">Tu es bien inscrit·e à la partie.</p>
          <p className="play-waiting-note">
            On attend tous les joueurs
            <span className="dots" aria-hidden>
              <i>.</i>
              <i>.</i>
              <i>.</i>
            </span>
          </p>
          <p className="hint">
            {others === 0
              ? "Tu es le premier joueur arrivé."
              : `${others} autre${others > 1 ? "s" : ""} joueur${others > 1 ? "s" : ""} avec toi.`}{" "}
            L’animateur va lancer le quiz.
          </p>
        </>
      ) : (
        <>
          <h1>Presque prêt !</h1>
          <p className="lead">Choisis un pseudo pour rejoindre cette partie.</p>
          <Link className="button" href={`/jouer?code=${game.code}`}>
            Rejoindre la partie
          </Link>
        </>
      )}
    </div>
  );
}
