"use client";

import { doc, serverTimestamp, setDoc, type DocumentData } from "firebase/firestore";

import { STATIONERY_CATEGORY, saveTheDateReached } from "@/lib/auto-tasks";
import { getFirebaseDb } from "@/lib/firebase/client";
import { syncStepQuietly } from "@/lib/firebase/mutations";

/** Plantillas del diseñador «Reserva la fecha». */
export type SaveTheDateTemplate = "jardin" | "minimal" | "noche" | "arco" | "doodle" | "hilo" | "retro" | "azulejo";

export const SAVE_THE_DATE_TEMPLATES: readonly SaveTheDateTemplate[] = [
  "jardin",
  "minimal",
  "noche",
  "arco",
  "doodle",
  "hilo",
  "retro",
  "azulejo",
];

/** Lo que se edita y se guarda de un diseño «Reserva la fecha». */
export interface SaveTheDateDesign {
  template: SaveTheDateTemplate;
  /** Frase superior, p. ej. «Reserva la fecha». */
  heading: string;
  name1: string;
  name2: string;
  /** Día de la boda, `yyyy-MM-dd`, o cadena vacía. */
  date: string;
  /** Lugar o ciudad. */
  place: string;
  /** Mensaje corto al pie. */
  message: string;
}

export const MAX_NAME = 30;
export const MAX_HEADING = 32;
export const MAX_PLACE = 60;
export const MAX_MESSAGE = 120;

function isTemplate(value: unknown): value is SaveTheDateTemplate {
  return (SAVE_THE_DATE_TEMPLATES as readonly unknown[]).includes(value);
}

const text = (value: unknown) => (typeof value === "string" ? value : "");

export function mapSaveTheDate(_id: string, data: DocumentData): SaveTheDateDesign {
  return {
    template: isTemplate(data.template) ? data.template : "jardin",
    heading: text(data.heading),
    name1: text(data.name1),
    name2: text(data.name2),
    date: text(data.date),
    place: text(data.place),
    message: text(data.message),
  };
}

/** Documento único del diseño: weddingPlans/{planId}/designs/saveTheDate */
export function saveTheDateRef(planId: string) {
  return doc(getFirebaseDb(), "weddingPlans", planId, "designs", "saveTheDate");
}

/**
 * Guarda el diseño y marca la tarea «Diseñar las tarjetas “reserva la fecha”»
 * del paso Papelería si tiene algo escrito. Quien guarda el diseño no tiene que
 * hacer nada más; `reconcile` lo repara al abrir el plan si esto no llegó a
 * terminar.
 */
export async function saveSaveTheDate(planId: string, design: SaveTheDateDesign): Promise<void> {
  await setDoc(saveTheDateRef(planId), { ...design, updatedAt: serverTimestamp() });
  if (saveTheDateReached(design).length > 0) void markSaveTheDateDone(planId);
}

/**
 * Marca «Diseñar las tarjetas “reserva la fecha”» como hecha. Para quien guarde
 * el diseño sin pasar por `saveSaveTheDate`. Nunca lanza.
 */
export async function markSaveTheDateDone(planId: string): Promise<void> {
  await syncStepQuietly(planId, STATIONERY_CATEGORY, { reached: ["stationery-save-date"] });
}
