import { afterEach, beforeEach, expect, test, vi } from "vitest";

const runReport = vi.hoisted(() => vi.fn());
const runRealtimeReport = vi.hoisted(() => vi.fn());
vi.mock("@google-analytics/data", () => ({
  BetaAnalyticsDataClient: class {
    runReport = runReport;
    runRealtimeReport = runRealtimeReport;
  },
}));

import { GA_CEILING_MS, getSiteAnalytics, getSiteRealtimeAnalytics } from "@/lib/server/site-analytics";

const row = (dimension: string | null, ...metrics: number[]) => ({
  dimensionValues: dimension === null ? [] : [{ value: dimension }],
  metricValues: metrics.map((m) => ({ value: String(m) })),
});

/** Answers by report: the two totals (this week, then the one before), then each dimension. */
function answer(rowsFor: Record<string, ReturnType<typeof row>[]>, before: ReturnType<typeof row>[]) {
  runReport.mockImplementation(async ({ dimensions, dateRanges }) => {
    const key = dimensions?.[0]?.name;
    if (key) return [{ rows: rowsFor[key] ?? [] }];
    return [{ rows: dateRanges[0].startDate === "7daysAgo" ? rowsFor.totals : before }];
  });
}

beforeEach(() => {
  vi.stubEnv("GA_PROPERTY_ID", "123");
  vi.stubEnv("GA_SERVICE_ACCOUNT_EMAIL", "lecteur@example.test");
  vi.stubEnv("GA_SERVICE_ACCOUNT_PRIVATE_KEY", "clé");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  runReport.mockReset();
  runRealtimeReport.mockReset();
});

test("sans configuration, rien n’est demandé à Google", async () => {
  vi.stubEnv("GA_PROPERTY_ID", "");
  expect(await getSiteAnalytics()).toBeNull();
  expect(await getSiteRealtimeAnalytics()).toBeNull();
  expect(runReport).not.toHaveBeenCalled();
});

test("les chiffres sont lus, comparés à la semaine d’avant, et les villes vides fusionnées", async () => {
  answer(
    {
      totals: [row(null, 30, 40, 100)],
      pagePath: [row("/", 60), row(" ", 2)],
      sessionDefaultChannelGroup: [row("Organic Search", 25)],
      city: [row("Paris", 9), row("(not set)", 3), row("", 8)],
      deviceCategory: [row("mobile", 30)],
      eventName: [row("signup_cta_click", 10)],
    },
    [row(null, 20, 0, 100)],
  );
  const stats = await getSiteAnalytics();
  expect(stats).toMatchObject({ activeUsers7d: 30, sessions7d: 40, pageViews7d: 100 });
  expect(stats?.activeUsersChangePct).toBe(50);
  expect(stats?.sessionsChangePct).toBeNull(); // Nothing the week before: no percentage.
  expect(stats?.pageViewsChangePct).toBe(0);
  expect(stats?.topPages).toEqual([
    { path: "/", views: 60 },
    { path: "—", views: 2 },
  ]);
  expect(stats?.topCities).toEqual([
    { city: "(not set)", activeUsers: 11 },
    { city: "Paris", activeUsers: 9 },
  ]);
  expect(stats?.conversions).toEqual([{ name: "signup_cta_click", count: 10, ratePct: 25 }]);
});

test("les pages de jeu et les espaces connectés sont exclus de chaque rapport", async () => {
  answer({ totals: [] }, []);
  await getSiteAnalytics();
  expect(runReport).toHaveBeenCalledTimes(7);
  for (const [request] of runReport.mock.calls) {
    const filter = JSON.stringify(request.dimensionFilter);
    for (const path of ["/app", "/super-admin", "/jouer", "/partie"]) expect(filter).toContain(`"${path}"`);
  }
});

test("une erreur de Google ne casse pas le tableau de bord", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  runReport.mockRejectedValue(new Error("PERMISSION_DENIED"));
  runRealtimeReport.mockRejectedValue(new Error("PERMISSION_DENIED"));
  expect(await getSiteAnalytics()).toBeNull();
  expect(await getSiteRealtimeAnalytics()).toBeNull();
});

test("le temps réel compte les visiteurs et les conversions en cours", async () => {
  runRealtimeReport.mockImplementation(async ({ dimensions }) => [
    { rows: dimensions ? [row("contact_form_submit", 2)] : [row(null, 5)] },
  ]);
  expect(await getSiteRealtimeAnalytics()).toEqual({
    activeUsersNow: 5,
    conversionsLast30min: [{ name: "contact_form_submit", count: 2 }],
  });
  // « En ligne » means the last 5 minutes, not Google's default of 30.
  const online = runRealtimeReport.mock.calls.find(([r]) => !r.dimensions)?.[0];
  expect(online.minuteRanges).toEqual([{ startMinutesAgo: 4, endMinutesAgo: 0 }]);
});

test("Google qui ne répond jamais ne bloque pas la page au-delà du plafond", async () => {
  vi.useFakeTimers();
  try {
    vi.spyOn(console, "error").mockImplementation(() => {});
    runReport.mockImplementation(() => new Promise(() => {}));
    runRealtimeReport.mockImplementation(() => new Promise(() => {}));
    const pending = Promise.all([getSiteAnalytics(), getSiteRealtimeAnalytics()]);
    await vi.advanceTimersByTimeAsync(GA_CEILING_MS);
    expect(await pending).toEqual([null, null]);
  } finally {
    vi.useRealTimers();
  }
});
