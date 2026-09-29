import { z } from "zod";
import { route, json, emailSchema } from "@/lib/server/api";
import { requestPasswordReset } from "@/lib/server/accounts";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { fail } from "@/lib/server/http";

export const POST = route(async (req) => {
  if (!(await rateLimit(`forgot:${clientIp(req.headers)}`, 5, 60 * 60)).allowed)
    fail("Trop de demandes. Réessayez plus tard.", 429);
  const { email } = await json(req, z.object({ email: emailSchema }));
  await requestPasswordReset(email);
  return { ok: true };
});
