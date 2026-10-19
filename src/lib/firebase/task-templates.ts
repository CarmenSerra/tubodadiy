"use client";

import { collection, doc, runTransaction } from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebase/client";
import { mapStep } from "@/lib/firebase/plans";
import type { StepTranslate } from "@/lib/steps";
import { planTemplate, templateCounts, type TaskTemplate } from "@/lib/task-templates";
import type { PlanStep } from "@/lib/types";

/**
 * Añade una plantilla de tareas al plan en una sola transacción. Relee todos los
 * pasos dentro de la transacción, así que lo que otra persona haya añadido entre
 * tanto tampoco se duplica. Devuelve cuántas tareas ha añadido.
 */
export async function applyTaskTemplate(
  planId: string,
  template: TaskTemplate,
  stepIds: string[],
  t: StepTranslate
): Promise<number> {
  const db = getFirebaseDb();
  let total = 0;
  await runTransaction(db, async (tx) => {
    const col = collection(db, "weddingPlans", planId, "steps");
    const fresh: PlanStep[] = [];
    const rawTasks = new Map<string, unknown[]>();
    // Firestore exige todas las lecturas antes de la primera escritura.
    for (const id of stepIds) {
      const snap = await tx.get(doc(col, id));
      if (!snap.exists()) continue;
      fresh.push(mapStep(snap.id, snap.data()));
      rawTasks.set(snap.id, snap.data().tasks ?? []);
    }
    const patches = planTemplate(template, fresh, t);
    total = templateCounts(patches).tasks;
    for (const patch of patches) {
      const original = fresh.find((s) => s.id === patch.stepId);
      // mapStep cambia títulos/`auto` de tareas antiguas al leer; se guardan las tareas crudas + las nuevas.
      const update: Record<string, unknown> = { tasks: [...(rawTasks.get(patch.stepId) ?? []), ...patch.added] };
      if (original && patch.status !== original.status) update.status = patch.status;
      tx.update(doc(col, patch.stepId), update);
    }
  });
  return total;
}
