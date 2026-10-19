"use client";

import { arrayRemove, doc, updateDoc, writeBatch } from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebase/client";
import { sanitizePermissions } from "@/lib/permissions";

export function memberDocRef(planId: string, userId: string) {
  return doc(getFirebaseDb(), "weddingPlans", planId, "members", userId);
}

/**
 * Guarda a qué secciones accede un planner o un familiar (lista
 * `"<sección>:view|edit"`). Las reglas solo lo dejan a la pareja.
 */
export async function saveMemberPermissions(planId: string, userId: string, permissions: string[]) {
  await updateDoc(memberDocRef(planId, userId), { permissions: sanitizePermissions(permissions) });
}

/**
 * Quita a alguien del plan: su entrada en `memberIds` y su documento en
 * `members`, en una sola escritura. Las reglas solo lo dejan al dueño (y a
 * nadie más), y no se puede quitar a uno mismo. No hay vuelta atrás desde el
 * cliente (volver a añadir a alguien pasa por una invitación nueva).
 */
export async function removeMember(planId: string, userId: string) {
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  batch.update(doc(db, "weddingPlans", planId), { memberIds: arrayRemove(userId) });
  batch.delete(memberDocRef(planId, userId));
  await batch.commit();
}
