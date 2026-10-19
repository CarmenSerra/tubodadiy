// XLSX mínimo y sin dependencias: un ZIP «stored» (sin comprimir) con las
// partes imprescindibles de SpreadsheetML. Lo bastante para abrirse en Excel,
// LibreOffice y Google Sheets con una cabecera en negrita fija, filtros,
// importes con formato de euros, fechas reales y varias hojas. Los textos van
// como cadenas en línea (nunca se evalúan como fórmulas).

import type { Cell, ColumnKind, ExportSheet } from "./types";

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// ---------- ZIP (método 0, sin compresión) ----------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

function dosDateTime(now: Date): { time: number; date: number } {
  const year = Math.max(1980, now.getFullYear());
  return {
    time: (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate(),
  };
}

/** ZIP sin compresión (suficiente para ficheros pequeños de texto). */
export function zipStore(entries: ZipEntry[], now: Date = new Date()): Uint8Array {
  const encoder = new TextEncoder();
  const { time, date } = dosDateTime(now);
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const local = new Uint8Array(30 + name.length + size);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true); // versión necesaria
    lv.setUint16(6, 0x0800, true); // nombres en UTF-8
    lv.setUint16(8, 0, true); // método: stored
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, name.length, true);
    lv.setUint16(28, 0, true);
    local.set(name, 30);
    local.set(entry.data, 30 + name.length);
    locals.push(local);

    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true); // versión con que se creó
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    central.set(name, 46);
    centrals.push(central);

    offset += local.length;
  }

  const centralSize = centrals.reduce((sum, c) => sum + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const out = new Uint8Array(offset + centralSize + end.length);
  let pos = 0;
  for (const part of [...locals, ...centrals, end]) {
    out.set(part, pos);
    pos += part.length;
  }
  return out;
}

// ---------- SpreadsheetML ----------

/** Quita los caracteres de control que XML 1.0 no admite y escapa los especiales. */
export function xmlEscape(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 0 → A, 25 → Z, 26 → AA… */
export function columnLetters(index: number): string {
  let n = index + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

/** Nombre de hoja válido: ≤31 caracteres, sin []:*?/\ y sin repetirse. */
export function sheetNames(names: string[]): string[] {
  const used = new Set<string>();
  return names.map((raw, index) => {
    const base = (raw.replace(/[[\]:*?/\\]/g, " ").replace(/\s+/g, " ").trim() || `Hoja ${index + 1}`).slice(0, 31);
    let name = base;
    let n = 2;
    while (used.has(name.toLowerCase())) {
      const suffix = ` (${n++})`;
      name = base.slice(0, 31 - suffix.length) + suffix;
    }
    used.add(name.toLowerCase());
    return name;
  });
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Número de serie de Excel (días desde 1899-12-30) de un `yyyy-MM-dd`, o null. */
export function excelSerial(iso: string): number | null {
  const m = DATE_RE.exec(iso);
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(ms)) return null;
  return Math.round((ms - Date.UTC(1899, 11, 30)) / 86_400_000);
}

// Estilos (índices de cellXfs en styles.xml).
const STYLE_DEFAULT = 0;
const STYLE_HEADER = 1;
const STYLE_MONEY = 2;
const STYLE_DATE = 3;
const STYLE_WRAP = 4;

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0.00\\ &quot;€&quot;"/><numFmt numFmtId="165" formatCode="yyyy\\-mm\\-dd"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFECE6F4"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="5">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="left"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

function textCell(ref: string, text: string, style: number): string {
  const s = style ? ` s="${style}"` : "";
  return `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${xmlEscape(text)}</t></is></c>`;
}

function dataCell(ref: string, cell: Cell, kind: ColumnKind): string {
  if (cell === null || cell === undefined || cell === "") return "";
  if (typeof cell === "number") {
    if (!Number.isFinite(cell)) return "";
    const style = kind === "money" ? STYLE_MONEY : STYLE_DEFAULT;
    return `<c r="${ref}"${style ? ` s="${style}"` : ""}><v>${cell}</v></c>`;
  }
  if (kind === "date") {
    const serial = excelSerial(cell);
    if (serial !== null) return `<c r="${ref}" s="${STYLE_DATE}"><v>${serial}</v></c>`;
  }
  // Texto con saltos de línea: ajuste de texto para que se vea entero.
  return textCell(ref, cell, cell.includes("\n") ? STYLE_WRAP : STYLE_DEFAULT);
}

function columnWidth(sheet: ExportSheet, index: number): number {
  const column = sheet.columns[index];
  if (column.width) return column.width;
  let longest = column.header.length;
  for (const row of sheet.rows) {
    const cell = row[index];
    const len =
      cell === null || cell === undefined
        ? 0
        : typeof cell === "number"
          ? column.kind === "money"
            ? 14
            : String(cell).length
          : Math.max(...cell.split("\n").map((l) => l.length));
    if (len > longest) longest = len;
  }
  return Math.min(60, Math.max(8, longest + 2));
}

function sheetXml(sheet: ExportSheet): string {
  const lastCol = columnLetters(Math.max(0, sheet.columns.length - 1));
  const lastRow = sheet.rows.length + 1;
  const cols = sheet.columns
    .map((_, i) => `<col min="${i + 1}" max="${i + 1}" width="${columnWidth(sheet, i)}" customWidth="1"/>`)
    .join("");
  const header = sheet.columns
    .map((c, i) => textCell(`${columnLetters(i)}1`, c.header, STYLE_HEADER))
    .join("");
  const body = sheet.rows
    .map((row, r) => {
      const cells = sheet.columns
        .map((c, i) => dataCell(`${columnLetters(i)}${r + 2}`, row[i], c.kind ?? "text"))
        .join("");
      return `<row r="${r + 2}">${cells}</row>`;
    })
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<dimension ref="A1:${lastCol}${lastRow}"/>` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="15"/>` +
    `<cols>${cols}</cols>` +
    `<sheetData><row r="1" ht="22" customHeight="1">${header}</row>${body}</sheetData>` +
    `<autoFilter ref="A1:${lastCol}${lastRow}"/>` +
    `</worksheet>`
  );
}

/** Libro XLSX con una hoja por tabla. */
export function buildXlsx(sheets: ExportSheet[], now: Date = new Date()): Uint8Array {
  const list = sheets.length > 0 ? sheets : [{ name: "", columns: [{ header: "" }], rows: [] }];
  const names = sheetNames(list.map((s) => s.name));
  const encoder = new TextEncoder();
  const file = (name: string, xml: string): ZipEntry => ({ name, data: encoder.encode(xml) });

  const contentTypes =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    list
      .map(
        (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
      )
      .join("") +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `</Types>`;

  const rootRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`;

  const workbook =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets>${names.map((n, i) => `<sheet name="${xmlEscape(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>` +
    `</workbook>`;

  const workbookRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    list
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
      )
      .join("") +
    `<Relationship Id="rId${list.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `</Relationships>`;

  return zipStore(
    [
      file("[Content_Types].xml", contentTypes),
      file("_rels/.rels", rootRels),
      file("xl/workbook.xml", workbook),
      file("xl/_rels/workbook.xml.rels", workbookRels),
      file("xl/styles.xml", STYLES_XML),
      ...list.map((sheet, i) => file(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(sheet))),
    ],
    now
  );
}
