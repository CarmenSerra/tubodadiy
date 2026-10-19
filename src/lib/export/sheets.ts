// Punto de entrada común: convierte tablas en un fichero CSV o XLSX y lo descarga.

import type { Lang } from "@/lib/i18n/config";
import { toCsv } from "./csv";
import { currentLang, downloadBlob, exportFileName } from "./download";
import type { ExportFormat, ExportSheet } from "./types";
import { XLSX_MIME, buildXlsx } from "./xlsx";

export type { Cell, ColumnKind, ExportColumn, ExportFormat, ExportSheet } from "./types";

/** Genera el fichero (sin descargarlo): útil para probar y para compartir. */
export function buildSheetsFile(
  sheets: ExportSheet[],
  format: ExportFormat,
  lang: Lang
): { data: BlobPart; mime: string } {
  if (format === "xlsx") {
    // Se pasa como ArrayBuffer para que Blob reciba un BlobPart «puro».
    const bytes = buildXlsx(sheets);
    return { data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, mime: XLSX_MIME };
  }
  return { data: toCsv(sheets, { lang }), mime: "text/csv;charset=utf-8" };
}

/** Descarga las tablas como `<base>-<fecha>.xlsx|csv`. */
export function downloadSheets(
  sheets: ExportSheet[],
  format: ExportFormat,
  baseName: string,
  lang: Lang = currentLang()
): void {
  const { data, mime } = buildSheetsFile(sheets, format, lang);
  downloadBlob(exportFileName(baseName, format), data, mime);
}
