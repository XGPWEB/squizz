import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Whether a session token still stands: the account exists, is active, has not been signed out everywhere
 * since (sessionVersion) and — for members — its organisation is not suspended.
 *
 * Used by the game's polling, which runs about once a second per screen: the answer is cached per process
 * for a few seconds, in a map that never grows past MAX_ENTRIES. A revocation therefore takes effect on
 * polling within CACHE_MS at most (immediately everywhere else, which reads the database every time).
 */
export const CACHE_MS = 5_000;
const MAX_ENTRIES = 2_000;

type Entry = { at: number; alive: Promise<boolean> };
const cache = new Map<string, Entry>();

export async function readSessionState(id: string, sessionVersion: number, superAdminOnly: boolean) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { active: true, sessionVersion: true, role: true, organization: { select: { status: true } } },
  });
  if (!user || !user.active || user.sessionVersion !== sessionVersion) return false;
  if (user.role === "SUPER_ADMIN") return true;
  return !superAdminOnly && user.organization?.status === "ACTIVE";
}

/** `read` is injectable for tests. */
export function sessionAlive(
  id: string,
  sessionVersion: unknown,
  superAdminOnly = false,
  read: typeof readSessionState = readSessionState,
  now = Date.now(),
): Promise<boolean> {
  if (typeof sessionVersion !== "number") return Promise.resolve(false);
  const key = `${superAdminOnly ? "a" : "u"}:${id}:${sessionVersion}`;
  const hit = cache.get(key);
  if (hit && now - hit.at < CACHE_MS) return hit.alive;
  // A database error must not be cached as « revoked », nor let a revoked session through.
  const alive = read(id, sessionVersion, superAdminOnly).catch(() => {
    cache.delete(key);
    return false;
  });
  cache.delete(key);
  cache.set(key, { at: now, alive });
  // Bounded: drop the oldest entries (a Map keeps insertion order).
  while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  return alive;
}

export const sessionCacheSize = () => cache.size;
