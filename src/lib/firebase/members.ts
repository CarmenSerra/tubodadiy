"use client";

import { doc, updateDoc } from "firebase/firestore";

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
