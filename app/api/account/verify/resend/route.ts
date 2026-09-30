import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, json, emailSchema } from "@/lib/server/api";
import { sendEmailVerification } from "@/lib/server/accounts";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { fail } from "@/lib/server/http";
import { safeNext } from "@/lib/next-path";

/**
 * Sends a new confirmation link. Same answer whether or not the address has an unconfirmed account, so it
 * reveals nothing; limited to 3 links per address and 10 requests per connection per hour.
 */
export const POST = route(async (req) => {
  if (!(await rateLimit(`verify:ip:${clientIp(req.headers)}`, 10, 60 * 60)).allowed)
    fail("Trop de demandes depuis votre adresse. Réessayez plus tard.", 429);
  const input = await json(req, z.object({ email: emailSchema, suite: z.string().max(200).optional() }));
  let devLink: string | undefined;
  if ((await rateLimit(`verify:email:${input.email}`, 3, 60 * 60)).allowed) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (user && !user.emailVerifiedAt && user.active) {
      const next = input.suite ? safeNext(input.suite) : undefined;
      ({ devLink } = await sendEmailVerification(user, next === "/app" ? undefined : next));
    }
  }
  return { ok: true, ...(devLink && { devLink }) };
});
