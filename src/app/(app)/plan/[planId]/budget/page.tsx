"use client";

import { usePlanContext } from "@/lib/context/plan-context";
import { BudgetList } from "@/components/budget/budget-list";

export default function BudgetPage() {
  const { planId, plan } = usePlanContext();

  return <BudgetList planId={planId} budgetTotal={plan?.budgetTotal ?? 0} />;
}
