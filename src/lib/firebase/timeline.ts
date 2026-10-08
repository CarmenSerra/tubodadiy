"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
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

export async function addTimelineItem(planId: string, data: TimelineItemInput) {
  await addDoc(itemsCollection(planId), { ...data, createdAt: serverTimestamp() });
}

/** Crea varios momentos de una vez (la plantilla). */
export async function addTimelineItems(planId: string, items: TimelineItemInput[]) {
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  for (const data of items) {
    batch.set(doc(itemsCollection(planId)), { ...data, createdAt: serverTimestamp() });
  }
  await batch.commit();
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
