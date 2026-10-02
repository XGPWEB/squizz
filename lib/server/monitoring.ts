import "server-only";
import { prisma } from "@/lib/prisma";
import { CONTACT_EMAIL } from "@/lib/company-info";
import { safePath, type AlertType } from "@/lib/monitoring";

/** One e-mail per kind of alert and per half hour: an outage must not send dozens of identical e-mails. */
const EMAIL_EVERY_MS = 30 * 60 * 1000;
/** At most this many alerts of one kind are stored per minute: a loop of errors must not fill the table. */
const MAX_PER_MINUTE = 20;

const lastEmail = new Map<string, number>();
const recent = new Map<string, { since: number; count: number }>();

const cut = (value: unknown, max: number) => {
  const text = String(value ?? "");
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

/**
 * Records something that went wrong without anyone seeing it, and tells Pressweb by e-mail. Never throws:
 * monitoring must not turn a problem into a bigger one. Counters live in memory (one process): after a
 * restart, at worst one more e-mail.
 */
export async function reportAlert(alert: {
  type: AlertType;
  message: unknown;
  path?: string;
  context?: Record<string, string | number | boolean | null | undefined>;
}) {
  try {
    const now = Date.now();
    const window = recent.get(alert.type);
    if (!window || now - window.since > 60_000) recent.set(alert.type, { since: now, count: 1 });
    else if (++window.count > MAX_PER_MINUTE) return;
    const message = cut(alert.message, 500) || "Erreur sans message";
    const context = { ...alert.context, ...(alert.path ? { path: safePath(alert.path) } : {}) };
    await prisma.systemAlert.create({
      data: { type: alert.type, message, context: Object.keys(context).length ? context : undefined },
    });
    // A failed e-mail is not announced by e-mail.
    if (alert.type === "mail" || now - (lastEmail.get(alert.type) ?? 0) < EMAIL_EVERY_MS) return;
    lastEmail.set(alert.type, now);
    const [{ sendMail }, { systemAlertEmail }] = await Promise.all([
      import("./mail"),
      import("./email-templates"),
    ]);
    await sendMail(
      process.env.ALERT_EMAIL || CONTACT_EMAIL,
      systemAlertEmail({ type: alert.type, message, path: context.path }),
    );
  } catch (e) {
    console.error("Monitoring : alerte non enregistrée", e);
  }
}

/** The message of anything thrown, without its stack. */
export const errorMessage = (e: unknown) => (e instanceof Error ? `${e.name} : ${e.message}` : String(e));
