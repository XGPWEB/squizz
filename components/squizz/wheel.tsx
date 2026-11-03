"use client";
import { useEffect, useRef, useState } from "react";
import { Dices, RotateCw } from "lucide-react";
import { angleAt, finalAngle, SPIN_MS, type Spin } from "@/lib/wheel";

const COLORS = [
  ["var(--electric)", "white"],
  ["var(--acid)", "var(--ink)"],
  ["var(--pink)", "var(--ink)"],
  ["var(--orange)", "var(--ink)"],
] as const;

/** A point on the circle, `deg` clockwise from the top. */
const at = (deg: number, r: number) => {
  const rad = (deg * Math.PI) / 180;
  return `${(r * Math.sin(rad)).toFixed(3)} ${(-r * Math.cos(rad)).toFixed(3)}`;
};
const short = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

export type WheelSpin = Spin & { elapsed: number };

/**
 * The wheel, turning the same way on every screen: each one works out the angle from how far into the
 * spin the server says we are, so a phone that joins late lands on the same name at the same moment.
 */
export function Wheel({
  entries,
  spin,
  size = "screen",
  me,
  onSpin,
  busy = false,
}: {
  entries: string[];
  spin: WheelSpin | null;
  size?: "screen" | "phone" | "preview";
  /** The player's nickname, to tell them when the wheel picks them. */
  me?: string;
  /** Shown to the host only. */
  onSpin?: () => void;
  busy?: boolean;
}) {
  const shown = spin?.entries ?? entries;
  // Updated on each animation frame only; until the first frame of a new spin, worked out from the spin.
  const [frameState, setFrameState] = useState<{ id: number; angle: number; done: boolean } | null>(null);
  const frame = useRef(0);
  useEffect(() => {
    if (!spin) return;
    const start = performance.now() - spin.elapsed;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = () => {
      const elapsed = reduce ? SPIN_MS : performance.now() - start;
      const done = elapsed >= SPIN_MS;
      setFrameState({ id: spin.id, angle: done ? finalAngle(spin) : angleAt(spin, elapsed), done });
      if (!done) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
    // A new spin is a new id; the elapsed time only matters when it starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spin?.id]);
  const current =
    spin && frameState?.id === spin.id
      ? frameState
      : spin
        ? { angle: angleAt(spin, spin.elapsed), done: spin.elapsed >= SPIN_MS }
        : { angle: 0, done: false };
  const { angle, done } = current;

  const n = Math.max(1, shown.length);
  const segment = 360 / n;
  const font = n > 20 ? 3.2 : n > 12 ? 4 : n > 6 ? 5 : 6;
  const max = n > 12 ? 12 : 16;
  const winner = spin && done ? spin.entries[spin.winner] : null;
  const spinning = !!spin && !done;
  return (
    <div className={`wheel wheel-${size} ${spinning ? "spinning" : ""} ${winner ? "landed" : ""}`}>
      <div className="wheel-disc">
        <svg viewBox="-52 -52 104 104" role="img" aria-label={`Roue de ${shown.length} entrées`}>
          <g style={{ transform: `rotate(${angle}deg)` }}>
            {shown.length < 2 ? (
              <circle r="48" fill="white" stroke="var(--ink)" strokeWidth="1.6" />
            ) : (
              shown.map((label, i) => {
                // The last segment never takes the first one's colour, its neighbour.
                const [fill, ink] = n % 4 === 1 && i === n - 1 ? COLORS[2] : COLORS[i % 4];
                const a0 = i * segment;
                const a1 = (i + 1) * segment;
                const center = a0 + segment / 2;
                // On the left half of the screen, a label along the radius would read upside down.
                const facing = (((center + angle) % 360) + 360) % 360;
                const flip = facing > 180 && facing < 360;
                return (
                  <g key={i} className={winner && i === spin!.winner ? "won" : ""}>
                    <path
                      d={`M0 0 L${at(a0, 48)} A48 48 0 ${segment > 180 ? 1 : 0} 1 ${at(a1, 48)} Z`}
                      fill={fill}
                      stroke="var(--ink)"
                      strokeWidth="1.2"
                      strokeLinejoin="round"
                    />
                    <text
                      transform={`rotate(${center}) translate(0 -27) rotate(${flip ? 90 : -90})`}
                      fill={ink}
                      fontSize={font}
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {short(label, max)}
                    </text>
                  </g>
                );
              })
            )}
          </g>
          <circle r="7" fill="var(--ink)" />
          <circle r="3" fill="var(--acid)" />
          <path className="wheel-pointer" d="M-6 -54 L6 -54 L0 -41 Z" fill="var(--ink)" />
        </svg>
      </div>
      {winner ? (
        <p className="wheel-winner" role="status" aria-live="assertive">
          <span>{me && winner === me ? "C’est toi !" : "La roue a choisi"}</span>
          <strong key={spin!.id}>{winner}</strong>
        </p>
      ) : (
        <p className="wheel-status" role="status">
          {spinning
            ? "La roue tourne…"
            : shown.length < 2
              ? "Il faut au moins deux joueurs pour lancer la roue."
              : onSpin
                ? `${shown.length} entrées sur la roue`
                : "Regardez l’écran : l’animateur va lancer la roue."}
        </p>
      )}
      {onSpin && (
        <button
          type="button"
          className="button host-primary wheel-button"
          disabled={busy || spinning || shown.length < 2}
          onClick={onSpin}
        >
          {spin ? <RotateCw size={20} /> : <Dices size={20} />} {spin ? "Relancer la roue" : "Lancer la roue"}
        </button>
      )}
    </div>
  );
}
