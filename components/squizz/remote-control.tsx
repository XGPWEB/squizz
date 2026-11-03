"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Ban, Gauge, Play, SkipForward, Square, Users, X } from "lucide-react";
import { asksNothing } from "@/lib/question";
import { postJson, UncertainError } from "@/lib/client/api";
import { type Game, Leaderboard, TeamBoard } from "./game-parts";
import { QuestionResults } from "./question-play";

const subscribeHash = (change: () => void) => {
  window.addEventListener("hashchange", change);
  return () => window.removeEventListener("hashchange", change);
};

/**
 * The host's phone as a remote control: follows the game and drives it through the secret link shown on
 * the big screen (the secret travels after the « # », so it never reaches a server log).
 */
export function RemoteControl({ code }: { code: string }) {
  // The secret after the « # »: read in the browser only (null while rendered on the server).
  const hash = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash.slice(1),
    () => null,
  );
  const token = hash && /^[a-f0-9]{32}$/.test(hash) ? hash : "";
  const [game, setGame] = useState<Game | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [clock, setClock] = useState(0);
  const failures = useRef(0);

  useEffect(() => {
    if (!token) return;
    let stop = false;
    const tick = async () => {
      try {
        const data = await postJson<Omit<Game, "receivedAt">>(
          "/api/game",
          { action: "state", code, remote: token },
          "POST",
          5000,
        );
        if (stop) return;
        failures.current = 0;
        setGame({ ...data, receivedAt: Date.now() } as Game);
        setError("");
      } catch (e) {
        if (stop) return;
        failures.current++;
        if (!(e instanceof UncertainError) || failures.current > 3) setError((e as Error).message);
      }
    };
    void tick();
    const poll = setInterval(tick, 1000);
    const timer = setInterval(() => setClock(Date.now()), 250);
    return () => {
      stop = true;
      clearInterval(poll);
      clearInterval(timer);
    };
  }, [code, token]);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    if (busy || !game) return;
    setBusy(true);
    setError("");
    try {
      await postJson("/api/game", { action, code, remote: token, question: game.index, ...extra });
      if ("vibrate" in navigator) navigator.vibrate(12);
    } catch (e) {
      // A lost answer: the next poll shows whether it went through; every control is safe to press again.
      if (!(e instanceof UncertainError)) setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const elapsed = game ? Math.max(0, clock - game.receivedAt) : 0;
  const startsLeft = game ? Math.max(0, game.startsIn - elapsed) : 0;
  const remaining = game
    ? Math.max(0, Math.ceil((game.remaining - Math.max(0, elapsed - game.startsIn)) / 1000))
    : 0;
  const q = game?.question ?? null;
  const silent = !!q && asksNothing(q.type);
  const last = !!game && game.index + 1 >= game.total;
  const brand = game?.brand;

  return (
    <div
      className={`game-theme theme-${brand?.theme ?? "squizz"}`}
      style={brand ? ({ "--brand": brand.accent } as React.CSSProperties) : undefined}
    >
      <section className="remote">
        <header className="remote-head">
          <span className="remote-tag">
            <Gauge size={15} aria-hidden /> TÉLÉCOMMANDE
          </span>
          <strong>{game?.title ?? "Connexion…"}</strong>
          {game && (
            <small>
              {game.phase === "lobby"
                ? `Salle d’attente · code ${game.code}`
                : game.phase === "finished"
                  ? "Partie terminée"
                  : `${silent ? "Étape" : "Question"} ${game.index + 1} / ${game.total}`}
            </small>
          )}
        </header>
        {hash !== null && !token && (
          <div className="error" role="alert">
            Ce lien de télécommande est incomplet : scannez à nouveau le code affiché sur le grand écran.
          </div>
        )}
        {error && (
          <div className="error" role="alert">
            {error}{" "}
            <button className="text-button" onClick={() => setError("")} aria-label="Fermer le message">
              <X size={16} />
            </button>
          </div>
        )}
        {game && game.phase === "lobby" && (
          <>
            <div className="remote-stat">
              <Users aria-hidden />
              <b>{game.players.length}</b>
              <span>joueur{game.players.length > 1 ? "s" : ""} dans la salle</span>
            </div>
            <ul className="remote-players">
              {game.players.map((p) => (
                <li key={p.name}>
                  <span>{p.name}</span>
                  <button
                    type="button"
                    className="text-button"
                    disabled={busy}
                    aria-label={`Retirer ${p.name} de la partie`}
                    onClick={() => {
                      if (confirm(`Retirer ${p.name} de la partie ? Ce joueur ne pourra pas revenir.`))
                        void act("kick", { name: p.name });
                    }}
                  >
                    <Ban size={16} />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="button remote-main"
              disabled={busy || !game.players.length}
              onClick={() => act("start")}
            >
              <Play size={22} /> Lancer le quiz
            </button>
          </>
        )}
        {game && game.phase === "question" && (
          <>
            {startsLeft > 0 ? (
              <p className="remote-ready">Prêt ? {Math.ceil(startsLeft / 1000)}</p>
            ) : (
              q && (
                <>
                  <h1 className="remote-question">{q.text}</h1>
                  {!silent && (
                    <div className="remote-live">
                      <div>
                        <b>{game.answered}</b>
                        <span>/ {game.players.length} réponses</span>
                      </div>
                      <div>
                        <b>{game.revealed ? "0" : remaining}</b>
                        <span>secondes</span>
                      </div>
                      <i
                        aria-hidden
                        style={{
                          width: `${(100 * game.answered) / Math.max(1, game.players.length)}%`,
                        }}
                      />
                    </div>
                  )}
                  {q.type === "wheel" && (
                    <button
                      type="button"
                      className="button secondary remote-main"
                      disabled={busy || (game.wheel?.entries.length ?? 0) < 2}
                      onClick={() => act("spin", { after: game.wheel?.spin?.id ?? null })}
                    >
                      {game.wheel?.spin ? "Relancer la roue" : "Lancer la roue"}
                    </button>
                  )}
                  {!game.revealed && !silent ? (
                    <button
                      type="button"
                      className="button secondary remote-main"
                      disabled={busy}
                      onClick={() => act("close")}
                    >
                      <Square size={20} /> Arrêter et corriger
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="button remote-main"
                      disabled={busy}
                      onClick={() => act("next")}
                    >
                      <SkipForward size={22} />{" "}
                      {last ? (game.profileQuiz ? "Révéler le profil" : "Voir le podium") : "Suite"}
                    </button>
                  )}
                  {game.revealed && !silent && (
                    <details className="remote-details">
                      <summary>Réponses et classement</summary>
                      <QuestionResults
                        question={q}
                        aggregate={game.aggregate}
                        players={game.players.length}
                      />
                      {!game.profileQuiz &&
                        (game.teams ? (
                          <TeamBoard standings={game.teams.standings} />
                        ) : (
                          <Leaderboard players={game.players.slice(0, 5)} />
                        ))}
                    </details>
                  )}
                </>
              )
            )}
          </>
        )}
        {game && game.phase === "finished" && (
          <>
            <p className="remote-ready">La partie est terminée.</p>
            {!game.profileQuiz &&
              (game.teams ? (
                <TeamBoard standings={game.teams.standings} />
              ) : (
                <Leaderboard players={game.players} />
              ))}
          </>
        )}
      </section>
    </div>
  );
}
