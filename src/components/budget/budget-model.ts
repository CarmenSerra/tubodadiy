// Tipos y constantes puros del presupuesto (sin Firebase), compartidos por la matemática,
// los componentes y `lib/firebase/budget-plan.ts`.

/** Pagadores predefinidos; el texto libre vale igual (ver `BudgetItem.payer`). */
export const PAYER_PRESETS = ["couple", "familyA", "familyB"] as const;
export type PayerPreset = (typeof PAYER_PRESETS)[number];

export function isPayerPreset(value: string): value is PayerPreset {
  return (PAYER_PRESETS as readonly string[]).includes(value);
}

/** Importe asignado a una categoría (nombre guardado en español, como en las partidas). */
export interface BudgetAllocation {
  category: string;
  amount: number;
}

/** Ajustes del presupuesto guardados en el documento del plan (`budgetPlan`). */
export interface BudgetPlanSettings {
  allocations: BudgetAllocation[];
  /** Nombre personalizado de un pagador predefinido («Familia de Marta»). */
  payerLabels: Partial<Record<PayerPreset, string>>;
}

export const EMPTY_BUDGET_PLAN: BudgetPlanSettings = { allocations: [], payerLabels: {} };
