import type { KeyboardEvent } from "react";

const NEXT = ["ArrowRight", "ArrowDown"];
const PREVIOUS = ["ArrowLeft", "ArrowUp"];

/**
 * Keyboard of a group of buttons drawn as radios (role="radiogroup" / role="radio"), as native radios
 * behave: the arrows move to the previous or next option and select it, Home and End go to the ends.
 * Pair it with `tabIndex={checked ? 0 : -1}` on each radio, so Tab enters the group on the selected option
 * and leaves it with the next Tab.
 */
export function onRadioKeys(e: KeyboardEvent<HTMLElement>) {
  if (![...NEXT, ...PREVIOUS, "Home", "End"].includes(e.key)) return;
  const group = e.currentTarget;
  const radios = [...group.querySelectorAll<HTMLButtonElement>('[role="radio"]')].filter(
    (r) => !r.disabled && r.closest('[role="radiogroup"]') === group,
  );
  const current = radios.indexOf(document.activeElement as HTMLButtonElement);
  if (current < 0 || !radios.length) return;
  e.preventDefault();
  const last = radios.length - 1;
  const next =
    e.key === "Home"
      ? 0
      : e.key === "End"
        ? last
        : NEXT.includes(e.key)
          ? (current + 1) % radios.length
          : (current - 1 + radios.length) % radios.length;
  radios[next].focus();
  if (radios[next].getAttribute("aria-checked") !== "true") radios[next].click();
}
