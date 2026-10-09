import type { BudgetItem } from "@/lib/types";

const EURO = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
  // es-ES no agrupa los números de 4 cifras (3450 €) pero sí los de 5 (20.000 €);
  // aquí se fuerza siempre para que las cifras de una misma pantalla casen.
  useGrouping: "always",
});

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return EURO.format(value);
}

export const UNCATEGORISED = "Sin categoría";

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

/** Categoría ya existente que coincide con `name` (sin mayúsculas ni tildes), o `name` tal cual. */
export function matchCategory(name: string, categories: string[]): string {
  const clean = name.trim().replace(/\s+/g, " ");
  const key = normalize(clean);
  return categories.find((c) => normalize(c) === key) ?? clean;
}

/** Fecha yyyy-MM-dd → «12 nov» (con el año si no es el actual). */
export function formatDue(value: string): string {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  const date = new Date(y, m - 1, d);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat("es-ES", {
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
