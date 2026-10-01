import { expect, test, vi } from "vitest";
import { CACHE_MS, sessionAlive, sessionCacheSize } from "@/lib/server/session-check";

test("la révocation est relue au plus tard après la durée du cache", async () => {
  let alive = true;
  const read = vi.fn(async () => alive);
  const t0 = 1_000_000;
  expect(await sessionAlive("u1", 3, false, read, t0)).toBe(true);
  alive = false; // password changed, account deactivated, organisation suspended…
  expect(await sessionAlive("u1", 3, false, read, t0 + CACHE_MS - 1)).toBe(true); // still cached
  expect(read).toHaveBeenCalledTimes(1);
  expect(await sessionAlive("u1", 3, false, read, t0 + CACHE_MS)).toBe(false);
  expect(read).toHaveBeenCalledTimes(2);
  // A token without a version, or a database error, never counts as a live session.
  expect(await sessionAlive("u1", undefined, false, read, t0)).toBe(false);
  const failing = vi.fn(async () => {
    throw new Error("db down");
  });
  expect(await sessionAlive("u2", 1, false, failing, t0)).toBe(false);
  expect(await sessionAlive("u2", 1, false, async () => true, t0)).toBe(true); // the error was not cached
});

test("le cache reste borné", async () => {
  for (let i = 0; i < 2_500; i++) await sessionAlive(`many-${i}`, 1, false, async () => true, 5_000_000);
  expect(sessionCacheSize()).toBeLessThanOrEqual(2_000);
});
