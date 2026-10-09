"use client";

import {
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

import {
  GIFT_ITEM_LIMITS,
  isGiftPriority,
  type GiftItem,
  type GiftItemInput,
} from "@/components/plan-tools/gift-model";
import { cleanUrl } from "@/components/invitation/invitation-model";
import { getFirebaseDb } from "@/lib/firebase/client";
import { giftItemsQuery, syncPublishedGift } from "@/lib/firebase/gift-list";
import { syncGift } from "@/lib/firebase/plan-tools";

// Cambios en la lista de cosas (lectura y mapeo en gift-list.ts). Cada cambio
// pone al día la tarea «Añadir los datos para el regalo» y la copia pública.

const giftItemRef = (planId: string, id: string) =>
  doc(getFirebaseDb(), "weddingPlans", planId, "giftItems", id);

function cleanInput(input: GiftItemInput): GiftItemInput {
  const price =
    typeof input.price === "number" && Number.isFinite(input.price) && input.price >= 0
      ? Math.min(Math.round(input.price * 100) / 100, GIFT_ITEM_LIMITS.price)
      : null;
  return {
    name: input.name.trim().slice(0, GIFT_ITEM_LIMITS.name),
    link: cleanUrl(input.link),
    price,
    note: input.note.trim().slice(0, GIFT_ITEM_LIMITS.note),
    priority: isGiftPriority(input.priority) ? input.priority : null,
  };
}

/** La lista cambió: reevalúa la tarea de datos y la copia pública. Nunca lanza. */
const afterListChange = (planId: string) => Promise.all([syncGift(planId), syncPublishedGift(planId)]);

export async function addGiftItem(planId: string, input: GiftItemInput): Promise<string> {
  const ref = await addDoc(giftItemsQuery(planId), {
    ...cleanInput(input),
    achieved: false,
    createdAt: serverTimestamp(),
  });
  await afterListChange(planId);
  return ref.id;
}

export async function updateGiftItem(planId: string, id: string, input: GiftItemInput) {
  await updateDoc(giftItemRef(planId, id), { ...cleanInput(input) });
  await syncPublishedGift(planId);
}

export async function setGiftItemAchieved(planId: string, id: string, achieved: boolean) {
  await updateDoc(giftItemRef(planId, id), { achieved });
  await syncPublishedGift(planId);
}

export async function deleteGiftItem(planId: string, id: string) {
  await deleteDoc(giftItemRef(planId, id));
  await afterListChange(planId);
}

/** Vuelve a crear una cosa borrada, con su mismo id y su posición en la lista. */
export async function restoreGiftItem(planId: string, item: GiftItem) {
  const { id, createdAt, ...rest } = item;
  await setDoc(giftItemRef(planId, id), {
    ...rest,
    createdAt: createdAt ? Timestamp.fromMillis(createdAt) : serverTimestamp(),
  });
  await afterListChange(planId);
}

/** Restaura los valores anteriores de una cosa editada (para «Deshacer»). */
export async function restoreGiftItemFields(planId: string, item: GiftItem) {
  await updateDoc(giftItemRef(planId, item.id), {
    name: item.name,
    link: item.link,
    price: item.price,
    note: item.note,
    priority: item.priority,
    achieved: item.achieved,
  });
  await syncPublishedGift(planId);
}
