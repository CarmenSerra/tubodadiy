import { BadgeCheckIcon, CalculatorIcon, ReceiptIcon, WalletIcon } from "lucide-react";

import { CARD } from "@/components/dashboard/ui";
import { Bone } from "@/components/plan/plan-shell";
import { StatTile } from "@/components/guests/guest-summary";
import { cn } from "@/lib/utils";
import type { BudgetItem } from "@/lib/types";
import { computeTotals, formatMoney } from "./budget-math";

/** Barra de uso del presupuesto: la misma que MiniBar, pero más gruesa por ser la protagonista. */
function UsageBar({ value, label }: { value: number; label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className="h-3 w-full overflow-hidden rounded-full bg-track"
    >
      <div
        className="h-full rounded-full bg-lilac transition-[width] duration-500 motion-reduce:transition-none"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function BudgetSummary({
  budgetTotal,
  items,
}: {
  budgetTotal: number;
  items: BudgetItem[];
}) {
  const t = computeTotals(budgetTotal, items);
  const hasTotal = budgetTotal > 0;
  const over = t.over > 0;

  return (
    <section aria-labelledby="budget-summary-title" className="flex flex-col gap-3 sm:gap-4">
      <h2 id="budget-summary-title" className="sr-only">
        Resumen del presupuesto
      </h2>

      <div className={cn(CARD, "flex flex-col gap-4 p-5 sm:p-6")}>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
          <div>
            <p className="text-sm text-ink-muted">{over ? "Por encima del total" : "Te queda"}</p>
            <p
              className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl"
              data-testid="budget-remaining"
            >
              {hasTotal ? formatMoney(over ? t.over : t.remaining) : "—"}
            </p>
          </div>
          {hasTotal && (
            <p className="pb-1 text-sm text-ink-muted">
              de <span className="font-medium text-ink">{formatMoney(budgetTotal)}</span> de presupuesto
              total
            </p>
          )}
        </div>

        {hasTotal ? (
          <>
            <UsageBar
              value={t.spentRatio}
              label={`Has gastado el ${t.spentPercent}% del presupuesto total`}
            />
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-ink-muted">
              <span>
                Gastado <span className="font-medium text-ink">{formatMoney(t.spent)}</span> ·{" "}
                <span className="font-medium text-ink">{t.spentPercent}%</span> del total
              </span>
              <span>
                {over
                  ? "Te has pasado un poco del total: es buen momento para reajustar partidas con calma."
                  : t.spent === 0
                    ? "Aún no hay costes reales apuntados."
                    : "Vas dentro de tu presupuesto."}
              </span>
            </div>
          </>
        ) : (
          <p className="text-sm text-ink-muted">
            Aún no has fijado un presupuesto total.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile
          icon={<WalletIcon />}
          tone="lilac"
          label="Presupuesto total"
          value={hasTotal ? formatMoney(budgetTotal) : "Sin definir"}
          detail="tu techo de gasto"
        />
        <StatTile
          icon={<CalculatorIcon />}
          tone="sage"
          label="Estimado"
          value={formatMoney(t.estimated)}
          detail="suma de costes previstos"
        />
        <StatTile
          icon={<ReceiptIcon />}
          tone="lilac"
          label="Gastado"
          value={formatMoney(t.spent)}
          detail="suma de costes reales"
        />
        <StatTile
          icon={<BadgeCheckIcon />}
          tone="sage"
          label="Pagado"
          value={formatMoney(t.paid)}
          detail={`${t.paidCount} de ${t.itemCount} ${t.itemCount === 1 ? "partida" : "partidas"}, a coste real o estimado`}
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
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
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
