"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  categoryLabel,
  computeTotals,
  formatDue,
  formatMoney,
  itemInstallments,
  itemPayments,
  normalize,
  UNCATEGORISED,
} from "@/components/budget/budget-math";
import { PrintFrame, PrintPage, type PrintDocumentProps } from "@/components/export/print-frame";
import { budgetItemsQuery, mapBudgetItem } from "@/lib/firebase/plans";
import { useCollection } from "@/lib/hooks/use-collection";
import { useLanguage } from "@/lib/i18n/provider";
import type { BudgetItem } from "@/lib/types";

interface CategoryGroup {
  key: string;
  label: string;
  items: BudgetItem[];
}

const NUM = "px-3 py-1.5 text-right tabular-nums";

function BudgetDocument({ planId, plan }: PrintDocumentProps) {
  const { t } = useTranslation("export");
  const { t: tBudget } = useTranslation("budget");
  const { lang } = useLanguage();
  const state = useCollection(budgetItemsQuery(planId), mapBudgetItem);
  const items = state.data;
  const backHref = `/plan/${planId}/budget`;
  const money = (value: number) => formatMoney(value, lang);

  const totals = React.useMemo(() => computeTotals(plan.budgetTotal, items), [plan.budgetTotal, items]);
  const groups = React.useMemo(() => {
    const map = new Map<string, CategoryGroup>();
    for (const item of items) {
      const raw = item.category.trim();
      const key = raw ? normalize(raw) : "";
      const group = map.get(key) ?? {
        key,
        label: raw ? categoryLabel(raw, tBudget) : tBudget("uncategorised") || UNCATEGORISED,
        items: [],
      };
      group.items.push(item);
      map.set(key, group);
    }
    return [...map.values()].sort((a, b) => (a.key === "" ? 1 : b.key === "" ? -1 : a.label.localeCompare(b.label, lang)));
  }, [items, tBudget, lang]);
  const dues = React.useMemo(() => {
    const rows: { date: string; concept: string; amount: number }[] = [];
    for (const item of items) {
      for (const p of itemInstallments(item)) {
        if (!p.paid && p.dueDate) rows.push({ date: p.dueDate, concept: item.concept, amount: p.amount });
      }
    }
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }, [items]);

  if (state.loading) {
    return (
      <PrintFrame plan={plan} backHref={backHref} title={t("print.budget.title")}>
        <div role="status" aria-label={t("print.preparing")} className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-ink-muted" />
        </div>
      </PrintFrame>
    );
  }

  const totalCells: { label: string; value: number }[] = [
    ...(plan.budgetTotal > 0 ? [{ label: t("print.budget.totals.total"), value: plan.budgetTotal }] : []),
    { label: t("print.budget.totals.expected"), value: totals.expected },
    { label: t("print.budget.totals.paid"), value: totals.paid },
    { label: t("print.budget.totals.pending"), value: totals.pending },
    ...(plan.budgetTotal > 0 ? [{ label: t("print.budget.totals.remaining"), value: totals.remaining }] : []),
  ];

  return (
    <PrintFrame plan={plan} backHref={backHref} title={t("print.budget.title")}>
      {state.error ? (
        <p role="alert" className="py-8 text-sm text-ink">
          {t("print.loadError")}
        </p>
      ) : items.length === 0 ? (
        <p className="py-8 text-sm text-ink">{t("print.budget.empty")}</p>
      ) : (
        <>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5 print:grid-cols-5">
            {totalCells.map((cell) => (
              <div key={cell.label} className="rounded-xl border border-ink/30 px-3 py-2">
                <dt className="text-xs text-ink">{cell.label}</dt>
                <dd className="font-display text-lg font-semibold tabular-nums text-ink-strong">{money(cell.value)}</dd>
              </div>
            ))}
          </dl>

          <table className="mt-6 w-full border-collapse text-sm">
            <thead className="border-b-2 border-ink/40 text-xs uppercase tracking-wide text-ink">
              <tr>
                <th scope="col" className="py-2 pr-3 text-left font-semibold">
                  {t("print.budget.columns.concept")}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  {t("print.budget.columns.cost")}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  {t("print.budget.columns.paid")}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  {t("print.budget.columns.pending")}
                </th>
                <th scope="col" className="py-2 pl-3 text-left font-semibold">
                  {t("print.budget.columns.nextDue")}
                </th>
              </tr>
            </thead>
            {groups.map((group) => {
              const sums = group.items.reduce(
                (acc, item) => {
                  const p = itemPayments(item);
                  return { cost: acc.cost + p.cost, paid: acc.paid + p.paid, pending: acc.pending + p.pending };
                },
                { cost: 0, paid: 0, pending: 0 }
              );
              return (
                <tbody key={group.key || "__none__"} className="break-inside-avoid">
                  <tr className="bg-ink/5">
                    <th scope="colgroup" colSpan={5} className="py-1.5 pr-3 text-left font-display text-base font-semibold text-ink">
                      {group.label}
                    </th>
                  </tr>
                  {group.items.map((item) => {
                    const p = itemPayments(item);
                    return (
                      <tr key={item.id} className="border-b border-ink/15 align-top">
                        <td className="py-1.5 pr-3 text-ink-strong">{item.concept}</td>
                        <td className={NUM}>{money(p.cost)}</td>
                        <td className={NUM}>{money(p.paid)}</td>
                        <td className={NUM}>{money(p.pending)}</td>
                        <td className="py-1.5 pl-3 text-ink">
                          {p.nextDue ? formatDue(p.nextDue, lang) : t("print.budget.noDue")}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-b border-ink/40 font-medium">
                    <td className="py-1.5 pr-3 text-ink">{t("print.budget.subtotal")}</td>
                    <td className={NUM}>{money(sums.cost)}</td>
                    <td className={NUM}>{money(sums.paid)}</td>
                    <td className={NUM}>{money(sums.pending)}</td>
                    <td />
                  </tr>
                </tbody>
              );
            })}
          </table>

          <section className="mt-8 break-inside-avoid">
            <h2 className="font-display text-xl font-semibold text-ink">{t("print.budget.dueTitle")}</h2>
            {dues.length === 0 ? (
              <p className="mt-2 text-sm text-ink">{t("print.budget.dueEmpty")}</p>
            ) : (
              <table className="mt-2 w-full border-collapse text-sm">
                <thead className="border-b-2 border-ink/40 text-xs uppercase tracking-wide text-ink">
                  <tr>
                    <th scope="col" className="py-2 pr-3 text-left font-semibold">
                      {t("print.budget.dueColumns.date")}
                    </th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold">
                      {t("print.budget.dueColumns.concept")}
                    </th>
                    <th scope="col" className="py-2 pl-3 text-right font-semibold">
                      {t("print.budget.dueColumns.amount")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dues.map((row, index) => (
                    <tr key={`${row.date}-${index}`} className="break-inside-avoid border-b border-ink/15">
                      <td className="py-1.5 pr-3 text-ink">{formatDue(row.date, lang)}</td>
                      <td className="px-3 py-1.5 text-ink-strong">{row.concept}</td>
                      <td className="py-1.5 pl-3 text-right tabular-nums">{money(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </PrintFrame>
  );
}

export function BudgetPrintView({ planId }: { planId: string }) {
  return <PrintPage planId={planId} section="budget" Document={BudgetDocument} />;
}
