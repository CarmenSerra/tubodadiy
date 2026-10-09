"use client";

import {
  collection,
  doc,
  writeBatch,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";

import { mapGift } from "@/components/plan-tools/gift-model";
import { getFirebaseDb } from "@/lib/firebase/client";
import { initialAutoDone, statusAfterTasksChange } from "@/lib/auto-tasks";
import { STEP_DEFINITIONS, baseTaskAuto, currentAuto, legacyTaskTitle } from "@/lib/steps";
import type {
  StepTask,
  WeddingPlan,
  OfficiantKind,
  PlanOfficiant,
  PlanStep,
  PlanMember,
  Guest,
  Vendor,
  VendorStatus,
  BudgetItem,
  TimelineItem,
} from "@/lib/types";

function toMillis(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  return null;
}

const OFFICIANT_KINDS: OfficiantKind[] = ["juez", "sacerdote", "celebrante", "allegado", "otro"];

function mapOfficiant(raw: unknown): PlanOfficiant | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  const fee = typeof data.fee === "number" && Number.isFinite(data.fee) && data.fee > 0 ? data.fee : null;
  return {
    name: text(data.name),
    kind: OFFICIANT_KINDS.find((k) => k === data.kind) ?? null,
    phone: text(data.phone),
    email: text(data.email),
    confirmed: data.confirmed === true,
    fee,
    feeInBudget: fee !== null && data.feeInBudget === true,
    budgetItemId: typeof data.budgetItemId === "string" && data.budgetItemId ? data.budgetItemId : null,
    notes: text(data.notes),
  };
}

export function mapPlan(id: string, data: DocumentData): WeddingPlan {
  return {
    id,
    ownerId: data.ownerId,
    title: data.title ?? "Nuestra boda",
    weddingDate: data.weddingDate ?? null,
    budgetTotal: data.budgetTotal ?? 0,
    memberIds: data.memberIds ?? [],
    unlockedPhaseIds: data.unlockedPhaseIds ?? [],
    lockedPhaseIds: data.lockedPhaseIds ?? [],
    ceremonyType: data.ceremonyType ?? null,
    legalDocsDone: data.legalDocsDone ?? [],
    officiant: mapOfficiant(data.officiant),
    gift: mapGift(data.gift),
    createdAt: toMillis(data.createdAt),
  };
}

const STEP_DEFINITION_BY_CATEGORY = new Map(STEP_DEFINITIONS.map((def) => [def.category, def]));

export function mapStep(id: string, data: DocumentData): PlanStep {
  // El título y la descripción de los pasos integrados se copian a Firestore al
  // crear el plan; para que los planes ya creados muestren siempre el texto
  // vigente, se lee de la definición y solo se recurre a lo guardado si la
  // categoría no es una de las integradas.
  const definition = STEP_DEFINITION_BY_CATEGORY.get(data.category);
  return {
    id,
    category: data.category,
    title: definition?.title ?? data.title,
    description: definition?.description ?? data.description ?? "",
    status: data.status ?? "pending",
    sortOrder: data.sortOrder ?? 0,
    notes: data.notes ?? "",
    // Las tareas base de planes anteriores a las herramientas enlazadas se
    // guardaron sin `auto`: se reconocen por paso + título para darles su flecha.
    tasks: ((data.tasks ?? []) as StepTask[]).map((task) => {
      // Si el título de una tarea base cambió, se lee con el texto vigente
      // (aunque ya se le hubiera escrito `auto` al sincronizarla).
      const title = legacyTaskTitle(data.category, task.title) ?? task.title;
      const auto = currentAuto(task.auto) ?? baseTaskAuto(data.category, task.title);
      if (!auto) return task;
      return { ...task, title, auto };
    }),
  };
}

export function mapMember(id: string, data: DocumentData): PlanMember {
  return {
    userId: id,
    role: data.role,
    status: data.status,
    invitedEmail: data.invitedEmail ?? "",
  };
}

export function mapGuest(id: string, data: DocumentData): Guest {
  return {
    id,
    name: data.name ?? "",
    groupName: data.groupName ?? "",
    rsvpStatus: data.rsvpStatus ?? "pending",
    plusOne: Boolean(data.plusOne),
    plusOneName: typeof data.plusOneName === "string" ? data.plusOneName : "",
    dietaryNotes: data.dietaryNotes ?? "",
    notes: data.notes ?? "",
    createdAt: toMillis(data.createdAt),
  };
}

// Estados antiguos (valorando/contactado/contratado/descartado) → flujo actual,
// para que los proveedores ya guardados sigan funcionando.
const VENDOR_STATUS_BY_STORED_VALUE: Record<string, VendorStatus> = {
  exploring: "exploring",
  visited: "visited",
  favorite: "favorite",
  chosen: "chosen",
  considering: "exploring",
  contacted: "visited",
  booked: "chosen",
  declined: "exploring",
};

export function mapVendor(id: string, data: DocumentData): Vendor {
  return {
    id,
    category: data.category ?? "",
    name: data.name ?? "",
    contactEmail: data.contactEmail ?? "",
    contactPhone: data.contactPhone ?? "",
    cost: data.cost ?? null,
    status: VENDOR_STATUS_BY_STORED_VALUE[String(data.status)] ?? "exploring",
    notes: data.notes ?? "",
    photoUrl: data.photoUrl ?? "",
    location: data.location ?? "",
    mapsUrl: data.mapsUrl ?? "",
    createdAt: toMillis(data.createdAt),
  };
}

/**
 * Gasto guardado → modelo actual. Los documentos antiguos tenían coste
 * estimado, coste real y «pagado»: con coste real es un gasto pagado por ese
 * importe; si no, es el estimado, pendiente (o pagado si estaba marcado así).
 */
export function mapBudgetItem(id: string, data: DocumentData): BudgetItem {
  const common = {
    id,
    category: typeof data.category === "string" ? data.category : "",
    concept: typeof data.concept === "string" ? data.concept : "",
    createdAt: toMillis(data.createdAt),
  };
  if (typeof data.amount === "number" && Number.isFinite(data.amount)) {
    return {
      ...common,
      amount: data.amount,
      state: data.state === "paid" ? "paid" : "pending",
      dueDate: typeof data.dueDate === "string" && data.dueDate ? data.dueDate : null,
    };
  }
  const actual = typeof data.actualCost === "number" ? data.actualCost : 0;
  const estimated = typeof data.estimatedCost === "number" ? data.estimatedCost : 0;
  return {
    ...common,
    amount: actual > 0 ? actual : estimated,
    state: actual > 0 || data.paid === true ? "paid" : "pending",
    dueDate: null,
  };
}

export function mapTimelineItem(id: string, data: DocumentData): TimelineItem {
  return {
    id,
    title: data.title ?? "",
    startMin: typeof data.startMin === "number" ? data.startMin : 0,
    durationMin: typeof data.durationMin === "number" ? data.durationMin : 0,
    location: data.location ?? "",
    responsible: data.responsible ?? "",
    notes: data.notes ?? "",
    highlight: Boolean(data.highlight),
    createdAt: toMillis(data.createdAt),
  };
}

export function myPlansQuery(uid: string) {
  const db = getFirebaseDb();
  return query(collection(db, "weddingPlans"), where("memberIds", "array-contains", uid));
}

export function planDocRef(planId: string) {
  return doc(getFirebaseDb(), "weddingPlans", planId);
}

export function stepsQuery(planId: string) {
  return query(collection(getFirebaseDb(), "weddingPlans", planId, "steps"), orderBy("sortOrder"));
}

export function membersQuery(planId: string) {
  return collection(getFirebaseDb(), "weddingPlans", planId, "members");
}

export function guestsQuery(planId: string) {
  return query(
    collection(getFirebaseDb(), "weddingPlans", planId, "guests"),
    orderBy("createdAt", "desc")
  );
}

export function vendorsQuery(planId: string) {
  return query(
    collection(getFirebaseDb(), "weddingPlans", planId, "vendors"),
    orderBy("createdAt", "desc")
  );
}

export function budgetItemsQuery(planId: string) {
  return query(
    collection(getFirebaseDb(), "weddingPlans", planId, "budgetItems"),
    orderBy("createdAt", "desc")
  );
}

export function timelineItemsQuery(planId: string) {
  return query(
    collection(getFirebaseDb(), "weddingPlans", planId, "timelineItems"),
    orderBy("startMin")
  );
}

export async function createWeddingPlan(
  uid: string,
  input: { title: string; weddingDate: string | null; budgetTotal: number }
): Promise<string> {
  const db = getFirebaseDb();
  const planRef = doc(collection(db, "weddingPlans"));

  const planBatch = writeBatch(db);
  planBatch.set(planRef, {
    ownerId: uid,
    title: input.title,
    weddingDate: input.weddingDate,
    budgetTotal: input.budgetTotal,
    memberIds: [uid],
    createdAt: serverTimestamp(),
  });
  await planBatch.commit();

  const followUpBatch = writeBatch(db);
  const memberRef = doc(db, "weddingPlans", planRef.id, "members", uid);
  followUpBatch.set(memberRef, {
    role: "owner",
    status: "accepted",
    invitedEmail: "",
  });

  STEP_DEFINITIONS.forEach((def, index) => {
    const stepRef = doc(collection(db, "weddingPlans", planRef.id, "steps"));
    const tasks: StepTask[] = def.suggestedTasks.map((suggested) => {
      if (typeof suggested === "string") {
        return { id: crypto.randomUUID(), title: suggested, done: false };
      }
      const done = initialAutoDone(suggested.auto, input);
      return { id: crypto.randomUUID(), title: suggested.title, done, auto: suggested.auto };
    });
    followUpBatch.set(stepRef, {
      category: def.category,
      title: def.title,
      description: def.description,
      status: statusAfterTasksChange("pending", [], tasks),
      sortOrder: index,
      notes: "",
      tasks,
    });
  });

  await followUpBatch.commit();

  return planRef.id;
}
