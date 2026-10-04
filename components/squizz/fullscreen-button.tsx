"use client";
import { useSyncExternalStore } from "react";
import { Maximize, Minimize } from "lucide-react";

/** Safari kept its prefixed names for a long time: both spellings are tried. */
type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type FullscreenRoot = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

const subscribe = (onChange: () => void) => {
  document.addEventListener("fullscreenchange", onChange);
  document.addEventListener("webkitfullscreenchange", onChange);
  return () => {
    document.removeEventListener("fullscreenchange", onChange);
    document.removeEventListener("webkitfullscreenchange", onChange);
  };
};
const isFull = () => {
  const doc = document as FullscreenDocument;
  return Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement);
};
const isSupported = () => {
  const root = document.documentElement as FullscreenRoot;
  return Boolean(root.requestFullscreen ?? root.webkitRequestFullscreen);
};

/**
 * Hides the browser's own bars (address, tabs) around the projected screen. The whole page goes full
 * screen, not only the stage, so the pop-up windows of the results stay visible. Not shown where the
 * browser cannot do it (iPhone).
 */
export function FullscreenButton() {
  const full = useSyncExternalStore(subscribe, isFull, () => false);
  const supported = useSyncExternalStore(
    () => () => {},
    isSupported,
    () => false,
  );
  if (!supported) return null;

  const toggle = () => {
    const doc = document as FullscreenDocument;
    const root = document.documentElement as FullscreenRoot;
    // A refusal (browser setting, embedded page) leaves the screen as it is: nothing to report.
    const done = full
      ? (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.())
      : (root.requestFullscreen?.({ navigationUI: "hide" }) ?? root.webkitRequestFullscreen?.());
    void Promise.resolve(done).catch(() => null);
  };

  return (
    <button
      type="button"
      className="button secondary small host-fullscreen"
      aria-pressed={full}
      title={full ? "Quitter le plein écran (Échap)" : "Afficher en plein écran"}
      onClick={toggle}
    >
      {full ? <Minimize size={18} aria-hidden /> : <Maximize size={18} aria-hidden />}
      <span>{full ? "Quitter le plein écran" : "Plein écran"}</span>
    </button>
  );
}
