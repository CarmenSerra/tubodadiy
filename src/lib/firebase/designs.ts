"use client";

import { doc, serverTimestamp, setDoc, type DocumentData } from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebase/client";

/** Plantillas del diseñador «Reserva la fecha». */
export type SaveTheDateTemplate = "jardin" | "minimal" | "noche" | "arco";

export const SAVE_THE_DATE_TEMPLATES: readonly SaveTheDateTemplate[] = [
  "jardin",
  "minimal",
  "noche",
  "arco",
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

export async function saveSaveTheDate(planId: string, design: SaveTheDateDesign): Promise<void> {
  await setDoc(saveTheDateRef(planId), { ...design, updatedAt: serverTimestamp() });
}
