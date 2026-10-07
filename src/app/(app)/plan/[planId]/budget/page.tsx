"use client";

import { usePlanContext } from "@/lib/context/plan-context";
import { BudgetList } from "@/components/budget/budget-list";
import { BudgetItemFormDialog } from "@/components/budget/budget-item-form-dialog";

export default function BudgetPage() {
  const { planId, plan } = usePlanContext();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Presupuesto</h2>
        <BudgetItemFormDialog planId={planId} />
      </div>
      <BudgetList planId={planId} budgetTotal={plan?.budgetTotal ?? 0} />
    </div>
  );
}
