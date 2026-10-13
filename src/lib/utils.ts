import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

import { DEFAULT_LANG, type Lang } from "@/lib/i18n/config";
import { formatDateValue, formatMoney, noDateLabel } from "@/lib/i18n/format";

// Las sombras de marca (shadow-pop/lift/float, definidas en globals.css) deben
// competir con shadow-none/shadow-sm como cualquier otra sombra; sin esto
// tailwind-merge las toma por un color de sombra y no resuelve el conflicto.
const twMerge = extendTailwindMerge({
  extend: { theme: { shadow: ["pop", "lift", "float"] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Importe en euros según el idioma (por defecto español). Ver "@/lib/i18n/format". */
export function formatCurrency(value: number | null | undefined, lang: Lang = DEFAULT_LANG): string {
  return formatMoney(value, lang);
}

/**
 * Interpreta un importe escrito a la española: "12.000", "12000,50", "12 000 €",
 * "12000.5". Devuelve NaN si no es un número.
 */
export function parseAmount(raw: string): number {
  let text = raw.replace(/[\s €]/g, "");
  if (!text || !/^-?[\d.,]+$/.test(text)) return Number.NaN;
  if (text.includes(",")) {
    // La coma es el decimal; los puntos, miles.
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(text)) {
    // "12.000" o "1.250.000": puntos de miles.
    text = text.replace(/\./g, "");
  }
  if ((text.match(/\./g) ?? []).length > 1) return Number.NaN;
  return Number(text);
}

/** Fecha larga según el idioma (por defecto español); «Sin fecha» / «No date» si falta o no es válida. */
export function formatDate(value: string | null | undefined, lang: Lang = DEFAULT_LANG): string {
  return formatDateValue(value, lang) ?? noDateLabel(lang);
}

export function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null;
  const target = new Date(value + "T00:00:00");
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = target.getTime() - today.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}
