import "server-only";
import nodemailer from "nodemailer";
import type { Email } from "./email-templates";

/** Sends an email when SMTP is configured; otherwise logs it. Returns whether it was actually sent. */
export async function sendMail(to: string, { subject, text, html }: Email, replyTo?: string) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST) {
    console.info(`[mail non envoyé — SMTP absent] À : ${to}\nObjet : ${subject}\n${text}`);
    return false;
  }
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT) === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  try {
    await transport.sendMail({
      from: SMTP_FROM || "SQuizz <contact@pressweb.fr>",
      to,
      subject,
      text,
      html,
      replyTo,
    });
    return true;
  } catch (err) {
    // Callers still show the link (invitation, reset) or keep the stored message, so a mail outage never blocks them.
    console.error(`[mail] envoi impossible à ${to} :`, err);
    return false;
  }
}

export const appUrl = () =>
  (process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:5173").replace(/\/$/, "");
