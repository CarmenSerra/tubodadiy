import type { TFunction } from "i18next";

import { DEFAULT_LANG, type Lang } from "@/lib/i18n/config";
import { dateFormatter, formatMoney } from "@/lib/i18n/format";
import {
  PAYER_PRESETS,
  isPayerPreset,
  type BudgetAllocation,
  type BudgetPlanSettings,
  type PayerPreset,
} from "@/components/budget/budget-model";
import type { BudgetInstallment, BudgetItem } from "@/lib/types";

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

// ---- Importes de una partida ----

const finite = (value: number | null | undefined): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

/** Importe previsto de una partida. */
export function itemAmount(item: BudgetItem): number {
  return finite(item.amount);
}

/** Importe real de una partida, si ya se conoce. */
export function itemActual(item: BudgetItem): number | null {
  return typeof item.actual === "number" && Number.isFinite(item.actual) ? item.actual : null;
}

/** Lo que cuesta la partida: el real si lo hay y, si no, el previsto. */
export function itemCost(item: BudgetItem): number {
  return itemActual(item) ?? itemAmount(item);
}

/** Plazos de la partida; las antiguas (sin plazos) se leen como un único plazo con su estado y fecha. */
export function itemInstallments(item: BudgetItem): BudgetInstallment[] {
  if (item.installments && item.installments.length > 0) return item.installments;
  return [
    {
      id: "single",
      amount: itemCost(item),
      dueDate: item.dueDate,
      paid: item.state === "paid",
      paidDate: null,
    },
  ];
}

export type PaymentStatus = "paid" | "partial" | "pending";

export interface ItemPayments {
  /** Lo que cuesta (real o, si no, previsto). */
  cost: number;
  /** Suma de los plazos pagados. */
  paid: number;
  /** Lo que falta por pagar hasta cubrir el coste. */
  pending: number;
  /** Próxima fecha límite (yyyy-MM-dd) de un plazo sin pagar, si queda algo por pagar. */
  nextDue: string | null;
  status: PaymentStatus;
  installments: BudgetInstallment[];
  paidCount: number;
}

/** Lo pagado y lo pendiente de una partida, sacado de sus plazos. */
export function itemPayments(item: BudgetItem): ItemPayments {
  const installments = itemInstallments(item);
  const cost = itemCost(item);
  const paid = installments.filter((p) => p.paid).reduce((sum, p) => sum + finite(p.amount), 0);
  const pending = Math.max(0, cost - paid);
  const dues = installments
    .filter((p) => !p.paid && p.dueDate)
    .map((p) => p.dueDate as string)
    .sort();
  const allPaid = installments.every((p) => p.paid);
  const status: PaymentStatus = allPaid && pending <= 0 ? "paid" : paid > 0 ? "partial" : "pending";
  return {
    cost,
    paid,
    pending,
    nextDue: pending > 0 && dues.length > 0 ? dues[0] : null,
    status,
    installments,
    paidCount: installments.filter((p) => p.paid).length,
  };
}

/** yyyy-MM-dd de hoy (hora local). */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Id para un plazo nuevo (único dentro de la partida). */
export function newInstallmentId(): string {
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Campos que se guardan al cambiar los plazos: los plazos y el resumen `state` / `dueDate`. */
export function installmentsPatch(
  item: BudgetItem,
  installments: BudgetInstallment[]
): Pick<BudgetItem, "amount" | "state" | "dueDate" | "installments"> {
  const payments = itemPayments({ ...item, installments });
  return {
    amount: item.amount,
    installments,
    state: payments.status === "paid" ? "paid" : "pending",
    dueDate: payments.nextDue,
  };
}

/** Importe con signo para una desviación: «+450 €», «−200 €» o «0 €». */
export function formatDeviation(value: number, lang: Lang = DEFAULT_LANG): string {
  const rounded = Math.round(value);
  if (rounded === 0) return formatMoney(0, lang);
  return `${rounded > 0 ? "+" : "−"}${formatMoney(Math.abs(rounded), lang)}`;
}

export interface BudgetTotals {
  /** Pagado: suma de los plazos ya pagados. */
  paid: number;
  paidCount: number;
  /** Pendiente por pagar: lo que falta hasta cubrir el coste de cada partida. */
  pending: number;
  pendingCount: number;
  /** Previsto: suma de los importes previstos. */
  planned: number;
  /** Real: suma de los importes reales (solo de las partidas que ya lo tienen). */
  actual: number;
  actualCount: number;
  /** Esperado: real donde se conoce y previsto en el resto. */
  expected: number;
  /** Real menos previsto, solo en las partidas con real (positivo = más caro de lo previsto). */
  deviation: number;
  itemCount: number;
  /** Te queda: presupuesto total menos lo esperado (negativo si te pasas). */
  remaining: number;
  /** Cuánto se supera el total (0 si no se supera o no hay total). */
  over: number;
  /** Porcentaje del total ya pagado (0-100, para la barra: paid + pending nunca pasan de 100). */
  paidRatio: number;
  /** Porcentaje del total pendiente (0-100, recortado para que la barra no se desborde). */
  pendingRatio: number;
  /** Porcentaje esperado sobre el total, sin tope (para el texto). */
  expectedPercent: number;
  /** Próxima fecha límite (yyyy-MM-dd) de un plazo pendiente, si alguna. */
  nextDue: string | null;
}

export function computeTotals(budgetTotal: number, items: BudgetItem[]): BudgetTotals {
  let paid = 0;
  let pending = 0;
  let planned = 0;
  let actual = 0;
  let actualCount = 0;
  let expected = 0;
  let deviation = 0;
  let paidCount = 0;
  const dues: string[] = [];
  for (const item of items) {
    const payments = itemPayments(item);
    paid += payments.paid;
    pending += payments.pending;
    if (payments.status === "paid") paidCount += 1;
    planned += itemAmount(item);
    expected += payments.cost;
    const real = itemActual(item);
    if (real !== null) {
      actual += real;
      actualCount += 1;
      deviation += real - itemAmount(item);
    }
    if (payments.nextDue) dues.push(payments.nextDue);
  }
  const hasTotal = budgetTotal > 0;
  const paidRatio = hasTotal ? Math.min(100, (paid / budgetTotal) * 100) : 0;
  const pendingRatio = hasTotal ? Math.min(100 - paidRatio, (pending / budgetTotal) * 100) : 0;
  dues.sort();
  return {
    paid,
    paidCount,
    pending,
    pendingCount: items.length - paidCount,
    planned,
    actual,
    actualCount,
    expected,
    deviation,
    itemCount: items.length,
    remaining: budgetTotal - expected,
    over: hasTotal && expected > budgetTotal ? expected - budgetTotal : 0,
    paidRatio,
    pendingRatio,
    expectedPercent: hasTotal ? Math.round((expected / budgetTotal) * 100) : 0,
    nextDue: dues.length > 0 ? dues[0] : null,
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
  /** Suma de importes previstos. */
  planned: number;
  /** Suma de importes reales (solo de las partidas que lo tienen). */
  actual: number;
  actualCount: number;
  /** Real donde se conoce y previsto en el resto. */
  expected: number;
  /** Real menos previsto, solo en las partidas con real. */
  deviation: number;
  paid: number;
  pending: number;
  count: number;
  /** Porcentaje (0-100) sobre el total esperado. */
  percent: number;
  /** Importe asignado en el reparto por categorías, si esta categoría está en él. */
  allocated: number | null;
}

/**
 * Desglose por categoría, de mayor a menor importe esperado. Con un reparto por categorías,
 * añade lo asignado a cada una (y las categorías asignadas que aún no tienen partidas).
 */
export function computeBreakdown(items: BudgetItem[], allocations: BudgetAllocation[] = []): CategoryRow[] {
  const map = new Map<string, Omit<CategoryRow, "percent">>();
  const blank = (key: string, label: string) => ({
    key: key || "__none__",
    label,
    planned: 0,
    actual: 0,
    actualCount: 0,
    expected: 0,
    deviation: 0,
    paid: 0,
    pending: 0,
    count: 0,
    allocated: null as number | null,
  });
  // Más antiguas primero: la etiqueta de cada categoría es la primera escrita.
  for (const item of oldestFirst(items)) {
    const label = item.category.trim() || UNCATEGORISED;
    const key = item.category.trim() ? normalize(label) : "";
    const row = map.get(key) ?? blank(key, label);
    const payments = itemPayments(item);
    const real = itemActual(item);
    row.planned += itemAmount(item);
    row.expected += payments.cost;
    if (real !== null) {
      row.actual += real;
      row.actualCount += 1;
      row.deviation += real - itemAmount(item);
    }
    row.paid += payments.paid;
    row.pending += payments.pending;
    row.count += 1;
    map.set(key, row);
  }
  for (const allocation of allocations) {
    const label = allocation.category.trim();
    if (!label) continue;
    const key = normalize(label);
    const row = map.get(key) ?? blank(key, label);
    row.allocated = (row.allocated ?? 0) + allocation.amount;
    map.set(key, row);
  }
  const rows = [...map.values()];
  const total = rows.reduce((sum, r) => sum + r.expected, 0);
  return rows
    .map((r) => ({ ...r, percent: total > 0 ? (r.expected / total) * 100 : 0 }))
    .sort(
      (a, b) =>
        b.expected - a.expected || (b.allocated ?? 0) - (a.allocated ?? 0) || a.label.localeCompare(b.label, "es")
    );
}

// ---- Quién paga ----

/** Clave de agrupación de un pagador: los predefinidos tal cual; el texto libre sin tildes ni mayúsculas. */
export function payerKey(payer: string | null | undefined): string {
  const text = (payer ?? "").trim();
  if (!text) return "";
  return isPayerPreset(text) ? text : normalize(text);
}

/** Nombre para enseñar: el personalizado del plan, el traducido (predefinidos) o el texto libre. */
export function payerLabel(
  payer: string,
  t: TFunction,
  labels: BudgetPlanSettings["payerLabels"] = {}
): string {
  if (isPayerPreset(payer)) return labels[payer] || t(`payers.${payer}`, { ns: "budget" });
  return payer;
}

export interface PayerRow {
  /** Clave de agrupación; «» = sin asignar. */
  key: string;
  /** Valor guardado de la partida (preset o texto libre); «» = sin asignar. */
  payer: string;
  expected: number;
  paid: number;
  pending: number;
  count: number;
  /** Porcentaje (0-100) sobre el total esperado. */
  percent: number;
}

/** Resumen por pagador: predefinidos primero, luego los demás por importe y, al final, sin asignar. */
export function computePayerSummary(items: BudgetItem[]): PayerRow[] {
  const map = new Map<string, Omit<PayerRow, "percent">>();
  for (const item of oldestFirst(items)) {
    const key = payerKey(item.payer);
    const row = map.get(key) ?? { key, payer: key ? (item.payer ?? "").trim() : "", expected: 0, paid: 0, pending: 0, count: 0 };
    const payments = itemPayments(item);
    row.expected += payments.cost;
    row.paid += payments.paid;
    row.pending += payments.pending;
    row.count += 1;
    map.set(key, row);
  }
  const rows = [...map.values()];
  const total = rows.reduce((sum, r) => sum + r.expected, 0);
  const rank = (r: { key: string }) => {
    if (r.key === "") return 2;
    return isPayerPreset(r.key) ? 0 : 1;
  };
  return rows
    .map((r) => ({ ...r, percent: total > 0 ? (r.expected / total) * 100 : 0 }))
    .sort((a, b) => {
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      if (rank(a) === 0) return PAYER_PRESETS.indexOf(a.key as PayerPreset) - PAYER_PRESETS.indexOf(b.key as PayerPreset);
      return b.expected - a.expected || a.payer.localeCompare(b.payer, "es");
    });
}

/** Pagadores de texto libre ya usados (sin repetir), para sugerirlos en el formulario. */
export function listCustomPayers(items: BudgetItem[]): string[] {
  const map = new Map<string, string>();
  for (const item of oldestFirst(items)) {
    const text = (item.payer ?? "").trim();
    if (text && !isPayerPreset(text) && !map.has(normalize(text))) map.set(normalize(text), text);
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, "es"));
}

// ---- Proveedores ----

export interface VendorBudget {
  items: BudgetItem[];
  expected: number;
  paid: number;
  pending: number;
  nextDue: string | null;
}

/** Lo que llevas pagado y pendiente de las partidas enlazadas a un proveedor. */
export function vendorBudget(items: BudgetItem[], vendorId: string): VendorBudget {
  const linked = items.filter((i) => i.vendorId === vendorId);
  const totals = computeTotals(0, linked);
  return { items: linked, expected: totals.expected, paid: totals.paid, pending: totals.pending, nextDue: totals.nextDue };
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
  return value < todayISO();
}
