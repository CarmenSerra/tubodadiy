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

import { getFirebaseDb } from "@/lib/firebase/client";
import { initialAutoDone } from "@/lib/auto-tasks";
import { STEP_DEFINITIONS } from "@/lib/steps";
import type {
  StepTask,
  WeddingPlan,
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

export function mapPlan(id: string, data: DocumentData): WeddingPlan {
  return {
    id,
    ownerId: data.ownerId,
    title: data.title ?? "Nuestra boda",
    weddingDate: data.weddingDate ?? null,
    budgetTotal: data.budgetTotal ?? 0,
    memberIds: data.memberIds ?? [],
    unlockedPhaseIds: data.unlockedPhaseIds ?? [],
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
    tasks: data.tasks ?? [],
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

export function mapBudgetItem(id: string, data: DocumentData): BudgetItem {
  return {
    id,
    category: data.category ?? "",
    concept: data.concept ?? "",
    estimatedCost: data.estimatedCost ?? 0,
    actualCost: data.actualCost ?? null,
    paid: Boolean(data.paid),
    createdAt: toMillis(data.createdAt),
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
      status: tasks.some((t) => t.done) ? "in_progress" : "pending",
      sortOrder: index,
      notes: "",
      tasks,
    });
  });

  await followUpBatch.commit();

  return planRef.id;
}
