import nodemailer from "nodemailer";

/** Sends an email when SMTP is configured; otherwise logs it so links stay usable in development. */
export async function sendMail(to: string, subject: string, text: string) {
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
  await transport.sendMail({ from: SMTP_FROM || "SQuizz <no-reply@squizz.fun>", to, subject, text });
  return true;
}

export const appUrl = () =>
  (process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:5173").replace(/\/$/, "");
