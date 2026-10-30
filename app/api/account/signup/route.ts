import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, json, emailSchema, nameSchema, passwordSchema } from "@/lib/server/api";
import { assertEmailFree, hashPassword, sendEmailVerification } from "@/lib/server/accounts";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { fail } from "@/lib/server/http";
import { safeNext } from "@/lib/next-path";
import { offerOf, offerOfPath } from "@/lib/plans";
import { CONTACT_EMAIL } from "@/lib/company-info";
import { sendMail } from "@/lib/server/mail";
import { newSignupNoticeEmail } from "@/lib/server/email-templates";

const schema = z.object({
  organization: nameSchema,
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  suite: z.string().max(200).optional(),
});

/**
 * Creates an organisation on the free plan with its first administrator. The account opens once the
 * address is confirmed through the emailed link (the welcome email follows that confirmation). Pressweb
 * is told at once, confirmed or not.
 */
export const POST = route(async (req) => {
  if (!(await rateLimit(`signup:${clientIp(req.headers)}`, 5, 60 * 60)).allowed)
    fail("Trop d’inscriptions depuis votre adresse. Réessayez plus tard.", 429);
  const input = await json(req, schema);
  await assertEmailFree(input.email);
  const passwordHash = await hashPassword(input.password);
  const next = input.suite ? safeNext(input.suite) : undefined;
  const org = await prisma.organization.create({
    data: {
      name: input.organization,
      // Kept with the organisation: the first sign-in opens on it even if the emailed link is not the way in
      // (another device, the « Connexion » button, a link rewritten by the mailbox).
      wantedOffer: next ? offerOfPath(next) : null,
      users: { create: { email: input.email, name: input.name, passwordHash, role: "ORG_ADMIN" } },
    },
    include: { users: true },
  });
  const { devLink } = await sendEmailVerification(org.users[0], next === "/app" ? undefined : next);
  void sendMail(
    CONTACT_EMAIL,
    newSignupNoticeEmail({
      name: input.name,
      email: input.email,
      organization: org.name,
      organizationId: org.id,
      offer: offerOf(org.wantedOffer),
    }),
    input.email,
  );
  return { verify: true, ...(devLink && { devLink }) };
});
