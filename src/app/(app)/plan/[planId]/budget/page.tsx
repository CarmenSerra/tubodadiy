"use client";

import * as React from "react";

import { usePlanContext } from "@/lib/context/plan-context";
import { BudgetList } from "@/components/budget/budget-list";

export default function BudgetPage() {
  const { planId, plan } = usePlanContext();

  // BudgetList lee ?herramienta=reparto (useSearchParams), que pide un límite de Suspense.
  return (
    <React.Suspense fallback={null}>
      <BudgetList planId={planId} plan={plan} />
    </React.Suspense>
  );
}
