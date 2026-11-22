import { cloneElement, isValidElement, useSyncExternalStore, type ReactElement, type ReactNode } from "react";

/**
 * False on the server and until the page's script has started. What is typed before that stays on screen
 * but never reaches the component's state: forms wait for this before they open or send anything.
 */
export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/**
 * The button that opens a dialog, closed until the page's script has started: a click before that would
 * open nothing, without a word. `data-starting` keeps it from looking greyed out for that moment.
 */
export function useReadyTrigger(trigger: ReactNode): ReactNode {
  const ready = useHydrated();
  if (ready || !isValidElement(trigger)) return trigger;
  return cloneElement(trigger as ReactElement<Record<string, unknown>>, {
    disabled: true,
    "data-starting": "",
  });
}
