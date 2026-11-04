"use client";
import { Dialog } from "radix-ui";
import { useState } from "react";
import { Dices, Play, User, Users, X } from "lucide-react";
import { MAX_TEAM_NAME, MAX_TEAMS, randomTeamNames, TEAMS } from "@/lib/teams";

export type LaunchChoice = { teams: number; teamNames: string[] };

/**
 * Before the waiting room opens: everyone for themselves, or in teams. With teams, the host picks
 * how many and names them, or keeps the funny names drawn here (a die draws others).
 */
export function LaunchDialog({
  title,
  trigger,
  busy,
  onLaunch,
}: {
  title: string;
  trigger: React.ReactNode;
  busy: boolean;
  onLaunch: (choice: LaunchChoice) => void;
}) {
  const [open, setOpen] = useState(false),
    [teamMode, setTeamMode] = useState(false),
    [names, setNames] = useState<string[]>([]),
    // Bumped on each draw, so the drawn names play their little arrival again.
    [rolls, setRolls] = useState<number[]>([]);
  const count = names.length;
  const setCount = (n: number) => {
    const kept = names.slice(0, n);
    setNames([...kept, ...randomTeamNames(n - kept.length, kept)]);
    setRolls((r) => Array.from({ length: n }, (_, i) => r[i] ?? 0));
  };
  const reroll = (only?: number) => {
    const fresh = randomTeamNames(count, names);
    setNames(names.map((n, i) => (only === undefined || only === i ? fresh[i] : n)));
    setRolls((r) => r.map((v, i) => (only === undefined || only === i ? v + 1 : v)));
  };
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o && !names.length) {
          setNames(randomTeamNames(2));
          setRolls([0, 0]);
        }
      }}
    >
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="host-overlay" />
        <Dialog.Content className="host-modal launch-modal" aria-describedby="launch-help">
          <div className="host-modal-head">
            <Dialog.Title className="host-modal-title">Lancer « {title} »</Dialog.Title>
            <Dialog.Close className="host-modal-close" aria-label="Fermer">
              <X size={22} />
            </Dialog.Close>
          </div>
          <form
            method="post"
            className="host-modal-body launch-body"
            onSubmit={(e) => {
              e.preventDefault();
              onLaunch(teamMode ? { teams: count, teamNames: names } : { teams: 0, teamNames: [] });
            }}
          >
            <p id="launch-help">Comment voulez-vous jouer ?</p>
            <div className="launch-modes" role="radiogroup" aria-label="Façon de jouer">
              <button
                type="button"
                role="radio"
                aria-checked={!teamMode}
                className={!teamMode ? "on" : ""}
                onClick={() => setTeamMode(false)}
              >
                <User aria-hidden />
                <strong>Chacun pour soi</strong>
                <small>Un classement des joueurs</small>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={teamMode}
                className={teamMode ? "on" : ""}
                onClick={() => setTeamMode(true)}
              >
                <Users aria-hidden />
                <strong>En équipes</strong>
                <small>Score moyen de chaque équipe</small>
              </button>
            </div>
            {teamMode && (
              <div className="launch-teams">
                <div className="launch-count" role="radiogroup" aria-label="Nombre d’équipes">
                  <span className="eyebrow">NOMBRE D’ÉQUIPES</span>
                  {Array.from({ length: MAX_TEAMS - 1 }, (_, i) => i + 2).map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={count === n}
                      className={count === n ? "on" : ""}
                      onClick={() => setCount(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <ol className="launch-names">
                  {names.map((name, i) => (
                    <li key={i} className={`team-${TEAMS[i]?.color ?? "electric"}`}>
                      <span className="launch-swatch" aria-hidden />
                      <input
                        key={rolls[i]}
                        className={rolls[i] ? "rolled" : ""}
                        value={name}
                        maxLength={MAX_TEAM_NAME}
                        placeholder={TEAMS[i]?.name}
                        aria-label={`Nom de l’équipe ${i + 1}`}
                        onChange={(e) => setNames(names.map((n, j) => (j === i ? e.target.value : n)))}
                      />
                      <button
                        type="button"
                        className="launch-die"
                        aria-label={`Tirer un autre nom pour l’équipe ${i + 1}`}
                        title="Un autre nom"
                        onClick={() => reroll(i)}
                      >
                        <Dices size={18} />
                      </button>
                    </li>
                  ))}
                </ol>
                <button
                  type="button"
                  className="button secondary small launch-reroll"
                  onClick={() => reroll()}
                >
                  <Dices size={16} /> Tout tirer au sort
                </button>
                <p className="hint">
                  Les joueurs choisissent leur équipe sur leur téléphone, ou vous les répartissez au hasard
                  dans la salle d’attente.
                </p>
              </div>
            )}
            <button type="submit" className="button launch-go" disabled={busy}>
              <Play size={18} fill="currentColor" /> {busy ? "Ouverture…" : "Ouvrir la salle d’attente"}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
