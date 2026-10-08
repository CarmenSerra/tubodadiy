"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import {
  AUTO_TASKS_CATEGORY,
  statusAfterTaskSync,
  syncAutoTasks,
  type AutoTaskInput,
} from "@/lib/auto-tasks";
import { getFirebaseDb } from "@/lib/firebase/client";
import { TIMELINE_CATEGORY } from "@/lib/steps";
import type {
  BudgetItem,
  Guest,
  PlanStep,
  StepStatus,
  StepTask,
  Vendor,
} from "@/lib/types";

function plan(planId: string) {
  return doc(getFirebaseDb(), "weddingPlans", planId);
}

// ---- Plan ----

export async function updatePlanDetails(
  planId: string,
  data: Partial<{ title: string; weddingDate: string | null; budgetTotal: number }>
) {
  await updateDoc(plan(planId), data);

  if (data.weddingDate !== undefined || data.budgetTotal !== undefined) {
    try {
      await syncAutoTaskStep(planId, AUTO_TASKS_CATEGORY, data);
    } catch (error) {
      // La fecha/presupuesto ya se guardaron; no fallar por la sincronización.
      console.warn("No se pudieron sincronizar las tareas de «Fecha y presupuesto»", error);
    }
  }
}

/**
 * Aplica `data` a las tareas automáticas del paso de esa categoría (p. ej.
 * "Fecha y presupuesto" con la fecha y el presupuesto recién guardados). No
 * toca pasos completados u omitidos, ni completa nunca el paso.
 */
async function syncAutoTaskStep(planId: string, category: string, data: AutoTaskInput) {
  const db = getFirebaseDb();
  const found = await getDocs(
    query(
      collection(db, "weddingPlans", planId, "steps"),
      where("category", "==", category)
    )
  );
  const stepRef = found.docs[0]?.ref;
  if (!stepRef) return;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(stepRef);
    if (!snap.exists()) return;
    const status: StepStatus = snap.data().status ?? "pending";
    if (status === "completed" || status === "skipped") return;

    const current: StepTask[] = snap.data().tasks ?? [];
    const { tasks, changed } = syncAutoTasks(current, data);
    if (!changed) return;

    const nextStatus = statusAfterTaskSync(status, tasks);
    tx.update(stepRef, nextStatus === status ? { tasks } : { tasks, status: nextStatus });
  });
}

/**
 * Avanza el paso "Cronograma del día": "draft" al crear el primer momento,
 * "share" al copiar o imprimir. Nunca falla hacia fuera: el cronograma ya se
 * ha guardado y esto es solo el progreso del paso.
 */
export async function markTimelineProgress(planId: string, milestone: "draft" | "share") {
  try {
    await syncAutoTaskStep(
      planId,
      TIMELINE_CATEGORY,
      milestone === "draft" ? { timelineDraft: true } : { timelineShare: true }
    );
  } catch (error) {
    console.warn("No se pudo actualizar el progreso del cronograma", error);
  }
}

// ---- Steps ----

export async function updateStepStatus(planId: string, stepId: string, status: StepStatus) {
  await updateDoc(doc(getFirebaseDb(), "weddingPlans", planId, "steps", stepId), { status });
}

export async function updateStepNotes(planId: string, stepId: string, notes: string) {
  await updateDoc(doc(getFirebaseDb(), "weddingPlans", planId, "steps", stepId), { notes });
}

export async function replaceStepTasks(planId: string, stepId: string, tasks: StepTask[]) {
  await updateDoc(doc(getFirebaseDb(), "weddingPlans", planId, "steps", stepId), { tasks });
}

export function addTaskToStep(step: PlanStep, title: string): StepTask[] {
  return [...step.tasks, { id: crypto.randomUUID(), title, done: false }];
}

export function toggleTaskInStep(step: PlanStep, taskId: string): StepTask[] {
  return step.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t));
}

export function removeTaskFromStep(step: PlanStep, taskId: string): StepTask[] {
  return step.tasks.filter((t) => t.id !== taskId);
}

// ---- Guests ----

export async function addGuest(planId: string, data: Omit<Guest, "id" | "createdAt">) {
  await addDoc(collection(getFirebaseDb(), "weddingPlans", planId, "guests"), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function updateGuest(
  planId: string,
  guestId: string,
  data: Partial<Omit<Guest, "id" | "createdAt">>
) {
  await updateDoc(doc(getFirebaseDb(), "weddingPlans", planId, "guests", guestId), data);
}

export async function deleteGuest(planId: string, guestId: string) {
  await deleteDoc(doc(getFirebaseDb(), "weddingPlans", planId, "guests", guestId));
}

// ---- Vendors ----

export async function addVendor(planId: string, data: Omit<Vendor, "id" | "createdAt">) {
  await addDoc(collection(getFirebaseDb(), "weddingPlans", planId, "vendors"), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function updateVendor(
  planId: string,
  vendorId: string,
  data: Partial<Omit<Vendor, "id" | "createdAt">>
) {
  await updateDoc(doc(getFirebaseDb(), "weddingPlans", planId, "vendors", vendorId), data);
}

export async function deleteVendor(planId: string, vendorId: string) {
  await deleteDoc(doc(getFirebaseDb(), "weddingPlans", planId, "vendors", vendorId));
}

// ---- Budget items ----

export async function addBudgetItem(
  planId: string,
  data: Omit<BudgetItem, "id" | "createdAt">
) {
  await addDoc(collection(getFirebaseDb(), "weddingPlans", planId, "budgetItems"), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

/** Crea varias partidas de una vez (todas o ninguna). */
export async function addBudgetItems(
  planId: string,
  items: Omit<BudgetItem, "id" | "createdAt">[]
) {
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  for (const data of items) {
    batch.set(doc(collection(db, "weddingPlans", planId, "budgetItems")), {
      ...data,
      createdAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

export async function updateBudgetItem(
  planId: string,
  itemId: string,
  data: Partial<Omit<BudgetItem, "id" | "createdAt">>
) {
  await updateDoc(doc(getFirebaseDb(), "weddingPlans", planId, "budgetItems", itemId), data);
}

export async function deleteBudgetItem(planId: string, itemId: string) {
  await deleteDoc(doc(getFirebaseDb(), "weddingPlans", planId, "budgetItems", itemId));
}
