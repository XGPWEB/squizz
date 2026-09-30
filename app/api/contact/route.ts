import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CONTACT_SUBJECTS } from "@/lib/contact";
import { CONTACT_EMAIL } from "@/lib/company-info";
import { route, json } from "@/lib/server/api";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { verifyTurnstile } from "@/lib/server/turnstile";
import { sendMail } from "@/lib/server/mail";
import { contactAckEmail, contactEmail } from "@/lib/server/email-templates";
import { fail } from "@/lib/server/http";

const schema = z.object({
  name: z.string().trim().min(1, "Indiquez votre nom.").max(100),
  email: z.string().trim().toLowerCase().email("Adresse email invalide.").max(200),
  subject: z.enum(CONTACT_SUBJECTS).default("Question générale"),
  message: z.string().trim().min(10, "Votre message doit contenir au moins 10 caractères.").max(2000),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Acceptez le traitement de vos données pour envoyer." }),
  }),
  // Honeypot: never visible to humans; bots that fill every field get a silent success.
  website: z.string().max(200).optional(),
  turnstileToken: z.string().optional().default(""),
});

/** Public contact form: stored for the super-admin and emailed to the publisher when SMTP is set. */
export const POST = route(async (req) => {
  const ip = clientIp(req.headers);
  if (!(await rateLimit(`contact:${ip}`, 5, 60 * 60)).allowed)
    fail("Trop de messages envoyés. Réessayez dans une heure ou écrivez-nous directement.", 429);
  const body = await json(req, schema);
  if (body.website) {
    console.warn(`[contact] honeypot déclenché — ip=${ip}`);
    return { ok: true };
  }
  if (!(await verifyTurnstile(body.turnstileToken, ip))) fail("Vérification anti-robot échouée — réessayez.");
  await prisma.contactMessage.create({
    data: { name: body.name, email: body.email, subject: body.subject, message: body.message },
  });
  await sendMail(
    CONTACT_EMAIL,
    contactEmail({ name: body.name, email: body.email, subject: body.subject, message: body.message }),
    body.email,
  ).catch((err) => console.error("[contact] envoi de l’email impossible :", err));
  void sendMail(
    body.email,
    contactAckEmail({ name: body.name, subject: body.subject, message: body.message }),
  );
  return { ok: true };
});
