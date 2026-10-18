import { BadgeCheckIcon, CalculatorIcon, HourglassIcon, ReceiptIcon, ScaleIcon, WalletIcon } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

import { CARD } from "@/components/dashboard/ui";
import { Bone } from "@/components/plan/plan-shell";
import { StatTile } from "@/components/guests/guest-summary";
import { useLanguage } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { BudgetItem } from "@/lib/types";
import { computeTotals, formatDeviation, formatDue, formatMoney } from "./budget-math";

/** Barra de uso del presupuesto en dos tramos: pagado (salvia) y pendiente (lila). */
function UsageBar({ paid, pending, label }: { paid: number; pending: number; label: string }) {
  return (
    <div role="img" aria-label={label} className="flex h-3 w-full overflow-hidden rounded-full bg-track">
      <div
        className="h-full bg-sage transition-[width] duration-500 motion-reduce:transition-none"
        style={{ width: `${Math.max(0, paid)}%` }}
      />
      <div
        className="h-full bg-lilac transition-[width] duration-500 motion-reduce:transition-none"
        style={{ width: `${Math.max(0, pending)}%` }}
      />
    </div>
  );
}

function Dot({ tone }: { tone: "sage" | "lilac" }) {
  return (
    <span
      aria-hidden="true"
      className={cn("mr-1.5 inline-block size-2.5 rounded-full align-baseline", tone === "sage" ? "bg-sage" : "bg-lilac")}
    />
  );
}

export function BudgetSummary({
  budgetTotal,
  items,
}: {
  budgetTotal: number;
  items: BudgetItem[];
}) {
  const { t } = useTranslation("budget");
  const { lang } = useLanguage();
  const totals = computeTotals(budgetTotal, items);
  const hasTotal = budgetTotal > 0;
  const over = totals.over > 0;
  const money = (value: number) => formatMoney(value, lang);

  return (
    <section aria-labelledby="budget-summary-title" className="flex flex-col gap-3 sm:gap-4">
      <h2 id="budget-summary-title" className="sr-only">
        {t("summary.title")}
      </h2>

      <div className={cn(CARD, "flex flex-col gap-4 p-5 sm:p-6")}>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
          <div>
            <p className="text-sm text-ink-muted">{over ? t("summary.overTotal") : t("summary.remaining")}</p>
            <p
              className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl"
              data-testid="budget-remaining"
            >
              {hasTotal ? money(over ? totals.over : totals.remaining) : "—"}
            </p>
          </div>
          {hasTotal && (
            <p className="pb-1 text-sm text-ink-muted">
              <Trans
                ns="budget"
                i18nKey="summary.ofTotal"
                values={{ total: money(budgetTotal) }}
                components={{ hl: <span className="font-medium text-ink" /> }}
              />
            </p>
          )}
        </div>

        {hasTotal ? (
          <>
            <UsageBar
              paid={totals.paidRatio}
              pending={totals.pendingRatio}
              label={t("summary.barLabel", {
                paid: money(totals.paid),
                pending: money(totals.pending),
                percent: totals.expectedPercent,
              })}
            />
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-ink-muted">
              <span className="flex flex-wrap gap-x-4 gap-y-1">
                <span>
                  <Dot tone="sage" />
                  {t("summary.paid")} <span className="font-medium text-ink">{money(totals.paid)}</span>
                </span>
                <span>
                  <Dot tone="lilac" />
                  {t("summary.pending")} <span className="font-medium text-ink">{money(totals.pending)}</span>
                </span>
              </span>
              <span>
                {over
                  ? t("summary.overNote")
                  : totals.expected === 0
                    ? t("summary.noExpenses")
                    : t("summary.withinNote", { percent: totals.expectedPercent })}
              </span>
            </div>
          </>
        ) : (
          <p className="text-sm text-ink-muted">
            {t("summary.noTotal")}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatTile
          icon={<WalletIcon />}
          tone="lilac"
          label={t("summary.tiles.total")}
          value={hasTotal ? money(budgetTotal) : t("summary.tiles.undefined")}
          detail={t("summary.tiles.totalDetail")}
        />
        <StatTile
          icon={<CalculatorIcon />}
          tone="sage"
          label={t("summary.tiles.planned")}
          value={money(totals.planned)}
          detail={t("summary.tiles.plannedDetail")}
        />
        <StatTile
          icon={<ReceiptIcon />}
          tone="lilac"
          label={t("summary.tiles.actual")}
          value={totals.actualCount === 0 ? "—" : money(totals.actual)}
          detail={
            totals.actualCount === 0
              ? t("summary.tiles.noActual")
              : t("summary.tiles.actualDetail", { count: totals.actualCount, total: totals.itemCount })
          }
        />
        <StatTile
          icon={<ScaleIcon />}
          tone="sage"
          label={t("summary.tiles.deviation")}
          value={totals.actualCount === 0 ? "—" : formatDeviation(totals.deviation, lang)}
          detail={
            totals.actualCount === 0
              ? t("summary.tiles.noDeviation")
              : totals.deviation > 0
                ? t("summary.tiles.deviationMore")
                : totals.deviation < 0
                  ? t("summary.tiles.deviationLess")
                  : t("summary.tiles.deviationSame")
          }
        />
        <StatTile
          icon={<BadgeCheckIcon />}
          tone="lilac"
          label={t("summary.tiles.paid")}
          value={money(totals.paid)}
          detail={totals.paidCount === 0 ? t("summary.tiles.nothingPaid") : t("summary.tiles.paidCount", { count: totals.paidCount })}
        />
        <StatTile
          icon={<HourglassIcon />}
          tone="sage"
          label={t("summary.tiles.pending")}
          value={money(totals.pending)}
          detail={
            totals.pendingCount === 0
              ? t("summary.tiles.nothingPending")
              : `${t("summary.tiles.expenseCount", { count: totals.pendingCount })}${totals.nextDue ? ` · ${t("summary.tiles.nextOn", { date: formatDue(totals.nextDue, lang) })}` : ""}`
          }
        />
      </div>
    </section>
  );
}

/** Esqueleto del resumen (mismo aspecto que el contenido). */
export function BudgetSummarySkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className={cn(CARD, "flex flex-col gap-4 p-5 sm:p-6")}>
        <Bone className="h-3 w-24" />
        <Bone className="h-9 w-48" />
        <Bone className="h-3 w-full rounded-full" />
        <Bone className="h-3 w-2/3" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={cn(CARD, "flex flex-col gap-3 p-4 sm:p-5")}>
            <div className="flex items-center gap-3">
              <Bone className="size-9 shrink-0 rounded-full sm:size-10" />
              <Bone className="h-3 w-1/2" />
            </div>
            <Bone className="h-7 w-2/3" />
            <Bone className="h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
