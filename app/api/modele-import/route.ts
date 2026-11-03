import { importTemplate } from "@/lib/sheet-import";
import { buildXlsx } from "@/lib/xlsx";

/** The spreadsheet template to prepare questions in Excel and import them. */
export function GET() {
  return new Response(buildXlsx(importTemplate()) as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="modele-questions-squizz.xlsx"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
