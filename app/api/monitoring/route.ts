import { z } from "zod";
import { route, json } from "@/lib/server/api";
import { fail } from "@/lib/server/http";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { reportAlert } from "@/lib/server/monitoring";

const schema = z.object({
  message: z.string().trim().min(1).max(500),
  path: z.string().max(300).optional(),
});

/**
 * A page that crashed in the visitor's browser (app/error.tsx) says so here, so the failure shows on the
 * monitoring page. Open to everyone, hence limited per address; nothing personal is kept.
 */
export const POST = route(async (req) => {
  const { allowed } = await rateLimit(`monitoring:${clientIp(req.headers)}`, 10, 3600);
  if (!allowed) fail("Trop de rapports.", 429);
  const input = await json(req, schema);
  await reportAlert({ type: "client", message: input.message, path: input.path });
  return { ok: true };
});
