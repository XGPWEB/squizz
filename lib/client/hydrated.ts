import { useSyncExternalStore } from "react";

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
