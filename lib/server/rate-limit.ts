import "server-only";
import { prisma } from "@/lib/prisma";

/** Fixed-window counter stored in Postgres, so it holds across restarts and PM2 workers. */
export async function rateLimit(key: string, maxAttempts: number, windowSeconds: number) {
  // Integration tests create many accounts from one address; the real limits apply in production only.
  maxAttempts *= limitScale();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowSeconds * 1000);
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowEnd") VALUES (${key}, 1, ${windowEnd})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowEnd" < ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowEnd" = CASE WHEN "RateLimit"."windowEnd" < ${now} THEN ${windowEnd} ELSE "RateLimit"."windowEnd" END
    RETURNING "count"`;
  return { allowed: rows[0].count <= maxAttempts, count: rows[0].count };
}

/** Current count of a fixed window, without counting this call (0 when the window is over). */
export async function peekRateLimit(key: string) {
  const row = await prisma.rateLimit.findUnique({ where: { key } });
  return row && row.windowEnd > new Date() ? row.count : 0;
}

/** Same scale as rateLimit(): real limits in production only. */
export const limitScale = () => (process.env.NODE_ENV !== "production" ? 100 : 1);

export async function clearRateLimit(key: string) {
  await prisma.rateLimit.deleteMany({ where: { key } });
}

export function clientIp(headers: Headers | Record<string, string | string[] | undefined> | undefined) {
  const get = (name: string) => {
    if (!headers) return undefined;
    if (headers instanceof Headers) return headers.get(name) ?? undefined;
    const v = headers[name];
    return Array.isArray(v) ? v[0] : v;
  };
  // Nginx sets x-real-ip from the TCP connection; x-forwarded-for can be forged by the client.
  return get("x-real-ip")?.trim() || get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
