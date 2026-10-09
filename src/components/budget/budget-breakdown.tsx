import { CARD } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import type { BudgetItem } from "@/lib/types";
import { computeBreakdown, formatMoney } from "./budget-math";

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

/** Desglose por categoría: una fila por categoría con importe, porcentaje y barra. */
export function BudgetBreakdown({ items }: { items: BudgetItem[] }) {
  const rows = computeBreakdown(items);
  if (rows.length === 0) return null;
  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  return (
    <section aria-labelledby="budget-breakdown-title" className={cn(CARD, "p-5 sm:p-6")}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="budget-breakdown-title" className="font-display text-lg font-semibold text-ink sm:text-xl">
          Por categorías
        </h2>
        <p className="text-sm text-ink-muted">
          Total previsto: <span className="font-medium text-ink">{formatMoney(total)}</span>
        </p>
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        Importe = pagado + pendiente. El porcentaje es sobre el total previsto.
      </p>
      <ul className="mt-5 flex flex-col gap-4">
        {rows.map((row) => (
          <li key={row.key} className="flex flex-col gap-2" data-testid="category-row">
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 break-words text-sm font-medium text-ink-strong">
                {row.label}
                <span className="ml-2 font-normal text-ink-muted">
                  {row.count} {row.count === 1 ? "partida" : "partidas"}
                </span>
              </p>
              <p className="shrink-0 text-sm text-ink-muted">
                <span className="font-display text-base font-semibold text-ink">
                  {formatMoney(row.amount)}
                </span>
                <span className="ml-2 inline-block min-w-9 text-right">{formatPercent(row.percent)}</span>
              </p>
            </div>
            <div
              aria-hidden="true"
              className="flex h-1.5 w-full overflow-hidden rounded-full bg-track"
            >
              <div className="h-full bg-sage" style={{ width: `${barPart(row.paid, total, row.amount)}%` }} />
              <div className="h-full bg-lilac" style={{ width: `${barPart(row.pending, total, row.amount)}%` }} />
            </div>
            {row.paid > 0 && row.pending > 0 && (
              <p className="text-xs text-ink-muted">
                Pagado {formatMoney(row.paid)} · Pendiente {formatMoney(row.pending)}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
