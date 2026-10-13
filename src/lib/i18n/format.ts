// Formato de fechas, moneda y números según el idioma (Intl). Todas las
// funciones aceptan `lang` y, si falta, usan español, así que las llamadas
// antiguas siguen valiendo. Los formateadores se cachean por idioma+opciones.

import { DEFAULT_LANG, localeOf, type Lang } from "./config";
import { getServerT } from "./server";

const dateCache = new Map<string, Intl.DateTimeFormat>();
const numberCache = new Map<string, Intl.NumberFormat>();

/** Intl.DateTimeFormat cacheado para un idioma de la app. */
export function dateFormatter(lang: Lang = DEFAULT_LANG, options: Intl.DateTimeFormatOptions = {}) {
  const key = lang + JSON.stringify(options);
  let f = dateCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(localeOf(lang), options);
    dateCache.set(key, f);
  }
  return f;
}

/** Intl.NumberFormat cacheado para un idioma de la app. */
export function numberFormatter(lang: Lang = DEFAULT_LANG, options: Intl.NumberFormatOptions = {}) {
  const key = lang + JSON.stringify(options);
  let f = numberCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(localeOf(lang), options);
    numberCache.set(key, f);
  }
  return f;
}

/** Fecha guardada como "YYYY-MM-DD" → Date local (sin desfase de zona horaria). */
export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value + "T00:00:00");
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Fecha ("YYYY-MM-DD" o Date) con formato largo por defecto: «5 de junio de
 * 2027» / «5 June 2027». Pasa `options` para otro formato (solo mes, etc.).
 */
export function formatDateValue(
  value: string | Date | null | undefined,
  lang: Lang = DEFAULT_LANG,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }
): string | null {
  const date = typeof value === "string" || value == null ? parseDateOnly(value) : value;
  if (!date || Number.isNaN(date.getTime())) return null;
  return dateFormatter(lang, options).format(date);
}

/**
 * Importe en euros. 4 cifras agrupadas siempre (3.450 € / €3,450) para que todas
 * las cifras de la app casen. «—» si no hay valor.
 */
export function formatMoney(
  value: number | null | undefined,
  lang: Lang = DEFAULT_LANG,
  options: Intl.NumberFormatOptions = {}
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return numberFormatter(lang, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
    useGrouping: "always",
    ...options,
  }).format(value);
}

/** Número con separadores del idioma (miles agrupados siempre, también de 4 cifras). */
export function formatNumber(
  value: number | null | undefined,
  lang: Lang = DEFAULT_LANG,
  options: Intl.NumberFormatOptions = {}
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return numberFormatter(lang, { useGrouping: "always", ...options }).format(value);
}

/** Texto de «sin fecha» en el idioma pedido (common:date.none). */
export function noDateLabel(lang: Lang = DEFAULT_LANG): string {
  return getServerT(lang, "common")("date.none");
}
