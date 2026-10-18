"use client";

import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";

import {
  DEFAULT_CAPACITY,
  MAX_TABLE_CAPACITY,
  TABLE_SHAPES,
  isCourseId,
  type BanquetTable,
  type Dish,
  type DishInput,
  type TableInput,
} from "@/components/banquet/banquet-model";
import { ALLERGEN_IDS, DIET_ONLY_IDS, normalizeDietIds, type AllergenId, type DietOnlyId } from "@/lib/diets";
import { getFirebaseDb } from "@/lib/firebase/client";

// Rutas: weddingPlans/{planId}/tables/{tableId} y weddingPlans/{planId}/menu/{dishId}.

const tablesCollection = (planId: string) => collection(getFirebaseDb(), "weddingPlans", planId, "tables");
const tableDoc = (planId: string, id: string) => doc(getFirebaseDb(), "weddingPlans", planId, "tables", id);
const menuCollection = (planId: string) => collection(getFirebaseDb(), "weddingPlans", planId, "menu");
const dishDoc = (planId: string, id: string) => doc(getFirebaseDb(), "weddingPlans", planId, "menu", id);

export const tablesQuery = tablesCollection;
export const dishesQuery = menuCollection;

function toMillis(value: unknown): number | null {
  return value instanceof Timestamp ? value.toMillis() : null;
}

const restoredCreatedAt = (createdAt: number | null) =>
  createdAt === null ? serverTimestamp() : Timestamp.fromMillis(createdAt);

// ---------- Mapeos (tolerantes con documentos incompletos) ----------

export function mapTable(id: string, data: DocumentData): BanquetTable {
  const shape = TABLE_SHAPES.find((s) => s === data.shape) ?? "round";
  const capacity = Math.round(Number(data.capacity));
  const order = Number(data.order);
  return {
    id,
    name: typeof data.name === "string" ? data.name : "",
    shape,
    capacity: Number.isFinite(capacity) && capacity > 0 ? Math.min(capacity, MAX_TABLE_CAPACITY) : DEFAULT_CAPACITY[shape],
    guestIds: Array.isArray(data.guestIds) ? data.guestIds.filter((g: unknown): g is string => typeof g === "string") : [],
    order: Number.isFinite(order) ? order : 0,
    createdAt: toMillis(data.createdAt),
  };
}

export function mapDish(id: string, data: DocumentData): Dish {
  return {
    id,
    course: isCourseId(data.course) ? data.course : "main",
    name: typeof data.name === "string" ? data.name : "",
    notes: typeof data.notes === "string" ? data.notes : "",
    contains: normalizeDietIds(data.contains).filter((d): d is AllergenId => (ALLERGEN_IDS as readonly string[]).includes(d)),
    suitableFor: normalizeDietIds(data.suitableFor).filter((d): d is DietOnlyId => (DIET_ONLY_IDS as readonly string[]).includes(d)),
    createdAt: toMillis(data.createdAt),
  };
}

// ---------- Mesas ----------

export async function addTable(planId: string, input: TableInput, order: number) {
  await addDoc(tablesCollection(planId), { ...input, guestIds: [], order, createdAt: serverTimestamp() });
}

export async function updateTable(planId: string, tableId: string, patch: Partial<TableInput>) {
  await updateDoc(tableDoc(planId, tableId), { ...patch });
}

export async function deleteTable(planId: string, tableId: string) {
  await deleteDoc(tableDoc(planId, tableId));
}

/** Deshace un borrado: vuelve a crear la mesa con su mismo id y sus comensales. */
export async function restoreTable(planId: string, table: BanquetTable) {
  const { id, createdAt, ...data } = table;
  await setDoc(tableDoc(planId, id), { ...data, createdAt: restoredCreatedAt(createdAt) });
}

/**
 * Sienta a un invitado en una mesa (o lo deja sin mesa con `null`). Un invitado está en
 * una sola mesa: se quita de las demás en el mismo lote.
 */
export async function assignGuest(planId: string, guestId: string, tableId: string | null, tables: BanquetTable[]) {
  const batch = writeBatch(getFirebaseDb());
  for (const table of tables) {
    if (table.id !== tableId && table.guestIds.includes(guestId)) {
      batch.update(tableDoc(planId, table.id), { guestIds: arrayRemove(guestId) });
    }
  }
  const target = tables.find((t) => t.id === tableId);
  if (target && !target.guestIds.includes(guestId)) {
    batch.update(tableDoc(planId, target.id), { guestIds: arrayUnion(guestId) });
  }
  await batch.commit();
}

// ---------- Menú ----------

export async function addDish(planId: string, input: DishInput) {
  await addDoc(menuCollection(planId), { ...input, createdAt: serverTimestamp() });
}

export async function updateDish(planId: string, dishId: string, input: DishInput) {
  await updateDoc(dishDoc(planId, dishId), { ...input });
}

export async function deleteDish(planId: string, dishId: string) {
  await deleteDoc(dishDoc(planId, dishId));
}

export async function restoreDish(planId: string, dish: Dish) {
  const { id, createdAt, ...data } = dish;
  await setDoc(dishDoc(planId, id), { ...data, createdAt: restoredCreatedAt(createdAt) });
}
