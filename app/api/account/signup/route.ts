import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, json, emailSchema, nameSchema, passwordSchema } from "@/lib/server/api";
import { assertEmailFree, hashPassword } from "@/lib/server/accounts";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { fail } from "@/lib/server/http";
import { sendMail } from "@/lib/server/mail";
import { welcomeEmail } from "@/lib/server/email-templates";

const schema = z.object({
  organization: nameSchema,
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

/** Creates an organisation on the free plan with its first administrator. */
export const POST = route(async (req) => {
  if (!(await rateLimit(`signup:${clientIp(req.headers)}`, 5, 60 * 60)).allowed)
    fail("Trop d’inscriptions depuis votre adresse. Réessayez plus tard.", 429);
  const input = await json(req, schema);
  await assertEmailFree(input.email);
  const passwordHash = await hashPassword(input.password);
  await prisma.organization.create({
    data: {
      name: input.organization,
      users: { create: { email: input.email, name: input.name, passwordHash, role: "ORG_ADMIN" } },
    },
  });
  void sendMail(input.email, welcomeEmail({ name: input.name, organization: input.organization }));
  return { ok: true };
});
