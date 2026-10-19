// CSV pensado para Excel: UTF-8 con BOM, fin de línea CRLF y separador «;» en
// español (que es el que espera Excel con configuración regional española; el
// «,» chocaría con los decimales). En inglés, «,» y punto decimal.

import type { Cell, ExportColumn, ExportSheet } from "./types";

export const BOM = "﻿";

export interface CsvOptions {
  /** `es` = «;» y coma decimal; `en` = «,» y punto decimal. */
  lang?: string;
}

function separatorOf(lang: string | undefined): string {
  return lang === "en" ? "," : ";";
}

/** Un `+34 600…` es un teléfono, no una fórmula: no se toca. */
const PHONE_LIKE = /^\+[\d\s().-]+$/;

/**
 * Evita la «inyección de fórmulas»: si un texto empieza por = + - @ (o tab/CR),
 * Excel lo ejecutaría al abrir el CSV. Se antepone un apóstrofo.
 */
export function neutralizeFormula(text: string): string {
  if (!text) return text;
  if (/^[=@\t\r]/.test(text)) return `'${text}`;
  if (/^[+-]/.test(text) && !PHONE_LIKE.test(text)) return `'${text}`;
  return text;
}

function formatNumber(value: number, kind: ExportColumn["kind"], lang: string | undefined): string {
  if (!Number.isFinite(value)) return "";
  const text = kind === "money" ? value.toFixed(2) : String(value);
  return lang === "en" ? text : text.replace(".", ",");
}

function cellText(cell: Cell, kind: ExportColumn["kind"], lang: string | undefined): string {
  if (cell === null || cell === undefined || cell === "") return "";
  if (typeof cell === "number") return formatNumber(cell, kind, lang);
  // Las fechas ISO no son peligrosas y Excel las reconoce tal cual.
  return kind === "date" ? cell : neutralizeFormula(cell);
}

function quote(text: string, sep: string): string {
  return text.includes(sep) || /["\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function rowText(cells: string[], sep: string): string {
  return cells.map((c) => quote(c, sep)).join(sep);
}

/** Una hoja como líneas de CSV (cabecera + filas). */
export function sheetLines(sheet: ExportSheet, options: CsvOptions = {}): string[] {
  const sep = separatorOf(options.lang);
  const lines = [rowText(sheet.columns.map((c) => neutralizeFormula(c.header)), sep)];
  for (const row of sheet.rows) {
    lines.push(
      rowText(
        sheet.columns.map((col, i) => cellText(row[i], col.kind, options.lang)),
        sep
      )
    );
  }
  return lines;
}

/**
 * CSV completo con BOM. Con varias hojas, cada bloque lleva su nombre en una
 * línea y se separa del siguiente por una línea en blanco.
 */
export function toCsv(sheets: ExportSheet[], options: CsvOptions = {}): string {
  const sep = separatorOf(options.lang);
  const lines: string[] = [];
  sheets.forEach((sheet, index) => {
    if (sheets.length > 1) {
      if (index > 0) lines.push("");
      lines.push(quote(neutralizeFormula(sheet.name), sep));
    }
    lines.push(...sheetLines(sheet, options));
  });
  return BOM + lines.join("\r\n") + "\r\n";
}
