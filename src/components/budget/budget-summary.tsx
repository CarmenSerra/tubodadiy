import { BadgeCheckIcon, CalculatorIcon, HourglassIcon, WalletIcon } from "lucide-react";

import { CARD } from "@/components/dashboard/ui";
import { Bone } from "@/components/plan/plan-shell";
import { StatTile } from "@/components/guests/guest-summary";
import { cn } from "@/lib/utils";
import type { BudgetItem } from "@/lib/types";
import { computeTotals, formatDue, formatMoney } from "./budget-math";

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

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
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
              paid={t.paidRatio}
              pending={t.pendingRatio}
              label={`Pagado: ${formatMoney(t.paid)}. Pendiente: ${formatMoney(t.pending)}. Previsto en total: el ${t.plannedPercent}% del presupuesto.`}
            />
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-ink-muted">
              <span className="flex flex-wrap gap-x-4 gap-y-1">
                <span>
                  <Dot tone="sage" />
                  Pagado <span className="font-medium text-ink">{formatMoney(t.paid)}</span>
                </span>
                <span>
                  <Dot tone="lilac" />
                  Pendiente <span className="font-medium text-ink">{formatMoney(t.pending)}</span>
                </span>
              </span>
              <span>
                {over
                  ? "Lo previsto supera el total: es buen momento para reajustar partidas con calma."
                  : t.planned === 0
                    ? "Aún no hay gastos apuntados."
                    : `Lo previsto es el ${t.plannedPercent}% del total. Vas dentro de tu presupuesto.`}
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
          icon={<BadgeCheckIcon />}
          tone="sage"
          label="Total pagado"
          value={formatMoney(t.paid)}
          detail={t.paidCount === 0 ? "aún nada pagado" : plural(t.paidCount, "gasto ya pagado", "gastos ya pagados")}
        />
        <StatTile
          icon={<HourglassIcon />}
          tone="lilac"
          label="Pendiente por pagar"
          value={formatMoney(t.pending)}
          detail={
            t.pendingCount === 0
              ? "nada pendiente"
              : `${plural(t.pendingCount, "gasto", "gastos")}${t.nextDue ? ` · próximo, el ${formatDue(t.nextDue)}` : ""}`
          }
        />
        <StatTile
          icon={<CalculatorIcon />}
          tone="sage"
          label="Total previsto"
          value={formatMoney(t.planned)}
          detail="pagado + pendiente"
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
