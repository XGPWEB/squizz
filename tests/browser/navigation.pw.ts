import { randomBytes } from "node:crypto";
import { expect } from "@playwright/test";
import { newAccount, test } from "./helpers";

test("navigation : aucun onglet coupé avec une organisation partenaire et le compte super-admin", async ({
  page,
  request,
}, testInfo) => {
  const account = await newAccount(request);
  const signedIn = await page.request.post("/api/admin/session", {
    data: { email: process.env.SEED_SUPER_ADMIN_EMAIL, password: process.env.SEED_SUPER_ADMIN_PASSWORD },
    headers: {
      "X-Real-IP": `2001:db8:${randomBytes(2).toString("hex")}:${randomBytes(2).toString("hex")}::1`,
    },
  });
  expect(signedIn.ok()).toBe(true);
  expect(
    (
      await page.request.patch("/api/account/password?espace=super-admin", {
        data: { name: "Super-admin SQuizz" },
      })
    ).ok(),
  ).toBe(true);
  const { organizations } = await (await page.request.get("/api/admin/organizations")).json();
  const org = organizations.find((o: { name: string }) => o.name === account.organization);
  expect(org).toBeTruthy();
  expect(
    (
      await page.request.patch(`/api/admin/organizations/${org.id}`, {
        data: { name: "Pôle jeunesse", partner: true },
      })
    ).ok(),
  ).toBe(true);
  expect((await page.request.post(`/api/admin/organizations/${org.id}/view`)).ok()).toBe(true);

  for (const path of ["/app/abonnement", "/super-admin/monitoring"]) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const nav = page.getByRole("navigation", { name: "Navigation de l’espace" });
    await expect(nav.getByRole("link")).toHaveCount(5);
    for (const width of [1920, 1440, 1280, 1100, 1024, 1000, 768, 640, 390, 375, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const clipped = await nav.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return Array.from(element.querySelectorAll("a"))
          .filter((link) => {
            const r = link.getBoundingClientRect();
            return (
              r.left < bounds.left - 1 ||
              r.right > bounds.right + 1 ||
              r.left < 0 ||
              r.right > window.innerWidth ||
              link.scrollWidth > link.clientWidth + 1
            );
          })
          .map((link) => link.getAttribute("aria-label"));
      });
      expect(clipped, `${path}, écran de ${width}px`).toEqual([]);
      const dimensions = await nav.evaluate((element) => ({
        width: element.clientWidth,
        content: element.scrollWidth,
      }));
      expect(dimensions.content).toBeLessThanOrEqual(dimensions.width + 1);
      if (path === "/app/abonnement" && [1920, 390].includes(width)) {
        await page
          .locator(".app-header")
          .screenshot({ path: testInfo.outputPath(`navigation-${width}.png`) });
      }
    }
    const accountButton = page.getByRole("button", { name: "Mon compte : Super-admin SQuizz" });
    await accountButton.click();
    const menu = page.locator(".account-menu");
    await expect(menu.getByRole("link", { name: "Mon compte", exact: true })).toBeVisible();
    const box = await menu.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(321);
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(accountButton).toBeFocused();
  }
});
