import { afterEach, beforeEach, expect, test, vi } from "vitest";

const runReport = vi.hoisted(() => vi.fn());
const batchRunReports = vi.hoisted(() => vi.fn());
const runRealtimeReport = vi.hoisted(() => vi.fn());
vi.mock("@google-analytics/data", () => ({
  BetaAnalyticsDataClient: class {
    runReport = runReport;
    batchRunReports = batchRunReports;
    runRealtimeReport = runRealtimeReport;
  },
}));

import {
  GA_CEILING_MS,
  clearSiteAnalyticsCache,
  formatFetchedAt,
  formatPeriod,
  getSiteAnalytics,
  getSiteRealtimeAnalytics,
  isStale,
} from "@/lib/server/site-analytics";

const row = (dimension: string | null, ...metrics: number[]) => ({
  dimensionValues: dimension === null ? [] : [{ value: dimension }],
  metricValues: metrics.map((m) => ({ value: String(m) })),
});

/** Answers by report, batch by batch: the two totals (this week, then the one before), then each dimension. */
function answer(rowsFor: Record<string, ReturnType<typeof row>[]>, before: ReturnType<typeof row>[]) {
  runReport.mockImplementation(async ({ dimensions, dateRanges }) => {
    const key = dimensions?.[0]?.name;
    if (key) return [{ rows: rowsFor[key] ?? [] }];
    return [{ rows: dateRanges[0].startDate === "7daysAgo" ? rowsFor.totals : before }];
  });
  batchRunReports.mockImplementation(async ({ requests }) => [
    { reports: await Promise.all(requests.map(async (r: object) => (await runReport(r))[0])) },
  ]);
}

beforeEach(() => {
  vi.stubEnv("GA_PROPERTY_ID", "123");
  vi.stubEnv("GA_SERVICE_ACCOUNT_EMAIL", "lecteur@example.test");
  vi.stubEnv("GA_SERVICE_ACCOUNT_PRIVATE_KEY", "clé");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  clearSiteAnalyticsCache();
  runReport.mockReset();
  batchRunReports.mockReset();
  runRealtimeReport.mockReset();
});

test("sans configuration, rien n’est demandé à Google", async () => {
  vi.stubEnv("GA_PROPERTY_ID", "");
  expect(await getSiteAnalytics()).toBeNull();
  expect(await getSiteRealtimeAnalytics()).toBeNull();
  expect(batchRunReports).not.toHaveBeenCalled();
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
  // Seven reports in two calls: GA4 counts concurrent requests per property.
  expect(batchRunReports).toHaveBeenCalledTimes(2);
  expect(runReport).toHaveBeenCalledTimes(7);
  for (const [request] of runReport.mock.calls) {
    const filter = JSON.stringify(request.dimensionFilter);
    for (const path of ["/app", "/super-admin", "/jouer", "/partie"]) expect(filter).toContain(`"${path}"`);
  }
});

test("une erreur de Google ne casse pas le tableau de bord", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  batchRunReports.mockRejectedValue(new Error("PERMISSION_DENIED"));
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
    batchRunReports.mockImplementation(() => new Promise(() => {}));
    runRealtimeReport.mockImplementation(() => new Promise(() => {}));
    const pending = Promise.all([getSiteAnalytics(), getSiteRealtimeAnalytics()]);
    await vi.advanceTimersByTimeAsync(GA_CEILING_MS);
    expect(await pending).toEqual([null, null]);
  } finally {
    vi.useRealTimers();
  }
});

test("un rechargement réutilise les chiffres au lieu de rappeler Google", async () => {
  answer({ totals: [row(null, 1, 2, 3)] }, []);
  const [first, during] = await Promise.all([getSiteAnalytics(), getSiteAnalytics()]);
  const after = await getSiteAnalytics();
  expect(during).toEqual(first);
  expect(after).toEqual(first);
  expect(batchRunReports).toHaveBeenCalledTimes(2); // One page load's worth, not three.
});

test("après un refus de Google, on attend avant de redemander", async () => {
  vi.useFakeTimers();
  try {
    vi.spyOn(console, "error").mockImplementation(() => {});
    batchRunReports.mockRejectedValue(new Error("8 RESOURCE_EXHAUSTED"));
    expect(await getSiteAnalytics()).toBeNull();
    expect(await getSiteAnalytics()).toBeNull();
    expect(batchRunReports).toHaveBeenCalledTimes(2);
    answer({ totals: [row(null, 1, 2, 3)] }, []);
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(await getSiteAnalytics()).toMatchObject({ activeUsers7d: 1 });
  } finally {
    vi.useRealTimers();
  }
});

test("la période s’arrête à hier : Google bloque les rapports qui incluent aujourd’hui", async () => {
  answer({ totals: [] }, []);
  await getSiteAnalytics();
  const ends = runReport.mock.calls.map(([r]) => r.dateRanges[0].endDate);
  expect(ends).not.toContain("today");
  expect(ends.filter((end) => end === "yesterday")).toHaveLength(6);
});

test("les chiffres portent l’heure de la réponse de Google", async () => {
  vi.useFakeTimers({ now: new Date("2026-11-16T08:12:00Z"), toFake: ["Date"] });
  try {
    answer({ totals: [row(null, 1, 2, 3)] }, []);
    expect((await getSiteAnalytics())?.fetchedAt).toBe("2026-11-16T08:12:00.000Z");
  } finally {
    vi.useRealTimers();
  }
});

test("l’heure et la période sont celles de Paris, même après minuit à Paris et avant minuit en UTC", () => {
  expect(formatFetchedAt("2026-11-16T08:12:00Z")).toBe("16/11 à 09:12");
  expect(formatPeriod("2026-11-16T08:12:00Z")).toBe("du 09/11 au 15/11");
  // 23:30 UTC on the 15th is already 00:30 on the 16th in Paris: « yesterday » for Google is the 15th.
  expect(formatFetchedAt("2026-11-15T23:30:00Z")).toBe("16/11 à 00:30");
  expect(formatPeriod("2026-11-15T23:30:00Z")).toBe("du 09/11 au 15/11");
  // Summer time (UTC+2), across a month and a year boundary.
  expect(formatFetchedAt("2026-07-31T22:15:00Z")).toBe("01/08 à 00:15");
  expect(formatPeriod("2026-07-31T22:15:00Z")).toBe("du 25/07 au 31/07");
  expect(formatPeriod("2027-01-03T10:00:00Z")).toBe("du 27/12 au 02/01");
});

test("au-delà de 30 minutes, les chiffres sont signalés comme anciens", () => {
  const at = "2026-11-16T08:00:00Z";
  const base = new Date(at).getTime();
  expect(isStale(at, base + 30 * 60_000)).toBe(false);
  expect(isStale(at, base + 30 * 60_000 + 1)).toBe(true);
});
