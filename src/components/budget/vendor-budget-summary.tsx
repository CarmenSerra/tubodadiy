"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { BudgetItemFormDialog } from "@/components/budget/budget-item-form-dialog";
import {
  formatDue,
  formatMoney,
  itemPayments,
  listCategories,
  listCustomPayers,
  vendorBudget,
} from "@/components/budget/budget-math";
import { CTA_SECONDARY, LINK } from "@/components/dashboard/ui";
import { budgetItemsQuery, mapBudgetItem } from "@/lib/firebase/plans";
import { useCollection } from "@/lib/hooks/use-collection";
import { useLanguage } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

/**
 * Lo pagado y lo pendiente de un proveedor, a partir de las partidas del presupuesto enlazadas a él
 * (`BudgetItem.vendorId`), con acceso a apuntar un pago nuevo ya enlazado.
 * Pensado para la ficha del proveedor; se alimenta solo (lee las partidas del plan).
 */
export function VendorBudgetSummary({
  planId,
  vendorId,
  vendorCost,
  className,
}: {
  planId: string;
  vendorId: string;
  /** Precio que figura en la ficha del proveedor: se enseña mientras no haya partidas enlazadas. */
  vendorCost?: number | null;
  className?: string;
}) {
  const { t } = useTranslation("budget");
  const { lang } = useLanguage();
  const { data: items, loading } = useCollection(budgetItemsQuery(planId), mapBudgetItem);
  const money = (value: number) => formatMoney(value, lang);

  if (loading) return null;

  const summary = vendorBudget(items, vendorId);
  const addButton = (
    <BudgetItemFormDialog
      planId={planId}
      defaultVendorId={vendorId}
      categories={listCategories(items)}
      payers={listCustomPayers(items)}
      trigger={
        <button type="button" className={cn(CTA_SECONDARY, "h-11")}>
          <PlusIcon aria-hidden="true" className="size-4" />
          {t("vendorSummary.add")}
        </button>
      }
    />
  );

  return (
    <section aria-labelledby={`vendor-budget-${vendorId}`} className={cn("flex flex-col gap-3", className)}>
      <h3 id={`vendor-budget-${vendorId}`} className="font-display text-base font-semibold text-ink">
        {t("vendorSummary.title")}
      </h3>

      {summary.items.length === 0 ? (
        <>
          <p className="text-sm text-ink-muted">
            {vendorCost != null && vendorCost > 0
              ? t("vendorSummary.emptyWithCost", { amount: money(vendorCost) })
              : t("vendorSummary.empty")}
          </p>
          <div>{addButton}</div>
        </>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-3">
            <div className="min-w-0">
              <dt className="text-xs text-ink-muted">{t("vendorSummary.expected")}</dt>
              <dd className="font-display text-lg font-semibold text-ink">{money(summary.expected)}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-ink-muted">{t("vendorSummary.paid")}</dt>
              <dd className="font-display text-lg font-semibold text-ink">{money(summary.paid)}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-ink-muted">{t("vendorSummary.pending")}</dt>
              <dd className="font-display text-lg font-semibold text-ink">{money(summary.pending)}</dd>
            </div>
          </dl>
          {summary.nextDue && (
            <p className="text-sm text-ink-muted">
              {t("vendorSummary.nextDue", { date: formatDue(summary.nextDue, lang) })}
            </p>
          )}
          <ul className="flex flex-col gap-1.5 text-sm">
            {summary.items.map((item) => {
              const payments = itemPayments(item);
              return (
                <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-x-3 text-ink-strong">
                  <span className="min-w-0 break-words">{item.concept}</span>
                  <span className="text-ink-muted">
                    {payments.status === "paid"
                      ? t("vendorSummary.itemPaid", { amount: money(payments.cost) })
                      : t("vendorSummary.itemPending", { paid: money(payments.paid), cost: money(payments.cost) })}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {addButton}
            <Link href={`/plan/${planId}/budget`} className={cn(LINK, "inline-flex min-h-11 items-center text-sm")}>
              {t("vendorSummary.seeBudget")}
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
