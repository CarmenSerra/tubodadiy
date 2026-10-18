"use client";

import { updateDoc, type DocumentData } from "firebase/firestore";

import {
  EMPTY_BUDGET_PLAN,
  PAYER_PRESETS,
  type BudgetAllocation,
  type BudgetPlanSettings,
} from "@/components/budget/budget-model";
import { planDocRef } from "@/lib/firebase/plans";
import { useDoc } from "@/lib/hooks/use-doc";

// Ajustes del presupuesto que viven en el documento del plan (`budgetPlan`), no en una
// subcolección: el reparto por categorías y los nombres de los pagadores. Cualquier miembro
// del plan puede escribirlos (reglas de `weddingPlans/{id}`), así que no hacen falta reglas nuevas.

export function mapBudgetPlan(_id: string, data: DocumentData): BudgetPlanSettings {
  const raw = data.budgetPlan;
  if (!raw || typeof raw !== "object") return EMPTY_BUDGET_PLAN;
  const allocations: BudgetAllocation[] = Array.isArray(raw.allocations)
    ? raw.allocations
        .filter(
          (a: unknown): a is { category: string; amount: number } =>
            Boolean(a) &&
            typeof (a as BudgetAllocation).category === "string" &&
            (a as BudgetAllocation).category.trim() !== "" &&
            typeof (a as BudgetAllocation).amount === "number" &&
            Number.isFinite((a as BudgetAllocation).amount) &&
            (a as BudgetAllocation).amount >= 0
        )
        .map((a: BudgetAllocation) => ({ category: a.category.trim(), amount: a.amount }))
    : [];
  const payerLabels: BudgetPlanSettings["payerLabels"] = {};
  if (raw.payerLabels && typeof raw.payerLabels === "object") {
    for (const key of PAYER_PRESETS) {
      const label = raw.payerLabels[key];
      if (typeof label === "string" && label.trim()) payerLabels[key] = label.trim();
    }
  }
  return { allocations, payerLabels };
}

/** Reparto por categorías y nombres de pagadores del plan (vacíos mientras carga o si no hay). */
export function useBudgetPlan(planId: string): { settings: BudgetPlanSettings; loading: boolean } {
  const { data, loading } = useDoc(planDocRef(planId), mapBudgetPlan);
  return { settings: data ?? EMPTY_BUDGET_PLAN, loading };
}

/** Guarda el reparto por categorías (sustituye al anterior). Ignora importes vacíos. */
export async function saveBudgetAllocations(planId: string, allocations: BudgetAllocation[]) {
  const clean = allocations
    .filter((a) => a.category.trim() && Number.isFinite(a.amount) && a.amount > 0)
    .map((a) => ({ category: a.category.trim(), amount: Math.round(a.amount) }));
  await updateDoc(planDocRef(planId), { "budgetPlan.allocations": clean });
}

/** Guarda los nombres personalizados de los pagadores predefinidos (vacío = nombre por defecto). */
export async function saveBudgetPayerLabels(planId: string, labels: BudgetPlanSettings["payerLabels"]) {
  const clean: BudgetPlanSettings["payerLabels"] = {};
  for (const key of PAYER_PRESETS) {
    const label = labels[key]?.trim();
    if (label) clean[key] = label.slice(0, 40);
  }
  await updateDoc(planDocRef(planId), { "budgetPlan.payerLabels": clean });
}
