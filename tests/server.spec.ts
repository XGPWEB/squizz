import { beforeAll, describe, expect, test } from "vitest";

beforeAll(() => {
  process.env.AUTH_SECRET = "secret-de-test-pour-les-tests-unitaires";
  process.env.APP_URL = "https://www.squizz.fun";
});

describe("vue « en tant qu'administrateur »", async () => {
  const { createViewToken, readViewToken } = await import("@/lib/server/view-as");
  test("un jeton valide est relu pour le même super-admin", () => {
    const token = createViewToken("admin-1", "org-1");
    expect(readViewToken(token, "admin-1")).toMatchObject({ adminId: "admin-1", organizationId: "org-1" });
  });
  test("refusé pour un autre compte, modifié ou mal formé", () => {
    const token = createViewToken("admin-1", "org-1");
    expect(readViewToken(token, "admin-2")).toBeNull();
    const [payload, sig] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ adminId: "admin-1", organizationId: "org-2", exp: 9e9 }),
    ).toString("base64url");
    expect(readViewToken(`${forged}.${sig}`, "admin-1")).toBeNull();
    // A first character that is really another one: one signature in 64 already starts with « x ».
    expect(readViewToken(`${payload}.${sig[0] === "x" ? "y" : "x"}${sig.slice(1)}`, "admin-1")).toBeNull();
    expect(readViewToken("n'importe quoi", "admin-1")).toBeNull();
    expect(readViewToken(undefined, "admin-1")).toBeNull();
  });
  test("refusé une fois expiré", () => {
    const realNow = Date.now;
    const token = createViewToken("admin-1", "org-1");
    Date.now = () => realNow() + 3 * 3600_000;
    try {
      expect(readViewToken(token, "admin-1")).toBeNull();
    } finally {
      Date.now = realNow;
    }
  });
});

describe("jetons d'invitation et de mot de passe", async () => {
  const { newToken, hashToken } = await import("@/lib/server/tokens");
  test("aléatoires, longs, et seul le hachage est stocké", () => {
    const a = newToken();
    const b = newToken();
    expect(a.token).not.toBe(b.token);
    expect(a.token.length).toBeGreaterThanOrEqual(43);
    expect(a.tokenHash).toBe(hashToken(a.token));
    expect(a.tokenHash).not.toContain(a.token);
  });
});

describe("adresse IP du client", async () => {
  const { clientIp } = await import("@/lib/server/rate-limit");
  test("x-real-ip (posé par Nginx) passe avant x-forwarded-for (falsifiable)", () => {
    expect(clientIp(new Headers({ "x-real-ip": "1.2.3.4", "x-forwarded-for": "6.6.6.6" }))).toBe("1.2.3.4");
    expect(clientIp(new Headers({ "x-forwarded-for": "5.5.5.5, 10.0.0.1" }))).toBe("5.5.5.5");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("emails", async () => {
  const { contactEmail, invitationEmail } = await import("@/lib/server/email-templates");
  test("le contenu saisi est échappé dans le HTML", () => {
    const mail = contactEmail({
      name: "<script>x</script>",
      email: "a@b.fr",
      subject: "Autre",
      message: '"><img src=x onerror=alert(1)>',
    });
    expect(mail.html).not.toContain("<script>x</script>");
    expect(mail.html).not.toContain("<img src=x");
    expect(mail.html).toContain("&lt;script&gt;");
    expect(mail.text).toContain("<script>x</script>");
  });
  test("l'invitation contient le lien et renvoie vers la politique de confidentialité", () => {
    const mail = invitationEmail({
      organization: "Org",
      inviter: "Alice",
      role: "HOST",
      link: "https://www.squizz.fun/invitation/abc",
      days: 7,
    });
    expect(mail.html).toContain("https://www.squizz.fun/invitation/abc");
    expect(mail.html).toContain("/confidentialite");
    expect(mail.subject).toContain("Org");
  });
});

describe("session super-admin", async () => {
  const { createAdminToken, readAdminToken, ADMIN_SESSION_MAX_SECONDS } =
    await import("@/lib/server/admin-session");
  const now = () => Math.floor(Date.now() / 1000);
  test("le renouvellement garde la date de connexion", async () => {
    const first = await readAdminToken(await createAdminToken({ id: "root", sessionVersion: 3 }));
    expect(first).toMatchObject({ id: "root", sessionVersion: 3 });
    expect(now() - first!.since).toBeLessThan(5);
    const since = now() - 3 * 24 * 60 * 60;
    const renewed = await readAdminToken(await createAdminToken({ id: "root", sessionVersion: 3, since }));
    expect(renewed?.since).toBe(since);
  });
  test("au-delà de 90 jours, le mot de passe est redemandé même en pleine activité", async () => {
    const since = now() - ADMIN_SESSION_MAX_SECONDS - 60;
    expect(await readAdminToken(await createAdminToken({ id: "root", sessionVersion: 3, since }))).toBeNull();
    expect(await readAdminToken("n'importe quoi")).toBeNull();
    expect(await readAdminToken(undefined)).toBeNull();
  });
});
