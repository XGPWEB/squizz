import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Lock, Minus, X } from "lucide-react";
import { pageUser } from "@/lib/server/guard";
import { findReport } from "@/lib/server/reports";
import { overallSuccess } from "@/lib/report";
import { ReportActions } from "./report-actions";

export const metadata: Metadata = { title: "Résultats de la partie" };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await pageUser();
  const report = await findReport(
    user as typeof user & { organizationId: string },
    decodeURIComponent((await params).id),
  );
  if (!report) notFound();
  const { data } = report;
  const success = overallSuccess(data);
  const scored = data.questions.some((q) => q.scored);
  const played = report.playedAt.toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    dateStyle: "full",
    timeStyle: "short",
  });
  return (
    <div className="report">
      <Link href="/app/resultats" className="back-link no-print">
        <ArrowLeft size={16} /> Tous les résultats
      </Link>
      <div className="dash-heading">
        <div>
          <p className="eyebrow">RÉSULTATS DE LA PARTIE</p>
          <h1>{report.title}</h1>
          <p className="hint">
            {played} · animée par {report.hostName}
            {!report.finished && ` · arrêtée après ${data.questions.length} question(s) sur ${data.total}`}
          </p>
        </div>
        <ReportActions id={report.id} canDelete={report.canDelete} />
      </div>

      <div className="usage-grid">
        <div className="usage">
          <span>Joueurs</span>
          <strong>{report.players}</strong>
        </div>
        <div className="usage">
          <span>Questions</span>
          <strong>
            {data.questions.length}
            {data.questions.length < data.total && <small> / {data.total}</small>}
          </strong>
        </div>
        {success !== null && (
          <div className="usage">
            <span>Réussite moyenne</span>
            <strong>{success} %</strong>
            <div className="bar-track" aria-hidden>
              <span style={{ width: `${success}%` }} />
            </div>
          </div>
        )}
        {scored && data.players[0] && (
          <div className="usage">
            <span>Meilleur score</span>
            <strong>{data.players[0].score.toLocaleString("fr-FR")}</strong>
            <small>
              {data.players
                .filter((p) => p.rank === 1)
                .map((p) => p.name)
                .join(", ")}
            </small>
          </div>
        )}
      </div>

      <section className="panel">
        <h2>{scored ? "Classement" : "Participants"}</h2>
        <div className="table-wrap">
          <table className="data-table report-table">
            <thead>
              <tr>
                {scored && <th>Rang</th>}
                <th>Pseudo</th>
                {scored && <th>Score</th>}
                {scored && <th>Bonnes réponses</th>}
                <th>Réponses données</th>
              </tr>
            </thead>
            <tbody>
              {data.players.map((p) => (
                <tr key={p.name}>
                  {scored && (
                    <td>
                      <span className={`rank-chip r${Math.min(p.rank, 4)}`}>{p.rank}</span>
                    </td>
                  )}
                  <td>
                    <strong>{p.name}</strong>
                  </td>
                  {scored && <td>{p.score.toLocaleString("fr-FR")}</td>}
                  {scored && (
                    <td>
                      {p.correct} / {data.questions.filter((q) => q.scored).length}
                    </td>
                  )}
                  <td>
                    {p.answered} / {data.questions.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Question par question</h2>
        <ol className="report-questions">
          {data.questions.map((q, i) => (
            <li key={q.index} className="report-question">
              <div className="report-question-head">
                <span className="tag">
                  Q{i + 1} · {q.typeLabel}
                </span>
                {q.anonymous && (
                  <span className="tag anonymous">
                    <Lock size={12} aria-hidden /> Anonyme
                  </span>
                )}
                <h3>{q.text || "(sans texte)"}</h3>
                <p className="hint">
                  {q.responses} réponse{q.responses > 1 ? "s" : ""}
                  {q.solution && (
                    <>
                      {" "}
                      · bonne réponse : <strong>{q.solution}</strong>
                    </>
                  )}
                  {q.average !== null && q.type !== "slider" && (
                    <> · moyenne : {Math.round(q.average * 10) / 10}</>
                  )}
                  {q.nps !== null && <> · NPS : {q.nps}</>}
                </p>
              </div>
              {q.successRate !== null && (
                <div className="report-success">
                  <strong>{q.successRate} %</strong>
                  <small>de réussite</small>
                </div>
              )}
              {q.top.length > 0 && (
                <ul className="report-top">
                  {q.top.map((t) => (
                    <li key={t.label}>
                      <span>{t.label}</span>
                      <span className="bar-track" aria-hidden>
                        <span style={{ width: `${q.responses ? (100 * t.count) / q.responses : 0}%` }} />
                      </span>
                      <b>{t.count}</b>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="panel">
        <h2>Réponses de chaque joueur</h2>
        <div className="table-wrap">
          <table className="data-table report-grid">
            <thead>
              <tr>
                <th>Pseudo</th>
                {data.questions.map((q, i) => (
                  <th key={q.index} title={q.anonymous ? `${q.text} (réponses anonymes)` : q.text}>
                    Q{i + 1}
                    {q.anonymous && <Lock size={11} aria-label="anonyme" />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.players.map((p) => (
                <tr key={p.name}>
                  <th scope="row">{p.name}</th>
                  {p.answers.map((a, i) => (
                    <td
                      key={i}
                      className={`report-cell is-${a ? a.outcome : "none"}`}
                      title={a ? `${a.text}${a.points ? ` · ${a.points} pts` : ""}` : "Pas de réponse"}
                    >
                      {a ? (
                        <>
                          {a.outcome === "correct" ? (
                            <Check size={14} aria-label="Juste" />
                          ) : a.outcome === "incorrect" ? (
                            <X size={14} aria-label="Faux" />
                          ) : null}
                          <span>{a.text}</span>
                        </>
                      ) : (
                        <Minus size={14} aria-label="Pas de réponse" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
