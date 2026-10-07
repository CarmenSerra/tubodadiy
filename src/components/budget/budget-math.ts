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

/** Importe conocido de una partida: coste real y, si aún no hay, el estimado. */
export function itemAmount(item: BudgetItem): number {
  return item.actualCost ?? item.estimatedCost ?? 0;
}

export interface BudgetTotals {
  /** Suma de costes estimados. */
  estimated: number;
  /** Gastado: suma de costes reales apuntados. */
  spent: number;
  /** Pagado: partidas marcadas como pagadas, a coste real o, si falta, estimado. */
  paid: number;
  paidCount: number;
  itemCount: number;
  /** Te queda: presupuesto total menos lo gastado (negativo si te pasas). */
  remaining: number;
  /** Cuánto se supera el total (0 si no se supera o no hay total). */
  over: number;
  /** Porcentaje gastado sobre el total (0-100 para la barra, sin pasar de 100). */
  spentRatio: number;
  /** Porcentaje gastado real, sin tope (para el texto). */
  spentPercent: number;
}

export function computeTotals(budgetTotal: number, items: BudgetItem[]): BudgetTotals {
  const estimated = items.reduce((sum, i) => sum + (i.estimatedCost || 0), 0);
  const spent = items.reduce((sum, i) => sum + (i.actualCost || 0), 0);
  const paidItems = items.filter((i) => i.paid);
  const paid = paidItems.reduce((sum, i) => sum + itemAmount(i), 0);
  const spentPercent = budgetTotal > 0 ? Math.round((spent / budgetTotal) * 100) : 0;
  return {
    estimated,
    spent,
    paid,
    paidCount: paidItems.length,
    itemCount: items.length,
    remaining: budgetTotal - spent,
    over: budgetTotal > 0 && spent > budgetTotal ? spent - budgetTotal : 0,
    spentRatio: Math.min(100, spentPercent),
    spentPercent,
  };
}

function oldestFirst(items: BudgetItem[]): BudgetItem[] {
  return [...items].sort((a, b) => (a.createdAt ?? Number.MAX_SAFE_INTEGER) - (b.createdAt ?? Number.MAX_SAFE_INTEGER));
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

export interface CategoryRow {
  key: string;
  label: string;
  /** Suma de importes (real o, si falta, estimado). */
  amount: number;
  count: number;
  /** Porcentaje (0-100) sobre el total apuntado. */
  percent: number;
}

/** Desglose por categoría, de mayor a menor importe. */
export function computeBreakdown(items: BudgetItem[]): CategoryRow[] {
  const map = new Map<string, Omit<CategoryRow, "percent">>();
  // Más antiguas primero: la etiqueta de cada categoría es la primera escrita.
  for (const item of oldestFirst(items)) {
    const label = item.category.trim() || UNCATEGORISED;
    const key = item.category.trim() ? normalize(label) : "";
    const row = map.get(key) ?? { key: key || "__none__", label, amount: 0, count: 0 };
    row.amount += itemAmount(item);
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
