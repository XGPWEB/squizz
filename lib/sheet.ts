/**
 * Reads a spreadsheet into rows of text, in the browser or in Node: CSV (comma, semicolon or tab), and
 * the first sheet of an Excel .xlsx file. No library: an .xlsx is a zip of XML files, read with
 * DecompressionStream and a few regular expressions (no DOMParser outside the browser).
 */

export type Rows = string[][];

/** CSV with the separator guessed from the first line, quoted fields and line breaks inside quotes. */
export function parseCsv(text: string): Rows {
  const source = text.replace(/^﻿/, "");
  const firstLine = source.split(/\r?\n/, 1)[0] ?? "";
  const count = (c: string) => firstLine.split(c).length - 1;
  const sep = [";", "\t", ","].reduce((best, c) => (count(c) > count(best) ? c : best), ";");
  const rows: Rows = [];
  let row: string[] = [],
    field = "",
    quoted = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (c === '"' && source[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && !field) quoted = true;
    else if (c === sep) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && source[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.map((r) => r.map((v) => v.trim()));
}

const MAX_ENTRY_BYTES = 20 * 1024 * 1024;

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const out = new Uint8Array(await new Response(stream).arrayBuffer());
  if (out.length > MAX_ENTRY_BYTES) throw new Error("Fichier Excel trop volumineux.");
  return out;
}

/** The files of a zip archive, by name (stored or deflated entries, as Excel writes them). */
async function unzip(bytes: Uint8Array, wanted: (name: string) => boolean) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i--)
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0) throw new Error("Ce fichier n’est pas un fichier Excel (.xlsx) valide.");
  const entries = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const files = new Map<string, string>();
  const decoder = new TextDecoder();
  for (let n = 0; n < entries && at + 46 <= bytes.length; n++) {
    if (view.getUint32(at, true) !== 0x02014b50) break;
    const method = view.getUint16(at + 10, true);
    const size = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const extra = view.getUint16(at + 30, true);
    const comment = view.getUint16(at + 32, true);
    const local = view.getUint32(at + 42, true);
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    at += 46 + nameLength + extra + comment;
    if (!wanted(name)) continue;
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const data = bytes.subarray(start, start + size);
    if (method !== 0 && method !== 8)
      throw new Error("Fichier Excel compressé d’une façon non prise en charge.");
    files.set(name, decoder.decode(method === 8 ? await inflate(data) : data));
  }
  return files;
}

const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decodeXml = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) =>
    e[0] === "#"
      ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10))
      : (entities[e] ?? m),
  );
/** The text of every <t> inside a piece of XML (rich text is split into several runs). */
const texts = (xml: string) =>
  [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decodeXml(m[1])).join("");
const columnIndex = (ref: string) =>
  [...ref.replace(/\d+/g, "")].reduce((n, c) => n * 26 + c.toUpperCase().charCodeAt(0) - 64, 0) - 1;

/** The first sheet of an .xlsx file, as rows of text (empty cells as ""). */
export async function readXlsx(bytes: Uint8Array): Promise<Rows> {
  const files = await unzip(
    bytes,
    (n) =>
      n === "xl/workbook.xml" ||
      n === "xl/_rels/workbook.xml.rels" ||
      n === "xl/sharedStrings.xml" ||
      /^xl\/worksheets\/[^/]+\.xml$/.test(n),
  );
  const workbook = files.get("xl/workbook.xml") ?? "";
  const firstId = /<sheet\b[^>]*\br:id="([^"]+)"/.exec(workbook)?.[1];
  const rels = files.get("xl/_rels/workbook.xml.rels") ?? "";
  const target = firstId
    ? [...rels.matchAll(/<Relationship\b[^>]*>/g)]
        .map((m) => m[0])
        .find((r) => r.includes(`Id="${firstId}"`))
        ?.match(/Target="([^"]+)"/)?.[1]
    : undefined;
  const path = target ? (target.startsWith("/") ? target.slice(1) : `xl/${target}`) : "";
  const sheet =
    files.get(path) ?? [...files.entries()].filter(([n]) => n.startsWith("xl/worksheets/")).sort()[0]?.[1];
  if (!sheet) throw new Error("Aucune feuille trouvée dans ce fichier Excel.");
  const shared = [...(files.get("xl/sharedStrings.xml") ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    texts(m[1]),
  );
  const rows: Rows = [];
  for (const r of sheet.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const index = Number(/\br="(\d+)"/.exec(r[1])?.[1] ?? rows.length + 1) - 1;
    const row: string[] = [];
    for (const c of r[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1];
      const body = c[2] ?? "";
      const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1];
      const type = /\bt="(\w+)"/.exec(attrs)?.[1];
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      const value =
        type === "s"
          ? (shared[Number(v)] ?? "")
          : type === "inlineStr"
            ? texts(body)
            : type === "b"
              ? v === "1"
                ? "VRAI"
                : "FAUX"
              : decodeXml(v ?? "");
      row[ref ? columnIndex(ref) : row.length] = value.trim();
    }
    rows[index] = Array.from(row, (v) => v ?? "");
  }
  return Array.from(rows, (r) => r ?? []);
}
