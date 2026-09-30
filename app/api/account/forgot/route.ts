import { z } from "zod";
import { route, json, emailSchema } from "@/lib/server/api";
import { requestPasswordReset } from "@/lib/server/accounts";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { fail } from "@/lib/server/http";

/**
 * Always answers the same way and at the same speed: the email (if the account exists) is sent
 * after the response, so neither the message nor the timing reveals whether an account exists.
 */
export const POST = route(async (req) => {
  if (!(await rateLimit(`forgot:${clientIp(req.headers)}`, 5, 60 * 60)).allowed)
    fail("Trop de demandes. Réessayez plus tard.", 429);
  const { email } = await json(req, z.object({ email: emailSchema }));
  // Per account too, so nobody can flood someone's inbox or keep invalidating their link.
  if ((await rateLimit(`forgot:email:${email}`, 3, 60 * 60)).allowed)
    void requestPasswordReset(email).catch((err) => console.error("[forgot]", err));
  return { ok: true };
});
