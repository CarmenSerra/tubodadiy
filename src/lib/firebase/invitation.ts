"use client";

import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
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
  isValidSlug,
} from "@/components/invitation/invitation-model";
import type { GiftItem } from "@/components/plan-tools/gift-model";
import { getFirebaseDb } from "@/lib/firebase/client";
import { markInvitationsSent } from "@/lib/firebase/invitation-tasks";
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
  /**
   * La invitación guardada, cuando ya existe. Si su enlace es distinto de `slug`,
   * el documento se mueve al enlace nuevo (se crea el nuevo y se borra el viejo).
   */
  previous?: Pick<InvitationDoc, "slug" | "gift"> | null;
}

/** Error al guardar con un enlace que ya usa otra invitación. */
export class SlugTakenError extends Error {}

/** Los enlaces en uso se comprueban leyendo el documento (lectura pública según las reglas). */
export type SlugAvailability = "free" | "mine" | "taken";

export async function checkSlugAvailability(slug: string, planId: string): Promise<SlugAvailability> {
  if (!isValidSlug(slug)) return "taken";
  const snap = await getDoc(doc(getFirebaseDb(), "publicInvitations", slug));
  if (!snap.exists()) return "free";
  return snap.data().planId === planId ? "mine" : "taken";
}

/**
 * Crea o actualiza `publicInvitations/{slug}`, copiando el regalo (dinero o lista) si procede.
 * Si el enlace cambia, mueve el documento en una sola operación (no queda ni un
 * hueco ni un duplicado) y ata las respuestas ya recibidas al enlace nuevo.
 */
export async function saveInvitation(input: SaveInvitationInput): Promise<void> {
  if (!isValidSlug(input.slug)) throw new Error("Invalid slug");
  const content = cleanContent(input.content);
  const db = getFirebaseDb();
  const ref = doc(db, "publicInvitations", input.slug);
  const moving = Boolean(input.previous && input.previous.slug !== input.slug);

  if (moving && (await checkSlugAvailability(input.slug, input.planId)) === "taken") {
    throw new SlugTakenError(input.slug);
  }

  const gift = input.giftItems
    ? publicGift(input.planGift, input.giftItems, content.showGift)
    : moving
      ? (input.previous?.gift ?? null)
      : input.isNew
        ? null
        : undefined;
  const data = {
    ...content,
    planId: input.planId,
    published: input.published,
    ...(gift !== undefined ? { gift } : {}),
    updatedAt: serverTimestamp(),
  };

  if (moving && input.previous) {
    const batch = writeBatch(db);
    batch.set(ref, { ...data, createdAt: serverTimestamp() });
    batch.delete(doc(db, "publicInvitations", input.previous.slug));
    try {
      await batch.commit();
    } catch (error) {
      // Si otra pareja se quedó con el enlace entre la comprobación y el guardado, las reglas lo rechazan.
      if ((await checkSlugAvailability(input.slug, input.planId).catch(() => "free")) === "taken") {
        throw new SlugTakenError(input.slug);
      }
      throw error;
    }
    await relinkRsvps(input.planId, input.slug);
    // Tarea «Enviar invitaciones» (Papelería): publicar la marca; un borrador no la toca.
    if (input.published) void markInvitationsSent(input.planId, true);
    return;
  }

  // `merge` no quita lo que ya hay: sin color a mano (sobre «automático») se borra el que hubiera,
  // si no la página pública se quedaría con el color antiguo aunque la pareja haya vuelto al automático.
  const merged = { ...data, ...(content.envelopeColor ? {} : { envelopeColor: deleteField() }) };
  await setDoc(ref, input.isNew ? { ...merged, createdAt: serverTimestamp() } : merged, { merge: true });
  // Tarea «Enviar invitaciones» (Papelería): publicar la marca; un borrador no la toca.
  if (input.published) void markInvitationsSent(input.planId, true);
}

/**
 * Las respuestas viven en el plan (no en el enlace) y llevan apuntado el enlace
 * con el que se enviaron; al cambiarlo se actualiza para que quien ya respondió
 * pueda seguir editando su respuesta. Si falla, no se pierde ninguna respuesta.
 */
async function relinkRsvps(planId: string, slug: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    const snap = await getDocs(collection(db, "weddingPlans", planId, "rsvps"));
    const stale = snap.docs.filter((d) => d.data().slug !== slug);
    for (let i = 0; i < stale.length; i += 400) {
      const batch = writeBatch(db);
      for (const d of stale.slice(i, i + 400)) batch.update(d.ref, { slug });
      await batch.commit();
    }
  } catch (error) {
    console.warn("No se pudieron actualizar las respuestas al nuevo enlace", error);
  }
}

/** Solo cambia la publicación (sin tocar el resto). */
export async function setInvitationPublished(slug: string, published: boolean): Promise<void> {
  const ref = doc(getFirebaseDb(), "publicInvitations", slug);
  await updateDoc(ref, { published, updatedAt: serverTimestamp() });
  try {
    const planId = (await getDoc(ref)).data()?.planId;
    if (typeof planId === "string" && planId) void markInvitationsSent(planId, published);
  } catch (error) {
    console.warn("No se pudo actualizar la tarea «Enviar invitaciones»", error);
  }
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
