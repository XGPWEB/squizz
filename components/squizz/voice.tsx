"use client";
import { createContext, useContext } from "react";

/**
 * How the game speaks to players: « tu » in the colourful SQuizz theme, « vous » in the sober one, meant
 * for companies and administrations. `say("Ta réponse", "Votre réponse")` picks the right one.
 */
export type Say = (tu: string, vous: string) => string;
const tu: Say = (t) => t;
const vous: Say = (_, v) => v;
export const sayFor = (theme?: string | null): Say => (theme === "sober" ? vous : tu);

const Voice = createContext<Say>(tu);
export function VoiceProvider({ theme, children }: { theme?: string | null; children: React.ReactNode }) {
  return <Voice.Provider value={sayFor(theme)}>{children}</Voice.Provider>;
}
export const useSay = () => useContext(Voice);
