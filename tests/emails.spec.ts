import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

// Read when the e-mails are built, so it must be set before the templates run.
process.env.APP_URL = "https://www.squizz.fun";

describe("e-mails SQuizz", async () => {
  const t = await import("@/lib/server/email-templates");
  const evil = "<script>alert(1)</script>";
  const emails = {
    bienvenue: t.welcomeEmail({ name: "Xavier", organization: "Pressweb" }),
    invitation: t.invitationEmail({
      organization: "Pressweb",
      inviter: "Xavier",
      role: "HOST",
      link: "https://www.squizz.fun/invitation/abc",
      days: 7,
    }),
    "alerte-monitoring": t.systemAlertEmail({
      type: "server",
      message: "PrismaClientKnownRequestError : la base ne répond pas",
      path: "/api/game",
    }),
    "pack-evenement": t.eventPassEmail({
      name: "Xavier",
      organization: "Pressweb",
      until: new Date("2026-10-09T12:30:00Z"),
    }),
    "membre-bienvenue": t.memberWelcomeEmail({ name: "Léa", organization: "Pressweb", role: "HOST" }),
    "membre-arrive": t.memberJoinedEmail({
      inviter: "Xavier",
      member: "Léa",
      email: "lea@example.fr",
      organization: "Pressweb",
    }),
    "mot-de-passe-oublie": t.resetEmail({
      name: "Xavier",
      link: "https://www.squizz.fun/reinitialiser/abc",
      minutes: 60,
    }),
    "mot-de-passe-modifie": t.passwordChangedEmail({ name: "Xavier" }),
    contact: t.contactEmail({ name: "Léa", email: "lea@example.fr", subject: "Devis", message: "Bonjour !" }),
    "contact-accuse": t.contactAckEmail({ name: "Léa", subject: "Devis", message: "Bonjour, un devis svp." }),
    suppression: t.accountDeletedEmail({ name: "Xavier", organization: "Pressweb" }),
    "offre-pro": t.organizationUpdateEmail({ name: "Xavier", organization: "Pressweb", plan: "PRO" }),
    suspension: t.organizationUpdateEmail({ name: "Xavier", organization: "Pressweb", status: "SUSPENDED" }),
    reactivation: t.organizationUpdateEmail({ name: "Xavier", organization: "Pressweb", status: "ACTIVE" }),
  };

  test("chaque e-mail a un objet, un texte brut et le gabarit SQuizz", () => {
    for (const [name, e] of Object.entries(emails)) {
      expect(e.subject, name).toBeTruthy();
      expect(e.text.length, name).toBeGreaterThan(20);
      expect(e.html, name).toContain("SQuizz");
      expect(e.html, name).toContain("contact@pressweb.fr");
    }
    // Set EMAIL_PREVIEW_DIR to look at them in a browser.
    const dir = process.env.EMAIL_PREVIEW_DIR;
    if (dir) {
      mkdirSync(dir, { recursive: true });
      for (const [name, e] of Object.entries(emails)) writeFileSync(path.join(dir, `${name}.html`), e.html);
    }
  });

  test("les valeurs saisies par les utilisateurs sont échappées", () => {
    const html = [
      t.welcomeEmail({ name: evil, organization: evil }).html,
      t.contactAckEmail({ name: evil, subject: evil, message: evil }).html,
      t.memberJoinedEmail({ inviter: evil, member: evil, email: evil, organization: evil }).html,
      t.accountDeletedEmail({ name: evil, organization: evil }).html,
    ].join("");
    expect(html).not.toContain("<script>");
  });
});
