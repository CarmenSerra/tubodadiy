import type { TFunction } from "i18next";

import { DEFAULT_LANG, type Lang } from "@/lib/i18n/config";
import { dateFormatter } from "@/lib/i18n/format";
import type { BudgetItem } from "@/lib/types";

// Importe en euros según el idioma (miles siempre agrupados, también de 4 cifras).
export { formatMoney } from "@/lib/i18n/format";

/** Etiqueta interna de las partidas sin categoría (se enseña traducida: budget:uncategorised). */
export const UNCATEGORISED = "Sin categoría";

/**
 * Clave (budget:categories.<clave>) de cada categoría conocida, por su nombre normalizado en
 * español. Lo guardado en Firestore es el nombre en español: solo se traduce al mostrarlo.
 * Las categorías propias del usuario se muestran tal cual.
 */
const CATEGORY_SLUGS: Record<string, string> = {
  lugar: "venue",
  "finca o espacio": "venueSpace",
  catering: "catering",
  "banquete y catering": "banquet",
  vestuario: "attire",
  "vestuario de la novia": "brideAttire",
  "vestuario del novio": "groomAttire",
  fotografia: "photography",
  "fotografia y video": "photoVideo",
  musica: "music",
  "musica y baile": "musicDance",
  "flores y decoracion": "flowersDecor",
  papeleria: "stationery",
  alianzas: "rings",
  belleza: "beauty",
  transporte: "transport",
  "detalles para invitados": "guestGifts",
  "luna de miel": "honeymoon",
  "ceremonia y tramites": "ceremony",
  // OFFICIANT_BUDGET_CATEGORY (plan-tools.ts): partida del oficiante.
  ceremonia: "ceremonyOfficiant",
  imprevistos: "contingency",
};

/** Categoría para enseñar: traducida si es una de las conocidas; si no, tal cual. */
export function categoryLabel(category: string, t: TFunction): string {
  const slug = CATEGORY_SLUGS[normalize(category)];
  return slug ? t(`categories.${slug}`, { ns: "budget" }) : category;
}

/** Importe de una partida (pagado o previsto). */
export function itemAmount(item: BudgetItem): number {
  return Number.isFinite(item.amount) ? item.amount : 0;
}

export interface BudgetTotals {
  /** Pagado: suma de los gastos ya pagados. */
  paid: number;
  paidCount: number;
  /** Pendiente por pagar: suma de los gastos previstos aún sin pagar. */
  pending: number;
  pendingCount: number;
  /** Previsto: pagado + pendiente. */
  planned: number;
  itemCount: number;
  /** Te queda: presupuesto total menos lo previsto (negativo si te pasas). */
  remaining: number;
  /** Cuánto se supera el total (0 si no se supera o no hay total). */
  over: number;
  /** Porcentaje del total ya pagado (0-100, para la barra: paid + pending nunca pasan de 100). */
  paidRatio: number;
  /** Porcentaje del total pendiente (0-100, recortado para que la barra no se desborde). */
  pendingRatio: number;
  /** Porcentaje previsto sobre el total, sin tope (para el texto). */
  plannedPercent: number;
  /** Próxima fecha límite (yyyy-MM-dd) de un gasto pendiente, si alguna. */
  nextDue: string | null;
}

export function computeTotals(budgetTotal: number, items: BudgetItem[]): BudgetTotals {
  const paidItems = items.filter((i) => i.state === "paid");
  const pendingItems = items.filter((i) => i.state !== "paid");
  const paid = paidItems.reduce((sum, i) => sum + itemAmount(i), 0);
  const pending = pendingItems.reduce((sum, i) => sum + itemAmount(i), 0);
  const planned = paid + pending;
  const hasTotal = budgetTotal > 0;
  const paidRatio = hasTotal ? Math.min(100, (paid / budgetTotal) * 100) : 0;
  const pendingRatio = hasTotal ? Math.min(100 - paidRatio, (pending / budgetTotal) * 100) : 0;
  const dues = pendingItems.map((i) => i.dueDate).filter((d): d is string => Boolean(d));
  return {
    paid,
    paidCount: paidItems.length,
    pending,
    pendingCount: pendingItems.length,
    planned,
    itemCount: items.length,
    remaining: budgetTotal - planned,
    over: hasTotal && planned > budgetTotal ? planned - budgetTotal : 0,
    paidRatio,
    pendingRatio,
    plannedPercent: hasTotal ? Math.round((planned / budgetTotal) * 100) : 0,
    nextDue: dues.length > 0 ? dues.sort()[0] : null,
  };
}

function oldestFirst(items: BudgetItem[]): BudgetItem[] {
  return [...items].sort((a, b) => (a.createdAt ?? Number.MAX_SAFE_INTEGER) - (b.createdAt ?? Number.MAX_SAFE_INTEGER));
}

export function normalize(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

export interface CategoryRow {
  key: string;
  label: string;
  /** Suma de importes (pagado + pendiente). */
  amount: number;
  paid: number;
  pending: number;
  count: number;
  /** Porcentaje (0-100) sobre el total previsto. */
  percent: number;
}

/** Desglose por categoría, de mayor a menor importe. */
export function computeBreakdown(items: BudgetItem[]): CategoryRow[] {
  const map = new Map<string, Omit<CategoryRow, "percent">>();
  // Más antiguas primero: la etiqueta de cada categoría es la primera escrita.
  for (const item of oldestFirst(items)) {
    const label = item.category.trim() || UNCATEGORISED;
    const key = item.category.trim() ? normalize(label) : "";
    const row = map.get(key) ?? { key: key || "__none__", label, amount: 0, paid: 0, pending: 0, count: 0 };
    row.amount += itemAmount(item);
    if (item.state === "paid") row.paid += itemAmount(item);
    else row.pending += itemAmount(item);
    row.count += 1;
    map.set(key, row);
  }
  const rows = [...map.values()];
  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  return rows
    .map((r) => ({ ...r, percent: total > 0 ? (r.amount / total) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label, "es"));
}

/** Categorías ya usadas (sin repetir), para sugerirlas en el formulario. */
export function listCategories(items: BudgetItem[]): string[] {
  const map = new Map<string, string>();
  for (const item of oldestFirst(items)) {
    const label = item.category.trim();
    if (label && !map.has(normalize(label))) map.set(normalize(label), label);
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, "es"));
}

/**
 * Categoría ya existente que coincide con `name` (sin mayúsculas ni tildes), o `name` tal cual.
 * Con `label`, también coincide con el nombre traducido que ve el usuario («Venue» → «Lugar»).
 */
export function matchCategory(name: string, categories: string[], label?: (category: string) => string): string {
  const clean = name.trim().replace(/\s+/g, " ");
  const key = normalize(clean);
  return (
    categories.find((c) => normalize(c) === key) ??
    (label ? categories.find((c) => normalize(label(c)) === key) : undefined) ??
    clean
  );
}

/** Fecha yyyy-MM-dd → «12 nov» / «12 Nov» (con el año si no es el actual). */
export function formatDue(value: string, lang: Lang = DEFAULT_LANG): string {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  const date = new Date(y, m - 1, d);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return dateFormatter(lang, {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  })
    .format(date)
    .replace(".", "");
}

/** ¿Ya ha pasado la fecha límite (yyyy-MM-dd)? */
export function isOverdue(value: string): boolean {
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return value < iso;
}
