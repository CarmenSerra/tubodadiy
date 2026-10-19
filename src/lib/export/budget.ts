// Exportar Presupuesto: partidas (con lo pagado y lo pendiente), plazos de
// pago y un resumen con los totales.

import {
  UNCATEGORISED,
  categoryLabel,
  computeTotals,
  itemActual,
  itemInstallments,
  itemPayments,
  payerLabel,
} from "@/components/budget/budget-math";
import type { BudgetPlanSettings } from "@/components/budget/budget-model";
import { DEFAULT_LANG, type Lang } from "@/lib/i18n/config";
import { getServerT } from "@/lib/i18n/server";
import type { BudgetItem, Vendor } from "@/lib/types";
import { currentLang } from "./download";
import { downloadSheets } from "./sheets";
import type { Cell, ExportFormat, ExportSheet } from "./types";

export interface BudgetExportData {
  items: readonly BudgetItem[];
  /** Proveedores del plan, para poner el nombre del enlazado a cada partida. */
  vendors?: readonly Pick<Vendor, "id" | "name">[];
  payerLabels?: BudgetPlanSettings["payerLabels"];
  /** Presupuesto total del plan (0 si no hay). */
  budgetTotal?: number;
}

export function budgetSheets(data: BudgetExportData, lang: Lang = DEFAULT_LANG): ExportSheet[] {
  const t = getServerT(lang, "export");
  const tBudget = getServerT(lang, "budget");
  const items = [...data.items];
  const vendorName = new Map((data.vendors ?? []).map((v) => [v.id, v.name]));
  const categoryOf = (item: BudgetItem) =>
    item.category.trim() ? categoryLabel(item.category, tBudget) : tBudget("uncategorised") || UNCATEGORISED;

  const itemRows: Cell[][] = items.map((item) => {
    const payments = itemPayments(item);
    const payer = (item.payer ?? "").trim();
    return [
      categoryOf(item),
      item.concept,
      item.vendorId ? (vendorName.get(item.vendorId) ?? "") : "",
      payer ? payerLabel(payer, tBudget, data.payerLabels) : "",
      item.amount,
      itemActual(item),
      payments.cost,
      payments.paid,
      payments.pending,
      t(`budget.status.${payments.status}`),
      payments.nextDue,
    ];
  });

  const installmentRows: Cell[][] = [];
  for (const item of items) {
    const list = itemInstallments(item);
    list.forEach((p, index) => {
      installmentRows.push([
        categoryOf(item),
        item.concept,
        index + 1,
        p.amount,
        p.dueDate,
        p.paid ? t("yes") : t("no"),
        p.paid ? p.paidDate : null,
      ]);
    });
  }
  // Por fecha límite (los que no tienen, al final), conservando el orden de las partidas.
  installmentRows.sort((a, b) => {
    const da = (a[4] as string | null) ?? "9999";
    const db = (b[4] as string | null) ?? "9999";
    return da.localeCompare(db);
  });

  const totals = computeTotals(data.budgetTotal ?? 0, items);
  const summaryRows: Cell[][] = [
    [t("budget.summary.total"), data.budgetTotal ?? 0],
    [t("budget.summary.planned"), totals.planned],
    [t("budget.summary.expected"), totals.expected],
    [t("budget.summary.paid"), totals.paid],
    [t("budget.summary.pending"), totals.pending],
    [t("budget.summary.remaining"), totals.remaining],
  ];

  return [
    {
      name: t("budget.sheets.items"),
      columns: [
        { header: t("budget.columns.category"), width: 24 },
        { header: t("budget.columns.concept"), width: 34 },
        { header: t("budget.columns.vendor"), width: 24 },
        { header: t("budget.columns.payer"), width: 20 },
        { header: t("budget.columns.planned"), kind: "money" },
        { header: t("budget.columns.actual"), kind: "money" },
        { header: t("budget.columns.cost"), kind: "money" },
        { header: t("budget.columns.paid"), kind: "money" },
        { header: t("budget.columns.pending"), kind: "money" },
        { header: t("budget.columns.status") },
        { header: t("budget.columns.nextDue"), kind: "date" },
      ],
      rows: itemRows,
    },
    {
      name: t("budget.sheets.installments"),
      columns: [
        { header: t("budget.columns.category"), width: 24 },
        { header: t("budget.columns.concept"), width: 34 },
        { header: t("budget.columns.number"), kind: "number" },
        { header: t("budget.columns.amount"), kind: "money" },
        { header: t("budget.columns.dueDate"), kind: "date" },
        { header: t("budget.columns.installmentPaid") },
        { header: t("budget.columns.paidDate"), kind: "date" },
      ],
      rows: installmentRows,
    },
    {
      name: t("budget.sheets.summary"),
      columns: [
        { header: t("budget.columns.field"), width: 34 },
        { header: t("budget.columns.amount"), kind: "money", width: 16 },
      ],
      rows: summaryRows,
    },
  ];
}

export function exportBudget(data: BudgetExportData, format: ExportFormat, lang: Lang = currentLang()): void {
  downloadSheets(budgetSheets(data, lang), format, getServerT(lang, "export")("budget.file"), lang);
}
