"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebase/client";
import type { TimelineItem } from "@/lib/types";

export type TimelineItemInput = Omit<TimelineItem, "id" | "createdAt">;

function itemsCollection(planId: string) {
  return collection(getFirebaseDb(), "weddingPlans", planId, "timelineItems");
}

function itemDoc(planId: string, itemId: string) {
  return doc(getFirebaseDb(), "weddingPlans", planId, "timelineItems", itemId);
}

/** Crea un momento y devuelve su id (para poder deshacer la creación). */
export async function createTimelineItem(planId: string, data: TimelineItemInput): Promise<string> {
  const ref = await addDoc(itemsCollection(planId), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export async function addTimelineItem(planId: string, data: TimelineItemInput): Promise<void> {
  await createTimelineItem(planId, data);
}

/** Crea varios momentos de una vez (la plantilla). */
export async function addTimelineItems(
  planId: string,
  items: TimelineItemInput[]
): Promise<string[]> {
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  const ids: string[] = [];
  for (const data of items) {
    const ref = doc(itemsCollection(planId));
    ids.push(ref.id);
    batch.set(ref, { ...data, createdAt: serverTimestamp() });
  }
  await batch.commit();
  return ids;
}

export async function updateTimelineItem(
  planId: string,
  itemId: string,
  data: Partial<TimelineItemInput>
) {
  await updateDoc(itemDoc(planId, itemId), data);
}

export async function deleteTimelineItem(planId: string, itemId: string) {
  await deleteDoc(itemDoc(planId, itemId));
}

/** Cambia la hora de inicio de varios momentos de golpe (ajuste en cascada). */
export async function shiftTimelineItems(
  planId: string,
  updates: { id: string; startMin: number }[]
) {
  const batch = writeBatch(getFirebaseDb());
  for (const { id, startMin } of updates) {
    batch.update(itemDoc(planId, id), { startMin });
  }
  await batch.commit();
}

/** Borra varios momentos de golpe (deshacer una creación en bloque, p. ej. la plantilla). */
export async function deleteTimelineItems(planId: string, itemIds: string[]) {
  const batch = writeBatch(getFirebaseDb());
  for (const id of itemIds) batch.delete(itemDoc(planId, id));
  await batch.commit();
}

/**
 * Vuelve a crear un momento borrado con su mismo id y su fecha de creación
 * original (así conserva su sitio en el orden de los empates).
 */
export async function restoreTimelineItem(planId: string, item: TimelineItem) {
  const { id, createdAt, ...data } = item;
  await setDoc(itemDoc(planId, id), {
    ...data,
    createdAt: createdAt === null ? serverTimestamp() : Timestamp.fromMillis(createdAt),
  });
}
