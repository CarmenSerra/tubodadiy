"use client";

import { doc, getDocs, serverTimestamp, setDoc, updateDoc, type DocumentData } from "firebase/firestore";

import {
  cleanStyle,
  type InvitationStyle,
  type InvitationTemplateId,
} from "@/components/invitation/invitation-model";
import { DEFAULT_PALETTE } from "@/components/invitation/invitation-theme";
import type { SaveTheDateTemplate } from "@/lib/firebase/designs";
import { getFirebaseDb } from "@/lib/firebase/client";
import { planInvitationQuery } from "@/lib/firebase/invitation";

/**
 * Estilo compartido del plan (plantilla, paleta y fondo): lo usan la invitación
 * y «Reserva la fecha», así que cambiarlo en una cambia la otra. Documento
 * único `weddingPlans/{planId}/designs/style`; las reglas de `designs` ya dejan
 * leer y escribir a los miembros del plan.
 */
export function styleRef(planId: string) {
  return doc(getFirebaseDb(), "weddingPlans", planId, "designs", "style");
}

export function mapStyle(_id: string, data: DocumentData): InvitationStyle {
  return cleanStyle(data as Partial<InvitationStyle>);
}

/** Guarda el estilo compartido (sustituye al anterior). */
export async function saveSharedStyle(planId: string, style: InvitationStyle): Promise<void> {
  await setDoc(styleRef(planId), { ...cleanStyle(style), updatedAt: serverTimestamp() });
}

/**
 * Copia el estilo a la invitación pública del plan, si ya existe: la página que
 * ven los invitados lee solo su propio documento. Sin invitación no hace nada.
 */
export async function syncInvitationStyle(planId: string, style: InvitationStyle): Promise<void> {
  const snap = await getDocs(planInvitationQuery(planId));
  const existing = snap.docs[0];
  if (!existing) return;
  const clean = cleanStyle(style);
  await updateDoc(existing.ref, {
    template: clean.template,
    // Sin paleta/fondo (invitaciones antiguas con los colores de su plantilla) se dejan como estén.
    ...(clean.palette ? { palette: clean.palette } : {}),
    ...(clean.background ? { background: clean.background } : {}),
    updatedAt: serverTimestamp(),
  });
}

// ---- Plantilla de «Reserva la fecha» ↔ plantilla compartida ----

const FROM_STATIONERY: Record<SaveTheDateTemplate, InvitationTemplateId> = {
  jardin: "botanico",
  arco: "botanico",
  minimal: "minimal",
  noche: "elegante",
};

const TO_STATIONERY: Record<InvitationTemplateId, SaveTheDateTemplate> = {
  botanico: "jardin",
  minimal: "minimal",
  elegante: "noche",
};

export const templateFromStationery = (id: SaveTheDateTemplate): InvitationTemplateId => FROM_STATIONERY[id];
export const templateToStationery = (id: InvitationTemplateId): SaveTheDateTemplate => TO_STATIONERY[id];

/**
 * Estilo con el que se abren los editores. Migración suave, por prioridad:
 * el estilo compartido → el de la invitación → el de «Reserva la fecha» → el de serie.
 */
export function resolveStyle(sources: {
  shared: InvitationStyle | null;
  invitation: InvitationStyle | null;
  stationeryTemplate: SaveTheDateTemplate | null;
}): InvitationStyle {
  if (sources.shared) return sources.shared;
  if (sources.invitation) return sources.invitation;
  const template = sources.stationeryTemplate ? FROM_STATIONERY[sources.stationeryTemplate] : "botanico";
  return {
    template,
    palette: { id: DEFAULT_PALETTE.id, colors: { ...DEFAULT_PALETTE.colors } },
    background: "plain",
  };
}
