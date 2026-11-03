import { reportSheets } from "@/lib/report";
import { buildXlsx } from "@/lib/xlsx";
import { route } from "@/lib/server/api";
import { requireMember } from "@/lib/server/guard";
import { fail } from "@/lib/server/http";
import { deleteReport, findReport } from "@/lib/server/reports";

export const dynamic = "force-dynamic";

const fileName = (title: string, date: Date) =>
  `${
    title
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "partie"
  }-${date.toISOString().slice(0, 10)}.xlsx`;

/** The results of a game as an Excel workbook. */
export const GET = route<{ id: string }>(async (_req, { id }) => {
  const report = await findReport(await requireMember(), id);
  if (!report) fail("Résultats introuvables.", 404);
  return new Response(buildXlsx(reportSheets(report, report.data)) as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName(report.title, report.playedAt)}"`,
      "Cache-Control": "no-store",
    },
  });
});

export const DELETE = route<{ id: string }>(async (_req, { id }) => {
  await deleteReport(await requireMember(), id);
  return { ok: true };
});
