"use client";

import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { emptyGift, giftDecided, giftHasData } from "@/components/plan-tools/gift-model";
import { legalDocsComplete } from "@/components/plan-tools/legal-docs-model";
import {
  AUTO_TASKS_CATEGORY,
  CEREMONY_CATEGORY,
  GIFT_CATEGORY,
  LEGAL_DOCS_CATEGORY,
  statusAfterTasksChange,
  syncAutoTasks,
  type AutoTaskInput,
} from "@/lib/auto-tasks";
import { getFirebaseDb } from "@/lib/firebase/client";
import { syncPublishedGift } from "@/lib/firebase/gift-list";
import { syncToolTasks } from "@/lib/firebase/mutations";
import { mapPlan, planDocRef } from "@/lib/firebase/plans";
import type {
  CeremonyType,
  GiftMode,
  PlanGift,
  PlanOfficiant,
  StepStatus,
  StepTask,
  WeddingPlan,
} from "@/lib/types";

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
      // Aunque no cambie ninguna tarea, el estado se alinea con ellas (repara pasos atrasados).
      const nextStatus = statusAfterTasksChange(status, current, tasks);
      if (!changed && nextStatus === status) return;
      const patch: { tasks?: StepTask[]; status?: StepStatus } = {};
      if (changed) patch.tasks = tasks;
      if (nextStatus !== status) patch.status = nextStatus;
      tx.update(stepRef, patch);
    });
  } catch (error) {
    console.warn("No se pudieron sincronizar las tareas del plan", error);
  }
}

const syncCeremony = (planId: string) =>
  syncFromPlan(planId, CEREMONY_CATEGORY, (plan) => ({ ceremonyType: plan.ceremonyType }));

const syncOfficiant = (planId: string) =>
  syncFromPlan(planId, CEREMONY_CATEGORY, (plan) => ({
    officiantConfirmed: Boolean(plan.officiant?.confirmed),
  }));

const syncLegalDocs = (planId: string) =>
  syncFromPlan(planId, LEGAL_DOCS_CATEGORY, (plan) => ({
    legalDocsComplete: legalDocsComplete(plan.ceremonyType, plan.legalDocsDone),
  }));

/**
 * «Decidir cómo recibir el regalo» sigue a que haya modo elegido; «Añadir los
 * datos» sigue a que haya IBAN/Bizum (dinero) o al menos una cosa en la lista
 * (lista). Las dos en los dos sentidos. Se exporta para que la lista de regalos
 * la reevalúe al añadir o quitar cosas.
 */
export async function syncGift(planId: string) {
  let hasItems = false;
  try {
    const items = await getDocs(
      query(collection(getFirebaseDb(), "weddingPlans", planId, "giftItems"), limit(1))
    );
    hasItems = !items.empty;
  } catch (error) {
    // Sin poder leer la lista no se desmarca nada por error: se deja como está.
    console.warn("No se pudo leer la lista de regalos", error);
    return;
  }
  await syncFromPlan(planId, GIFT_CATEGORY, (plan) => ({
    giftDecided: giftDecided(plan.gift),
    giftSet: giftHasData(plan.gift, hasItems ? 1 : 0),
  }));
}

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

/**
 * Guarda el regalo (el modo va dentro) y marca/desmarca las tareas del paso. Si
 * hay una invitación con el regalo a la vista, también se pone al día su copia.
 */
export async function saveGift(planId: string, gift: PlanGift) {
  await updateDoc(planDocRef(planId), { gift });
  await Promise.all([syncGift(planId), syncPublishedGift(planId)]);
}

/**
 * Elige cómo recibir el regalo. Cambiar de modo no borra nada: el IBAN, el
 * Bizum, el mensaje y la lista siguen guardados por si se vuelve atrás.
 */
export async function saveGiftMode(planId: string, current: PlanGift | null, mode: GiftMode) {
  if (current?.mode === mode) return;
  await saveGift(planId, { ...(current ?? emptyGift(mode)), mode });
}

/** Categoría y concepto del gasto que crea la ficha del oficiante en el presupuesto. */
export const OFFICIANT_BUDGET_CATEGORY = "Ceremonia";
export const OFFICIANT_BUDGET_CONCEPT = "Honorarios de oficiante";

/**
 * Guarda la ficha del oficiante (`null` la quita) y mantiene su gasto en el
 * presupuesto, todo en un mismo lote:
 *  - con honorarios y «Añadir al presupuesto»: crea un gasto pendiente en
 *    «Ceremonia» o, si ya hay uno enlazado (`budgetItemId`), solo le cambia el
 *    importe (conserva su estado y fecha);
 *  - sin honorarios, sin el interruptor o sin ficha: borra el gasto enlazado.
 * Después reevalúa «Confirmar oficiante» según `confirmed` (en los dos sentidos).
 */
export async function saveOfficiant(
  planId: string,
  officiant: Omit<PlanOfficiant, "budgetItemId"> | null
) {
  const db = getFirebaseDb();
  const planSnap = await getDoc(planDocRef(planId));
  const linkedId = planSnap.exists() ? mapPlan(planSnap.id, planSnap.data()).officiant?.budgetItemId ?? null : null;
  const itemsPath = collection(db, "weddingPlans", planId, "budgetItems");

  const wantsItem = Boolean(
    officiant && officiant.fee !== null && officiant.fee > 0 && officiant.feeInBudget
  );
  const batch = writeBatch(db);
  let budgetItemId: string | null = null;
  let budgetTouched = false;

  if (wantsItem && officiant && officiant.fee !== null) {
    const existing = linkedId ? await getDoc(doc(itemsPath, linkedId)) : null;
    if (linkedId && existing?.exists()) {
      budgetItemId = linkedId;
      if (existing.data().amount !== officiant.fee) {
        batch.update(existing.ref, { amount: officiant.fee });
        budgetTouched = true;
      }
    } else {
      const ref = doc(itemsPath);
      budgetItemId = ref.id;
      batch.set(ref, {
        category: OFFICIANT_BUDGET_CATEGORY,
        concept: OFFICIANT_BUDGET_CONCEPT,
        amount: officiant.fee,
        state: "pending",
        dueDate: null,
        createdAt: serverTimestamp(),
      });
      budgetTouched = true;
    }
  } else if (linkedId) {
    batch.delete(doc(itemsPath, linkedId));
    budgetTouched = true;
  }

  batch.update(planDocRef(planId), {
    officiant: officiant ? { ...officiant, budgetItemId } : null,
  });
  await batch.commit();

  if (budgetTouched) void syncToolTasks(planId, "budgetItems", [AUTO_TASKS_CATEGORY]);
  await syncOfficiant(planId);
}
