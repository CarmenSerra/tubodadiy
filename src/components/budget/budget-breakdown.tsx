import { CARD, MiniBar } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import type { BudgetItem } from "@/lib/types";
import { computeBreakdown, formatMoney } from "./budget-math";

function formatPercent(percent: number): string {
  if (percent > 0 && percent < 1) return "<1%";
  return `${Math.round(percent)}%`;
}

/** Desglose por categoría: una fila por categoría con importe, porcentaje y barra. */
export function BudgetBreakdown({ items }: { items: BudgetItem[] }) {
  const rows = computeBreakdown(items);
  if (rows.length === 0) return null;
  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  return (
    <section aria-labelledby="budget-breakdown-title" className={cn(CARD, "p-5 sm:p-6")}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="budget-breakdown-title" className="font-display text-lg font-semibold text-[#26413C] sm:text-xl">
          Por categorías
        </h2>
        <p className="text-sm text-[#586C64]">
          Total apuntado: <span className="font-medium text-[#26413C]">{formatMoney(total)}</span>
        </p>
      </div>
      <p className="mt-1 text-sm text-[#586C64]">
        Importe = coste real o, si aún no lo hay, el estimado. El porcentaje es sobre el total apuntado.
      </p>
      <ul className="mt-5 flex flex-col gap-4">
        {rows.map((row, i) => (
          <li key={row.key} className="flex flex-col gap-2" data-testid="category-row">
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 break-words text-sm font-medium text-[#102D28]">
                {row.label}
                <span className="ml-2 font-normal text-[#586C64]">
                  {row.count} {row.count === 1 ? "partida" : "partidas"}
                </span>
              </p>
              <p className="shrink-0 text-sm text-[#586C64]">
                <span className="font-display text-base font-semibold text-[#26413C]">
                  {formatMoney(row.amount)}
                </span>
                <span className="ml-2 inline-block min-w-9 text-right">{formatPercent(row.percent)}</span>
              </p>
            </div>
            <MiniBar value={Math.max(row.percent, row.amount > 0 ? 1.5 : 0)} tone={i % 2 === 0 ? "lilac" : "sage"} />
          </li>
        ))}
      </ul>
    </section>
  );
}
