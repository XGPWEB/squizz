import { CONVERSIONS, type ConversionName } from "@/lib/analytics";
import {
  getSiteAnalytics,
  getSiteRealtimeAnalytics,
  type SiteAnalytics,
  type SiteRealtimeAnalytics,
} from "@/lib/server/site-analytics";

const CHANNELS: Record<string, string> = {
  Direct: "Direct",
  "Organic Search": "Recherche organique",
  Referral: "Référent",
  "Paid Search": "Recherche payante",
  "Organic Social": "Réseaux sociaux",
  "Paid Social": "Réseaux sociaux (payant)",
  Email: "E-mail",
  "Organic Video": "Vidéo organique",
  Display: "Display",
  Affiliates: "Affiliation",
  Unassigned: "Non attribué",
};
const DEVICES: Record<string, string> = {
  desktop: "Ordinateur",
  mobile: "Mobile",
  tablet: "Tablette",
  smart_tv: "TV connectée",
};

const fr = (n: number) => n.toLocaleString("fr-FR");

function Heading({ children }: { children?: React.ReactNode }) {
  return (
    <div className="traffic-head">
      <h2>
        Trafic <span className="sticker pink-sticker">du site</span>
      </h2>
      <span className="traffic-period">7 derniers jours</span>
      {children}
    </div>
  );
}

function Trend({ changePct, current }: { changePct: number | null; current: number }) {
  if (changePct === null) return current > 0 ? <span className="traffic-trend">Nouveau</span> : null;
  const rounded = Math.round(changePct);
  if (rounded === 0) return <span className="traffic-trend">= vs 7 j préc.</span>;
  return (
    <span className={`traffic-trend ${rounded > 0 ? "up" : "down"}`}>
      {rounded > 0 ? "▲" : "▼"} {Math.abs(rounded)} % vs 7 j préc.
    </span>
  );
}

function Counter({ label, value, change }: { label: string; value: number; change: number | null }) {
  return (
    <div className="usage">
      <span>{label}</span>
      <strong>{fr(value)}</strong>
      <Trend changePct={change} current={value} />
    </div>
  );
}

/** A top list: each line is filled in proportion to the first one. */
function Ranking({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="traffic-list">
      <h3>{title}</h3>
      <ul>
        {rows.map((r, i) => (
          <li
            key={r.label}
            style={{ "--share": r.value / max, "--i": i } as React.CSSProperties}
            title={r.label}
          >
            <span>{r.label}</span>
            <b>{fr(r.value)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteTrafficView({
  analytics,
  realtime,
}: {
  analytics: SiteAnalytics | null;
  realtime: SiteRealtimeAnalytics | null;
}) {
  const live = realtime !== null && (
    <span className="traffic-live">
      <i aria-hidden /> {fr(realtime.activeUsersNow)} en ligne en ce moment
    </span>
  );
  if (analytics === null) {
    return (
      <section className="traffic" aria-label="Trafic du site">
        <Heading>{live}</Heading>
        <p className="traffic-empty">
          Google Analytics n’est pas encore disponible (configuration incomplète ou accès pas encore accordé
          au compte de service).
        </p>
      </section>
    );
  }
  const recent = realtime?.conversionsLast30min ?? [];
  return (
    <section className="traffic" aria-label="Trafic du site">
      <Heading>{live}</Heading>
      <div className="traffic-counters">
        <Counter label="Visiteurs" value={analytics.activeUsers7d} change={analytics.activeUsersChangePct} />
        <Counter label="Sessions" value={analytics.sessions7d} change={analytics.sessionsChangePct} />
        <Counter label="Pages vues" value={analytics.pageViews7d} change={analytics.pageViewsChangePct} />
      </div>
      <div className="traffic-lists">
        <Ranking
          title="Pages les plus vues"
          rows={analytics.topPages.map((p) => ({ label: p.path, value: p.views }))}
        />
        <Ranking
          title="Sources de trafic"
          rows={analytics.topSources.map((s) => ({
            label: CHANNELS[s.source] ?? s.source,
            value: s.sessions,
          }))}
        />
        <Ranking
          title="Villes"
          rows={analytics.topCities.map((c) => ({
            label: c.city === "(not set)" ? "Ville non déterminée" : c.city,
            value: c.activeUsers,
          }))}
        />
        <Ranking
          title="Appareils"
          rows={analytics.deviceBreakdown.map((d) => ({
            label: DEVICES[d.device] ?? d.device,
            value: d.sessions,
          }))}
        />
      </div>
      <div className="traffic-conversions-head">
        <h3>Conversions</h3>
        {realtime !== null && (
          <span>{fr(recent.reduce((sum, c) => sum + c.count, 0))} dans les 30 dernières minutes</span>
        )}
      </div>
      <div className="traffic-conversions">
        {(Object.keys(CONVERSIONS) as ConversionName[]).map((name) => {
          const conversion = analytics.conversions.find((c) => c.name === name);
          const now = recent.find((c) => c.name === name)?.count ?? 0;
          return (
            <div key={name}>
              <span>{CONVERSIONS[name]}</span>
              <strong>
                {fr(conversion?.count ?? 0)}
                {now > 0 && <small>+{fr(now)} maintenant</small>}
              </strong>
              {analytics.sessions7d > 0 && (
                <small>
                  {(conversion?.ratePct ?? 0).toLocaleString("fr-FR", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}{" "}
                  % des sessions
                </small>
              )}
            </div>
          );
        })}
      </div>
      <p className="traffic-note">
        Pages publiques uniquement, et seulement les visiteurs qui ont accepté la mesure d’audience : le
        trafic réel est plus élevé. Les chiffres mettent quelques heures à arriver, sauf le temps réel.
      </p>
    </section>
  );
}

/** Shown while Google answers, so that a slow call never holds up the rest of the dashboard. */
export function SiteTrafficLoading() {
  return (
    <section className="traffic" aria-label="Trafic du site" aria-busy="true">
      <Heading />
      <p className="traffic-empty">Lecture des chiffres…</p>
    </section>
  );
}

export async function SiteTraffic() {
  const [analytics, realtime] = await Promise.all([getSiteAnalytics(), getSiteRealtimeAnalytics()]);
  return <SiteTrafficView analytics={analytics} realtime={realtime} />;
}
