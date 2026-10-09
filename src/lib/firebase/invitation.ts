"use client";

import {
  collection,
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
} from "firebase/firestore";

import {
  cleanContent,
  cleanDate,
  cleanInvitationGift,
  publicGift,
  type InvitationContent,
  type InvitationDoc,
  type InvitationGift,
  type RsvpRecord,
} from "@/components/invitation/invitation-model";
import type { GiftItem } from "@/components/plan-tools/gift-model";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { PlanGift } from "@/lib/types";

const toMillis = (value: unknown): number | null =>
  value instanceof Timestamp ? value.toMillis() : null;

export function mapInvitation(id: string, data: DocumentData): InvitationDoc {
  const content = cleanContent(data as Partial<InvitationContent>);
  const gift = cleanInvitationGift(data.gift);
  return {
    ...content,
    // `cleanContent` descarta lo que no reconoce; el plazo ya viene saneado.
    rsvpDeadline: cleanDate(data.rsvpDeadline),
    slug: id,
    planId: String(data.planId ?? ""),
    published: Boolean(data.published),
    gift,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

/** La invitación del plan (como mucho una). Lectura pública según las reglas. */
export function planInvitationQuery(planId: string) {
  return query(
    collection(getFirebaseDb(), "publicInvitations"),
    where("planId", "==", planId),
    limit(1)
  );
}

export interface SaveInvitationInput {
  slug: string;
  planId: string;
  content: InvitationContent;
  published: boolean;
  planGift: PlanGift | null;
  /** La lista de regalos del plan, o `null` si no se ha podido leer (entonces no se toca el regalo publicado). */
  giftItems: GiftItem[] | null;
  /** `true` si el documento aún no existe. */
  isNew: boolean;
}

/** Crea o actualiza `publicInvitations/{slug}`, copiando el regalo (dinero o lista) si procede. */
export async function saveInvitation(input: SaveInvitationInput): Promise<void> {
  const content = cleanContent(input.content);
  const ref = doc(getFirebaseDb(), "publicInvitations", input.slug);
  const data = {
    ...content,
    planId: input.planId,
    published: input.published,
    ...(input.giftItems
      ? { gift: publicGift(input.planGift, input.giftItems, content.showGift) }
      : input.isNew
        ? { gift: null }
        : {}),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, input.isNew ? { ...data, createdAt: serverTimestamp() } : data, { merge: true });
}

/** Solo cambia la publicación (sin tocar el resto). */
export async function setInvitationPublished(slug: string, published: boolean): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), "publicInvitations", slug), {
    published,
    updatedAt: serverTimestamp(),
  });
}

/** Pone al día el regalo publicado (cuando la pareja lo cambia en el plan). */
export async function syncInvitationGift(slug: string, gift: InvitationGift | null): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), "publicInvitations", slug), { gift });
}

// ---- Respuestas ----

export function mapRsvp(id: string, data: DocumentData): RsvpRecord {
  return {
    id,
    name: String(data.name ?? ""),
    attending: Boolean(data.attending),
    plusOne: Boolean(data.plusOne),
    plusOneName: String(data.plusOneName ?? ""),
    dietary: String(data.dietary ?? ""),
    message: String(data.message ?? ""),
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

export function rsvpsQuery(planId: string) {
  return query(
    collection(getFirebaseDb(), "weddingPlans", planId, "rsvps"),
    orderBy("updatedAt", "desc"),
    limit(60)
  );
}
