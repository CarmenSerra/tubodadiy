"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  Timestamp,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";

import {
  publicGift,
  sameGift,
  type InvitationGift,
} from "@/components/invitation/invitation-model";
import { isGiftPriority, type GiftItem } from "@/components/plan-tools/gift-model";
import { getFirebaseDb } from "@/lib/firebase/client";
import { mapInvitation, planInvitationQuery } from "@/lib/firebase/invitation";
import { mapPlan, planDocRef } from "@/lib/firebase/plans";

// Lista de cosas que la pareja quiere recibir: weddingPlans/{planId}/giftItems/{id}.
// Las reglas dejan leer y escribir a los miembros del plan.

export function giftItemsQuery(planId: string) {
  return collection(getFirebaseDb(), "weddingPlans", planId, "giftItems");
}

const text = (value: unknown) => (typeof value === "string" ? value : "");

export function mapGiftItem(id: string, data: DocumentData): GiftItem {
  const price = data.price;
  return {
    id,
    name: text(data.name),
    link: text(data.link),
    price: typeof price === "number" && Number.isFinite(price) && price >= 0 ? price : null,
    note: text(data.note),
    priority: isGiftPriority(data.priority) ? data.priority : null,
    achieved: data.achieved === true,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : null,
  };
}

/**
 * Pone al día el regalo de la invitación publicada con lo que hay AHORA en el
 * plan (lee el plan y la lista del servidor, no se fía de lo que tuviera quien
 * llama). Si no hay invitación o ya coincide, no escribe nada. Nunca lanza: la
 * copia pública también se corrige al abrir el editor de la invitación.
 */
export async function syncPublishedGift(planId: string): Promise<void> {
  try {
    const found = await getDocs(planInvitationQuery(planId));
    const invitation = found.docs[0] ? mapInvitation(found.docs[0].id, found.docs[0].data()) : null;
    if (!invitation) return;

    const [planSnap, items] = await Promise.all([
      getDoc(planDocRef(planId)),
      getDocs(giftItemsQuery(planId)),
    ]);
    if (!planSnap.exists()) return;
    const plan = mapPlan(planSnap.id, planSnap.data());
    const wanted: InvitationGift | null = publicGift(
      plan.gift,
      items.docs.map((d) => mapGiftItem(d.id, d.data())),
      invitation.showGift
    );
    if (sameGift(invitation.gift, wanted)) return;
    await updateDoc(doc(getFirebaseDb(), "publicInvitations", invitation.slug), { gift: wanted });
  } catch (error) {
    console.warn("No se pudo poner al día el regalo de la invitación", error);
  }
}
