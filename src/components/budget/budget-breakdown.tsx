import { useTranslation } from "react-i18next";

import { CARD, CTA_SECONDARY } from "@/components/dashboard/ui";
import { useLanguage } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { BudgetAllocation } from "@/components/budget/budget-model";
import type { BudgetItem } from "@/lib/types";
import { categoryLabel, computeBreakdown, formatDeviation, formatMoney } from "./budget-math";

function formatPercent(percent: number): string {
  if (percent > 0 && percent < 1) return "<1%";
  return `${Math.round(percent)}%`;
}

/** Ancho (0-100) de un tramo de la barra; las filas con importe nunca quedan invisibles. */
function barPart(part: number, total: number, rowAmount: number): number {
  if (total <= 0 || part <= 0) return 0;
  const min = rowAmount > 0 ? 1.5 : 0;
  return Math.max((part / total) * 100, min);
}

/**
 * Desglose por categoría: una fila por categoría con lo previsto, lo real, la desviación y,
 * si hay un reparto guardado, lo asignado. Todo en tonos neutros (sin avisos de alerta).
 */
export function BudgetBreakdown({
  items,
  allocations = [],
  onOpenAllocation,
}: {
  items: BudgetItem[];
  allocations?: BudgetAllocation[];
  /** Abre el reparto del presupuesto por categorías. */
  onOpenAllocation?: () => void;
}) {
  const { t } = useTranslation("budget");
  const { lang } = useLanguage();
  const rows = computeBreakdown(items, allocations);
  if (rows.length === 0) return null;
  const total = rows.reduce((sum, r) => sum + r.expected, 0);
  const allocatedTotal = allocations.reduce((sum, a) => sum + a.amount, 0);
  const money = (value: number) => formatMoney(value, lang);

  return (
    <section aria-labelledby="budget-breakdown-title" className={cn(CARD, "p-5 sm:p-6")}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 id="budget-breakdown-title" className="font-display text-lg font-semibold text-ink sm:text-xl">
            {t("breakdown.title")}
          </h2>
          <p className="text-sm text-ink-muted">
            {t("breakdown.total")} <span className="font-medium text-ink">{money(total)}</span>
            {allocatedTotal > 0 && (
              <>
                {" · "}
                {t("breakdown.allocatedTotal")} <span className="font-medium text-ink">{money(allocatedTotal)}</span>
              </>
            )}
          </p>
        </div>
        {onOpenAllocation && (
          <button type="button" onClick={onOpenAllocation} className={cn(CTA_SECONDARY, "h-11")}>
            {allocations.length > 0 ? t("breakdown.editAllocation") : t("breakdown.allocate")}
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        {allocations.length > 0 ? t("breakdown.noteWithAllocation") : t("breakdown.note")}
      </p>
      <ul className="mt-5 flex flex-col gap-5">
        {rows.map((row) => {
          const hasActual = row.actualCount > 0;
          const left = row.allocated !== null ? row.allocated - row.expected : null;
          return (
            <li key={row.key} className="flex flex-col gap-2" data-testid="category-row">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 break-words text-sm font-medium text-ink-strong">
                  {row.key === "__none__" ? t("uncategorised") : categoryLabel(row.label, t)}
                  <span className="ml-2 font-normal text-ink-muted">
                    {t("breakdown.items", { count: row.count })}
                  </span>
                </p>
                <p className="shrink-0 text-sm text-ink-muted">
                  <span className="font-display text-base font-semibold text-ink">{money(row.expected)}</span>
                  <span className="ml-2 inline-block min-w-9 text-right">{formatPercent(row.percent)}</span>
                </p>
              </div>
              <div aria-hidden="true" className="flex h-1.5 w-full overflow-hidden rounded-full bg-track">
                <div className="h-full bg-sage" style={{ width: `${barPart(row.paid, total, row.expected)}%` }} />
                <div className="h-full bg-lilac" style={{ width: `${barPart(row.pending, total, row.expected)}%` }} />
              </div>
              <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-muted">
                {row.count > 0 && (
                  <div className="flex gap-1.5">
                    <dt>{t("breakdown.planned")}</dt>
                    <dd className="font-medium text-ink">{money(row.planned)}</dd>
                  </div>
                )}
                {hasActual && (
                  <div className="flex gap-1.5">
                    <dt>{t("breakdown.actual")}</dt>
                    <dd className="font-medium text-ink">{money(row.actual)}</dd>
                  </div>
                )}
                {hasActual && (
                  <div className="flex gap-1.5">
                    <dt>{t("breakdown.deviation")}</dt>
                    <dd className="font-medium text-ink">{formatDeviation(row.deviation, lang)}</dd>
                  </div>
                )}
                {row.allocated !== null && (
                  <div className="flex gap-1.5">
                    <dt>{t("breakdown.allocated")}</dt>
                    <dd className="font-medium text-ink">{money(row.allocated)}</dd>
                  </div>
                )}
                {row.paid > 0 && row.pending > 0 && (
                  <div className="flex gap-1.5">
                    <dt>{t("breakdown.paid")}</dt>
                    <dd className="font-medium text-ink">{money(row.paid)}</dd>
                    <dt>· {t("breakdown.pending")}</dt>
                    <dd className="font-medium text-ink">{money(row.pending)}</dd>
                  </div>
                )}
              </dl>
              {left !== null && row.count > 0 && (
                <p className="text-xs text-ink-muted">
                  {left >= 0
                    ? t("breakdown.withinAllocation", { amount: money(left) })
                    : t("breakdown.aboveAllocation", { amount: money(-left) })}
                </p>
              )}
              {left !== null && row.count === 0 && (
                <p className="text-xs text-ink-muted">{t("breakdown.noItemsYet")}</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
