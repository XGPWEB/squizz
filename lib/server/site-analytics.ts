import "server-only";
import { BetaAnalyticsDataClient, protos } from "@google-analytics/data";
import { CONVERSIONS } from "@/lib/analytics";

type Report = protos.google.analytics.data.v1beta.IRunReportResponse;
type Row = protos.google.analytics.data.v1beta.IRow;

export type SiteAnalytics = {
  activeUsers7d: number;
  sessions7d: number;
  pageViews7d: number;
  /** Change against the 7 days before; null when those were at 0, a percentage would mean nothing. */
  activeUsersChangePct: number | null;
  sessionsChangePct: number | null;
  pageViewsChangePct: number | null;
  topPages: { path: string; views: number }[];
  topSources: { source: string; sessions: number }[];
  topCities: { city: string; activeUsers: number }[];
  deviceBreakdown: { device: string; sessions: number }[];
  /** ratePct: share of the period's sessions, more telling than a raw count on a small volume. */
  conversions: { name: string; count: number; ratePct: number }[];
};

export type SiteRealtimeAnalytics = {
  activeUsersNow: number;
  conversionsLast30min: { name: string; count: number }[];
};

const CONVERSION_NAMES = Object.keys(CONVERSIONS);

/**
 * The tag only runs on the public site, but gtag.js can record one last page change on the way out to these
 * pages before it stops (see components/site/analytics.tsx): they stay out of the figures.
 */
const PRIVATE_PATHS = ["/app", "/super-admin", "/jouer", "/partie"];
const PUBLIC_PAGES = {
  notExpression: {
    orGroup: {
      expressions: PRIVATE_PATHS.map((value) => ({
        filter: { fieldName: "pagePath", stringFilter: { matchType: "BEGINS_WITH" as const, value } },
      })),
    },
  },
};

const num = (row: Row | undefined, metric = 0) => Number(row?.metricValues?.[metric]?.value ?? 0);
/** GA4 sometimes answers an empty or blank value, which would show as a line with no label. */
const dim = (row: Row, fallback = "—") => (row.dimensionValues?.[0]?.value ?? "").trim() || fallback;

/** null at 0 before: growth from nothing has no percentage (the dashboard says « Nouveau »). */
function changePct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * Google's default deadline is 60 s: when RunReport hangs (seen on 2026-11-13), the whole dashboard waited a minute.
 * 10 s, with no retry (a retry would stretch the total time), then the panel falls back to « indisponible ».
 */
const GA_CALL = { timeout: 10_000, retry: null } as const;

/**
 * Ceiling on the whole panel. The per-call deadline does not cover everything (fetching the service account's
 * token, for one): while the panel waits, the page's stream stays open with nothing to send, and past 60 s Nginx
 * cuts it, so the browser shows the error page (« TypeError : network error » on /super-admin, 2026-11-13).
 */
export const GA_CEILING_MS = 12_000;

function withinCeiling<T>(work: Promise<T | null>, what: string): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const ceiling = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      console.error(`[site-analytics] ${what} : pas de réponse de Google en ${GA_CEILING_MS / 1000} s`);
      resolve(null);
    }, GA_CEILING_MS);
  });
  return Promise.race([work, ceiling]).finally(() => clearTimeout(timer));
}

let client: BetaAnalyticsDataClient | null = null;

function getClient() {
  const email = process.env.GA_SERVICE_ACCOUNT_EMAIL;
  // /opt/squizz-secrets.env keeps the key on one line, with \n written out.
  const key = process.env.GA_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) return null;
  client ??= new BetaAnalyticsDataClient({ credentials: { client_email: email, private_key: key } });
  return client;
}

/**
 * Traffic of the public site over the last 7 days, from the GA4 Data API. null when GA is not set up or the
 * call fails (the service account not yet given access, for instance): the dashboard must keep working.
 */
export function getSiteAnalytics(): Promise<SiteAnalytics | null> {
  return withinCeiling(fetchSiteAnalytics(), "GA4 Data API");
}

async function fetchSiteAnalytics(): Promise<SiteAnalytics | null> {
  const propertyId = process.env.GA_PROPERTY_ID;
  const ga = getClient();
  if (!propertyId || !ga) return null;

  try {
    const property = `properties/${propertyId}`;
    const dateRanges = [{ startDate: "7daysAgo", endDate: "today" }];
    const totals = [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }];
    const top = (dimension: string, metric: string, limit?: number) =>
      ga.runReport(
        {
          property,
          dateRanges,
          dimensions: [{ name: dimension }],
          metrics: [{ name: metric }],
          orderBys: [{ metric: { metricName: metric }, desc: true }],
          dimensionFilter: PUBLIC_PAGES,
          limit,
        },
        GA_CALL,
      );
    const rows = ([report]: [Report, ...unknown[]]) => report.rows ?? [];

    const [summary, previous, pages, sources, cities, devices, events] = await Promise.all([
      ga.runReport({ property, dateRanges, metrics: totals, dimensionFilter: PUBLIC_PAGES }, GA_CALL),
      ga.runReport(
        {
          property,
          dateRanges: [{ startDate: "14daysAgo", endDate: "8daysAgo" }],
          metrics: totals,
          dimensionFilter: PUBLIC_PAGES,
        },
        GA_CALL,
      ),
      top("pagePath", "screenPageViews", 5),
      top("sessionDefaultChannelGroup", "sessions", 5),
      top("city", "activeUsers", 5),
      top("deviceCategory", "sessions"),
      ga.runReport(
        {
          property,
          dateRanges,
          dimensions: [{ name: "eventName" }],
          metrics: [{ name: "eventCount" }],
          dimensionFilter: {
            andGroup: {
              expressions: [
                PUBLIC_PAGES,
                { filter: { fieldName: "eventName", inListFilter: { values: CONVERSION_NAMES } } },
              ],
            },
          },
        },
        GA_CALL,
      ),
    ]);

    const now = rows(summary)[0];
    const before = rows(previous)[0];
    const sessions7d = num(now, 1);

    // GA4 can answer « (not set) » and an empty city on separate lines: merged, or it would show twice.
    const byCity = new Map<string, number>();
    for (const r of rows(cities)) {
      const city = dim(r, "(not set)");
      byCity.set(city, (byCity.get(city) ?? 0) + num(r));
    }

    return {
      activeUsers7d: num(now, 0),
      sessions7d,
      pageViews7d: num(now, 2),
      activeUsersChangePct: changePct(num(now, 0), num(before, 0)),
      sessionsChangePct: changePct(sessions7d, num(before, 1)),
      pageViewsChangePct: changePct(num(now, 2), num(before, 2)),
      topPages: rows(pages).map((r) => ({ path: dim(r), views: num(r) })),
      topSources: rows(sources).map((r) => ({ source: dim(r), sessions: num(r) })),
      topCities: [...byCity]
        .map(([city, activeUsers]) => ({ city, activeUsers }))
        .sort((a, b) => b.activeUsers - a.activeUsers),
      deviceBreakdown: rows(devices).map((r) => ({ device: dim(r), sessions: num(r) })),
      conversions: rows(events).map((r) => ({
        name: dim(r),
        count: num(r),
        ratePct: sessions7d > 0 ? (num(r) / sessions7d) * 100 : 0,
      })),
    };
  } catch (err) {
    console.error("[site-analytics] échec de la requête GA4 Data API", err);
    return null;
  }
}

/**
 * The last minutes, from the separate Realtime pipeline (standard reports lag by several hours). This API has
 * no page dimension, so PUBLIC_PAGES cannot apply here; the tag's own limits to the public site still do.
 */
export function getSiteRealtimeAnalytics(): Promise<SiteRealtimeAnalytics | null> {
  return withinCeiling(fetchSiteRealtimeAnalytics(), "GA4 Realtime API");
}

async function fetchSiteRealtimeAnalytics(): Promise<SiteRealtimeAnalytics | null> {
  const propertyId = process.env.GA_PROPERTY_ID;
  const ga = getClient();
  if (!propertyId || !ga) return null;

  try {
    const property = `properties/${propertyId}`;
    const [[summary], [events]] = await Promise.all([
      // Google counts the last 30 minutes by default: far too wide to call someone online now.
      ga.runRealtimeReport(
        {
          property,
          metrics: [{ name: "activeUsers" }],
          minuteRanges: [{ startMinutesAgo: 4, endMinutesAgo: 0 }],
        },
        GA_CALL,
      ),
      ga.runRealtimeReport(
        {
          property,
          dimensions: [{ name: "eventName" }],
          metrics: [{ name: "eventCount" }],
          dimensionFilter: { filter: { fieldName: "eventName", inListFilter: { values: CONVERSION_NAMES } } },
        },
        GA_CALL,
      ),
    ]);
    return {
      activeUsersNow: num(summary.rows?.[0]),
      conversionsLast30min: (events.rows ?? []).map((r) => ({ name: dim(r), count: num(r) })),
    };
  } catch (err) {
    console.error("[site-analytics] échec de la requête GA4 Realtime API", err);
    return null;
  }
}
