/**
 * The wheel of fortune: the server draws, every screen plays the same spin. Segment i covers
 * [i, i + 1) × 360 / n degrees clockwise from the top, where the pointer is.
 */

/** How long a spin lasts on every screen. */
export const SPIN_MS = 5200;

export type Spin = {
  /** Changes with every spin, so screens know a new one started. */
  id: number;
  entries: string[];
  winner: number;
  /** Where in the winning segment the pointer stops, from -0.5 to 0.5 of a segment. */
  offset: number;
  /** Full turns before stopping. */
  turns: number;
  /** Server time of the spin (milliseconds). */
  at: number;
};

/** What the wheel holds: the author's list, or else the players' nicknames. */
export const wheelEntries = (options: string[], players: string[]) =>
  options.length ? options : [...players].sort((a, b) => a.localeCompare(b, "fr"));

/** The wheel's rotation at the end of a spin, in degrees: the winner's segment under the pointer. */
export function finalAngle(spin: Pick<Spin, "entries" | "winner" | "offset" | "turns">) {
  const segment = 360 / spin.entries.length;
  return 360 * spin.turns - (spin.winner + 0.5 + spin.offset) * segment;
}

/** The rotation `elapsed` milliseconds into a spin: fast at first, slowing down to a stop. */
export function angleAt(spin: Pick<Spin, "entries" | "winner" | "offset" | "turns">, elapsed: number) {
  const x = Math.min(1, Math.max(0, elapsed / SPIN_MS));
  return finalAngle(spin) * (1 - (1 - x) ** 4);
}

/** A new spin, drawn with the given random source (crypto on the server). */
export function drawSpin(entries: string[], random: () => number, now: number): Spin {
  return {
    id: Math.floor(random() * 2 ** 31),
    entries,
    winner: Math.min(entries.length - 1, Math.floor(random() * entries.length)),
    offset: (random() - 0.5) * 0.7,
    turns: 5 + Math.floor(random() * 3),
    at: now,
  };
}
