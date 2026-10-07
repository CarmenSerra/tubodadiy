import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import type { BudgetItem } from "@/lib/types";

export function BudgetSummary({
  budgetTotal,
  items,
}: {
  budgetTotal: number;
  items: BudgetItem[];
}) {
  const estimatedTotal = items.reduce((sum, item) => sum + (item.estimatedCost || 0), 0);
  const actualTotal = items.reduce((sum, item) => sum + (item.actualCost || 0), 0);
  const paidTotal = items
    .filter((item) => item.paid)
    .reduce((sum, item) => sum + (item.actualCost ?? item.estimatedCost ?? 0), 0);

  const spentRatio = budgetTotal > 0 ? Math.min(100, Math.round((actualTotal / budgetTotal) * 100)) : 0;
  const overBudget = budgetTotal > 0 && actualTotal > budgetTotal;

  return (
    <Card>
      <CardContent className="grid gap-4 pt-6 sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Presupuesto total</p>
          <p className="text-lg font-semibold">{formatCurrency(budgetTotal)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Estimado</p>
          <p className="text-lg font-semibold">{formatCurrency(estimatedTotal)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Gastado</p>
          <p className={`text-lg font-semibold ${overBudget ? "text-destructive" : ""}`}>
            {formatCurrency(actualTotal)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Pagado</p>
          <p className="text-lg font-semibold">{formatCurrency(paidTotal)}</p>
        </div>
        {budgetTotal > 0 && (
          <div className="sm:col-span-4">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Uso del presupuesto</span>
              <span>{spentRatio}%</span>
            </div>
            <Progress value={spentRatio} />
            {overBudget && (
              <p className="mt-1 text-xs text-destructive">
                Has superado el presupuesto en {formatCurrency(actualTotal - budgetTotal)}.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
