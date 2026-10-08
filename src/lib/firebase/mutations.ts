"use client";

import {
  addDoc,
  arrayRemove,
  arrayUnion,
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
  CEREMONY_CATEGORY,
  GUESTS_CATEGORY,
  VENDORS_CATEGORY,
  budgetReached,
  guestsReached,
  statusAfterTasksChange,
  syncAutoTasks,
  vendorsReached,
  type AutoTaskInput,
} from "@/lib/auto-tasks";
import { getFirebaseDb } from "@/lib/firebase/client";
import { mapBudgetItem, mapGuest, mapVendor } from "@/lib/firebase/plans";
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
 * Desbloquea para siempre una fase posterior a la recomendada. Se guarda en el
 * plan (arrayUnion, idempotente), así lo ven también quienes colaboran.
 */
export async function unlockPhase(planId: string, phaseId: string) {
  await updateDoc(plan(planId), {
    unlockedPhaseIds: arrayUnion(phaseId),
    lockedPhaseIds: arrayRemove(phaseId),
  });
}

/**
 * Vuelve a bloquear una fase posterior a la recomendada, aunque estuviera
 * abierta por haberla desbloqueado o por tener progreso (el bloqueo explícito
 * gana). Ambas listas se mantienen coherentes en una sola escritura.
 */
export async function lockPhase(planId: string, phaseId: string) {
  await updateDoc(plan(planId), {
    lockedPhaseIds: arrayUnion(phaseId),
    unlockedPhaseIds: arrayRemove(phaseId),
  });
}

/**
 * Aplica `data` a las tareas automáticas del paso de esa categoría (p. ej.
 * "Fecha y presupuesto" con la fecha y el presupuesto recién guardados). No
 * no toca pasos omitidos. El estado del paso sigue a sus tareas (completar la
 * última lo completa; desmarcar una automática de un paso completo lo reabre).
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
    if (status === "skipped") return;

    const current: StepTask[] = snap.data().tasks ?? [];
    const { tasks, changed } = syncAutoTasks(category, current, data);
    if (!changed) return;

    const nextStatus = statusAfterTasksChange(status, current, tasks);
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

/**
 * Revisa los datos de una herramienta (invitados, proveedores, gastos) y marca
 * las tareas base de los pasos indicados cuyo hito ya se cumple. Quien la usa
 * no la espera (`void`) para no retrasar el guardado, y nunca falla hacia
 * fuera: el dato ya se ha guardado y esto es solo el progreso del paso.
 */
async function syncToolTasks(
  planId: string,
  subcollection: "guests" | "vendors" | "budgetItems",
  categories: string[]
) {
  try {
    const snap = await getDocs(collection(getFirebaseDb(), "weddingPlans", planId, subcollection));
    const reached =
      subcollection === "guests"
        ? guestsReached(snap.docs.map((d) => mapGuest(d.id, d.data())))
        : subcollection === "vendors"
          ? vendorsReached(snap.docs.map((d) => mapVendor(d.id, d.data())))
          : budgetReached(snap.docs.map((d) => mapBudgetItem(d.id, d.data())));
    for (const category of categories) {
      await syncAutoTaskStep(planId, category, { reached });
    }
  } catch (error) {
    console.warn("No se pudieron sincronizar las tareas del plan", error);
  }
}

// ---- Steps ----

export async function updateStepStatus(planId: string, stepId: string, status: StepStatus) {
  await updateDoc(doc(getFirebaseDb(), "weddingPlans", planId, "steps", stepId), { status });
}

export async function updateStepNotes(planId: string, stepId: string, notes: string) {
  await updateDoc(doc(getFirebaseDb(), "weddingPlans", planId, "steps", stepId), { notes });
}

/**
 * Guarda las tareas del paso y, en la misma escritura, su estado: la causa de
 * que un paso con todas las tareas hechas no contara como completado era que
 * solo se escribía `tasks` y `status` (que leen fases, progreso y home) no se
 * movía nunca.
 */
export async function replaceStepTasks(planId: string, step: PlanStep, tasks: StepTask[]) {
  const status = statusAfterTasksChange(step.status, step.tasks, tasks);
  await updateDoc(
    doc(getFirebaseDb(), "weddingPlans", planId, "steps", step.id),
    status === step.status ? { tasks } : { tasks, status }
  );
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
  void syncToolTasks(planId, "guests", [GUESTS_CATEGORY]);
}

export async function updateGuest(
  planId: string,
  guestId: string,
  data: Partial<Omit<Guest, "id" | "createdAt">>
) {
  await updateDoc(doc(getFirebaseDb(), "weddingPlans", planId, "guests", guestId), data);
  void syncToolTasks(planId, "guests", [GUESTS_CATEGORY]);
}

export async function deleteGuest(planId: string, guestId: string) {
  await deleteDoc(doc(getFirebaseDb(), "weddingPlans", planId, "guests", guestId));
  void syncToolTasks(planId, "guests", [GUESTS_CATEGORY]);
}

// ---- Vendors ----

// «Contratar…» vive en Proveedores y «Confirmar oficiante» en Ceremonia.
const syncVendorTasks = (planId: string) =>
  syncToolTasks(planId, "vendors", [VENDORS_CATEGORY, CEREMONY_CATEGORY]);

export async function addVendor(planId: string, data: Omit<Vendor, "id" | "createdAt">) {
  await addDoc(collection(getFirebaseDb(), "weddingPlans", planId, "vendors"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  void syncVendorTasks(planId);
}

export async function updateVendor(
  planId: string,
  vendorId: string,
  data: Partial<Omit<Vendor, "id" | "createdAt">>
) {
  await updateDoc(doc(getFirebaseDb(), "weddingPlans", planId, "vendors", vendorId), data);
  void syncVendorTasks(planId);
}

export async function deleteVendor(planId: string, vendorId: string) {
  await deleteDoc(doc(getFirebaseDb(), "weddingPlans", planId, "vendors", vendorId));
  void syncVendorTasks(planId);
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
  void syncToolTasks(planId, "budgetItems", [AUTO_TASKS_CATEGORY]);
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
  void syncToolTasks(planId, "budgetItems", [AUTO_TASKS_CATEGORY]);
}

export async function updateBudgetItem(
  planId: string,
  itemId: string,
  data: Partial<Omit<BudgetItem, "id" | "createdAt">>
) {
  await updateDoc(doc(getFirebaseDb(), "weddingPlans", planId, "budgetItems", itemId), data);
  void syncToolTasks(planId, "budgetItems", [AUTO_TASKS_CATEGORY]);
}

export async function deleteBudgetItem(planId: string, itemId: string) {
  await deleteDoc(doc(getFirebaseDb(), "weddingPlans", planId, "budgetItems", itemId));
  void syncToolTasks(planId, "budgetItems", [AUTO_TASKS_CATEGORY]);
}
