"use client";

import {
  arrayRemove,
  arrayUnion,
  collection,
  getDocs,
  query,
  runTransaction,
  updateDoc,
  where,
} from "firebase/firestore";

import { giftHasPaymentData } from "@/components/plan-tools/gift-model";
import { legalDocsComplete } from "@/components/plan-tools/legal-docs-model";
import {
  CEREMONY_CATEGORY,
  GIFT_CATEGORY,
  LEGAL_DOCS_CATEGORY,
  statusAfterTasksChange,
  syncAutoTasks,
  type AutoTaskInput,
} from "@/lib/auto-tasks";
import { getFirebaseDb } from "@/lib/firebase/client";
import { mapPlan, planDocRef } from "@/lib/firebase/plans";
import type { CeremonyType, PlanGift, StepStatus, StepTask, WeddingPlan } from "@/lib/types";

// Mutaciones de las herramientas del plan (ceremonia, documentos legales y
// regalo). Cada una guarda el dato en el documento del plan y, después,
// sincroniza las tareas automáticas de su paso. Si la sincronización falla no
// se propaga el error: el dato ya está guardado y esto es solo el progreso.

/**
 * Sincroniza las tareas automáticas del paso de esa categoría con lo que dice
 * el plan AHORA. El plan se lee dentro de la misma transacción que el paso (no
 * se confía en lo que tenía quien llama): si dos personas marcan papeles a la
 * vez o se pulsan casillas muy seguidas, la transacción se reintenta y la
 * última escritura siempre refleja el último estado del plan.
 */
async function syncFromPlan(
  planId: string,
  category: string,
  toInput: (plan: WeddingPlan) => AutoTaskInput
) {
  try {
    const db = getFirebaseDb();
    const found = await getDocs(
      query(collection(db, "weddingPlans", planId, "steps"), where("category", "==", category))
    );
    const stepRef = found.docs[0]?.ref;
    if (!stepRef) return;

    await runTransaction(db, async (tx) => {
      const planSnap = await tx.get(planDocRef(planId));
      const stepSnap = await tx.get(stepRef);
      if (!planSnap.exists() || !stepSnap.exists()) return;
      const status: StepStatus = stepSnap.data().status ?? "pending";
      if (status === "skipped") return;

      const current: StepTask[] = stepSnap.data().tasks ?? [];
      const input = toInput(mapPlan(planSnap.id, planSnap.data()));
      const { tasks, changed } = syncAutoTasks(category, current, input);
      if (!changed) return;

      const nextStatus = statusAfterTasksChange(status, current, tasks);
      tx.update(stepRef, nextStatus === status ? { tasks } : { tasks, status: nextStatus });
    });
  } catch (error) {
    console.warn("No se pudieron sincronizar las tareas del plan", error);
  }
}

const syncCeremony = (planId: string) =>
  syncFromPlan(planId, CEREMONY_CATEGORY, (plan) => ({ ceremonyType: plan.ceremonyType }));

const syncLegalDocs = (planId: string) =>
  syncFromPlan(planId, LEGAL_DOCS_CATEGORY, (plan) => ({
    legalDocsComplete: legalDocsComplete(plan.ceremonyType, plan.legalDocsDone),
  }));

const syncGift = (planId: string) =>
  syncFromPlan(planId, GIFT_CATEGORY, (plan) => ({ giftSet: giftHasPaymentData(plan.gift) }));

/**
 * Guarda el tipo de ceremonia (`null` lo quita). Cambia la lista de papeles
 * que aplican, así que también se reevalúa «Reunir documentación».
 */
export async function saveCeremonyType(planId: string, ceremonyType: CeremonyType | null) {
  await updateDoc(planDocRef(planId), { ceremonyType });
  await Promise.all([syncCeremony(planId), syncLegalDocs(planId)]);
}

/**
 * Marca o desmarca un papel (o una situación) con arrayUnion/arrayRemove, para
 * que dos personas marcando a la vez no se pisen, y reevalúa «Reunir documentación».
 */
export async function setLegalDocChecked(planId: string, id: string, checked: boolean) {
  await updateDoc(planDocRef(planId), {
    legalDocsDone: checked ? arrayUnion(id) : arrayRemove(id),
  });
  await syncLegalDocs(planId);
}

/** Guarda los datos del regalo (`null` si no queda nada) y marca/desmarca la tarea de datos. */
export async function saveGift(planId: string, gift: PlanGift | null) {
  await updateDoc(planDocRef(planId), { gift });
  await syncGift(planId);
}
