"use client";

import { doc, runTransaction } from "firebase/firestore";
import * as React from "react";

import { giftHasPaymentData } from "@/components/plan-tools/gift-model";
import { legalDocsComplete } from "@/components/plan-tools/legal-docs-model";
import {
  AUTO_TASKS_CATEGORY,
  CEREMONY_CATEGORY,
  GIFT_CATEGORY,
  GUESTS_CATEGORY,
  LEGAL_DOCS_CATEGORY,
  VENDORS_CATEGORY,
  isBudgetSet,
  isDateSet,
  statusForTasks,
  type AutoTaskInput,
} from "@/lib/auto-tasks";
import { getFirebaseDb } from "@/lib/firebase/client";
import { syncAutoTaskStep, syncToolTasks } from "@/lib/firebase/mutations";
import type { PlanStep, StepStatus, StepTask, StepTaskAuto, WeddingPlan } from "@/lib/types";

/**
 * Pone al día el progreso de los pasos al abrir el plan, por si alguna
 * sincronización no llegó a terminar (se cerró o recargó la pestaña justo
 * después de guardar, o falló la red) o el paso se escribió antes de que su
 * estado siguiera a las tareas. Solo MARCA lo que ya se cumple, nunca
 * desmarca. Nunca lanza: es progreso, no datos.
 */
export async function reconcileStepProgress(planId: string, plan: WeddingPlan, steps: PlanStep[]) {
  const byCategory = new Map(steps.map((s) => [s.category, s]));
  const pendingAutos = (category: string, autos: StepTaskAuto[]) =>
    (byCategory.get(category)?.tasks ?? []).some((t) => !t.done && t.auto && autos.includes(t.auto));

  const work: Promise<unknown>[] = [];

  // Hitos que ya se cumplen según los datos del propio plan (sin leer nada más).
  const fromPlan: [string, AutoTaskInput][] = [
    [
      AUTO_TASKS_CATEGORY,
      {
        reached: [
          ...(isDateSet(plan.weddingDate) ? (["date"] as const) : []),
          ...(isBudgetSet(plan.budgetTotal) ? (["budget"] as const) : []),
        ],
      },
    ],
    [CEREMONY_CATEGORY, { reached: plan.ceremonyType ? ["ceremony-type"] : [] }],
    [
      LEGAL_DOCS_CATEGORY,
      { reached: legalDocsComplete(plan.ceremonyType, plan.legalDocsDone) ? ["legal-docs"] : [] },
    ],
    [GIFT_CATEGORY, { reached: giftHasPaymentData(plan.gift) ? ["gift-data"] : [] }],
  ];
  for (const [category, input] of fromPlan) {
    const step = byCategory.get(category);
    const hasWork = step?.tasks.some((t) => !t.done && t.auto && input.reached?.includes(t.auto));
    if (hasWork) work.push(syncAutoTaskStep(planId, category, input).catch(() => {}));
  }

  // Hitos que dependen de una herramienta: solo se lee su colección si queda
  // alguna tarea pendiente que ella pueda marcar.
  if (pendingAutos(GUESTS_CATEGORY, ["guests-draft", "guests-final"])) {
    work.push(syncToolTasks(planId, "guests", [GUESTS_CATEGORY]));
  }
  const vendorAutos: StepTaskAuto[] = [
    "vendor-catering",
    "vendor-photo",
    "vendor-music",
    "vendor-officiant",
  ];
  const vendorCategories = [VENDORS_CATEGORY, CEREMONY_CATEGORY].filter((c) =>
    pendingAutos(c, vendorAutos)
  );
  if (vendorCategories.length > 0) work.push(syncToolTasks(planId, "vendors", vendorCategories));
  if (pendingAutos(AUTO_TASKS_CATEGORY, ["budget-split"])) {
    work.push(syncToolTasks(planId, "budgetItems", [AUTO_TASKS_CATEGORY]));
  }

  // Pasos con todas las tareas hechas y el estado atrasado.
  for (const step of steps) {
    if (statusForTasks(step.status, step.tasks) !== step.status) {
      work.push(healStepStatus(planId, step.id).catch(() => {}));
    }
  }

  await Promise.all(work);
}

/** Alinea el estado de un paso con sus tareas (lee el paso actual dentro de la transacción). */
async function healStepStatus(planId: string, stepId: string) {
  const db = getFirebaseDb();
  const ref = doc(db, "weddingPlans", planId, "steps", stepId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const status: StepStatus = snap.data().status ?? "pending";
    const tasks: StepTask[] = snap.data().tasks ?? [];
    const next = statusForTasks(status, tasks);
    if (next !== status) tx.update(ref, { status: next });
  });
}

/** Margen tras reconciliar para que los cambios resultantes lleguen por el listener. */
const SETTLE_MS = 1500;
/** Tope: con la red lenta o caída no se deja sin celebrar para siempre. */
const SETTLE_CAP_MS = 6000;

/**
 * Lanza `reconcileStepProgress` una vez por plan abierto, cuando ya están
 * cargados el plan y los pasos. No se repite con cada cambio en vivo: si
 * alguien cambia a mano el estado de un paso, no se le lleva la contraria.
 * Devuelve `true` cuando la puesta al día ha terminado y sus efectos ya se
 * han visto: lo que cambie después es un cambio «en vivo» (la celebración de
 * fase completada solo se dispara con esos, no con lo que se repara al abrir).
 */
export function useReconcileStepProgress(
  planId: string,
  plan: WeddingPlan | null,
  steps: PlanStep[],
  loading: boolean
): boolean {
  const started = React.useRef<string | null>(null);
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const [settledFor, setSettledFor] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (loading || !plan || steps.length === 0 || started.current === planId) return;
    started.current = planId;
    timers.current.push(setTimeout(() => setSettledFor(planId), SETTLE_CAP_MS));
    void reconcileStepProgress(planId, plan, steps)
      .catch((error) => {
        console.warn("No se pudo poner al día el progreso del plan", error);
      })
      .finally(() => {
        timers.current.push(setTimeout(() => setSettledFor(planId), SETTLE_MS));
      });
  }, [planId, plan, steps, loading]);

  React.useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    []
  );

  return settledFor === planId;
}
