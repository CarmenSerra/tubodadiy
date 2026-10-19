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
import { normalizeDietIds } from "@/lib/diets";
import { getFirebaseDb } from "@/lib/firebase/client";
import { initialAutoDone, statusAfterTasksChange } from "@/lib/auto-tasks";
import { mapVendorExtras } from "@/lib/vendor-extras";
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
  BudgetInstallment,
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
    permissions: Array.isArray(data.permissions)
      ? data.permissions.filter((p: unknown): p is string => typeof p === "string")
      : undefined,
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
    dietIds: normalizeDietIds(data.dietIds),
    householdName: str(data.householdName),
    needsLodging: Boolean(data.needsLodging),
    lodgingPlace: str(data.lodgingPlace),
    needsTransport: Boolean(data.needsTransport),
    transportFrom: str(data.transportFrom),
    giftReceived: str(data.giftReceived),
    giftAmount: typeof data.giftAmount === "number" && Number.isFinite(data.giftAmount) ? data.giftAmount : null,
    thankYouSent: Boolean(data.thankYouSent),
    thankYouDate: typeof data.thankYouDate === "string" && data.thankYouDate ? data.thankYouDate : null,
    createdAt: toMillis(data.createdAt),
  };
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
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

const VENDOR_PLACE_FIELDS = [
  "placeId",
  "address",
  "website",
  "municipality",
  "province",
  "community",
  "country",
  "photoData",
  "placeKind",
] as const;

/**
 * Campos opcionales de lugar: solo se incluyen si tienen valor (nunca `undefined`,
 * que Firestore rechaza al volver a guardar, p. ej. al deshacer un borrado).
 */
function mapVendorPlaceFields(data: DocumentData): Partial<Pick<Vendor, (typeof VENDOR_PLACE_FIELDS)[number]>> {
  const out: Partial<Record<(typeof VENDOR_PLACE_FIELDS)[number], string>> = {};
  for (const key of VENDOR_PLACE_FIELDS) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) out[key] = value;
  }
  return out;
}

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
    ...mapVendorPlaceFields(data),
    ...mapVendorExtras(data),
    createdAt: toMillis(data.createdAt),
  };
}

/** Fecha yyyy-MM-dd guardada, o null. */
function dateOrNull(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

/** Plazos guardados → modelo actual (descarta lo que no tenga forma de plazo). */
function mapInstallments(raw: unknown): BudgetInstallment[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const list = raw
    .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === "object")
    .map((r, i) => {
      const paid = r.paid === true;
      return {
        id: typeof r.id === "string" && r.id ? r.id : `p${i}`,
        amount: typeof r.amount === "number" && Number.isFinite(r.amount) && r.amount > 0 ? r.amount : 0,
        dueDate: dateOrNull(r.dueDate),
        paid,
        paidDate: paid ? dateOrNull(r.paidDate) : null,
      };
    });
  return list.length > 0 ? list : undefined;
}

/**
 * Gasto guardado → modelo actual. Los documentos antiguos tenían coste
 * estimado, coste real y «pagado»: el estimado es el importe previsto y el real
 * (si lo hay) es el real, con el gasto pagado; si no, queda pendiente (o pagado
 * si estaba marcado así). Las partidas sin plazos se leen con un único plazo
 * implícito (ver `itemInstallments`).
 */
export function mapBudgetItem(id: string, data: DocumentData): BudgetItem {
  const common = {
    id,
    category: typeof data.category === "string" ? data.category : "",
    concept: typeof data.concept === "string" ? data.concept : "",
    vendorId: typeof data.vendorId === "string" && data.vendorId ? data.vendorId : null,
    payer: typeof data.payer === "string" && data.payer.trim() ? data.payer.trim() : null,
    createdAt: toMillis(data.createdAt),
  };
  if (typeof data.amount === "number" && Number.isFinite(data.amount)) {
    const installments = mapInstallments(data.installments);
    return {
      ...common,
      amount: data.amount,
      actual: typeof data.actual === "number" && Number.isFinite(data.actual) && data.actual >= 0 ? data.actual : null,
      state: data.state === "paid" ? "paid" : "pending",
      dueDate: dateOrNull(data.dueDate),
      // Sin la clave (no `undefined`) cuando no hay plazos: Firestore no admite `undefined`.
      ...(installments ? { installments } : {}),
    };
  }
  const actual = typeof data.actualCost === "number" ? data.actualCost : 0;
  const estimated = typeof data.estimatedCost === "number" ? data.estimatedCost : 0;
  return {
    ...common,
    amount: estimated > 0 ? estimated : actual,
    actual: actual > 0 ? actual : null,
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
    const late = def.suggestedTasks.flatMap((task) => (typeof task !== "string" && task.late ? [task.auto] : []));
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
      // Plan nuevo: ya trae todas las tareas base, no hay que ofrecerle las «tardías» (ver base-steps.ts).
      ...(late.length > 0 ? { seededAutos: late } : {}),
    });
  });

  await followUpBatch.commit();

  return planRef.id;
}
