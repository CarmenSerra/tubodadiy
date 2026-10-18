"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";

import {
  EMPTY_RINGS,
  isBeautyService,
  isDecorKind,
  isLookStatus,
  isPersonId,
  type BeautyItem,
  type DecorItem,
  type MoodImage,
  type Outfit,
  type Rings,
  type RoutineItem,
  type StyleSettings,
} from "@/components/look/look-model";
import { getFirebaseDb } from "@/lib/firebase/client";

// Rutas (todo cuelga de weddingPlans/{planId}/style, que cubre una sola regla):
//   style/settings                       paleta y rutina previa de belleza
//   style/rings                          alianzas (un documento)
//   style/data/looks/{id}                vestuario
//   style/data/beauty/{id}               belleza
//   style/data/decor/{id}                decoración y flores
//   style/data/moodboard/{id}            imágenes del moodboard (cada una, su documento)

export type StyleCollection = "looks" | "beauty" | "decor" | "moodboard";

function styleCollection(planId: string, name: StyleCollection) {
  return collection(getFirebaseDb(), "weddingPlans", planId, "style", "data", name);
}

function styleDoc(planId: string, name: StyleCollection, id: string) {
  return doc(getFirebaseDb(), "weddingPlans", planId, "style", "data", name, id);
}

export const looksQuery = (planId: string) => styleCollection(planId, "looks");
export const beautyQuery = (planId: string) => styleCollection(planId, "beauty");
export const decorQuery = (planId: string) => styleCollection(planId, "decor");
export const moodboardQuery = (planId: string) => styleCollection(planId, "moodboard");

export const settingsRef = (planId: string) => doc(getFirebaseDb(), "weddingPlans", planId, "style", "settings");
export const ringsRef = (planId: string) => doc(getFirebaseDb(), "weddingPlans", planId, "style", "rings");

// ---------- Mapeos (tolerantes con documentos incompletos) ----------

function toMillis(value: unknown): number | null {
  return value instanceof Timestamp ? value.toMillis() : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function price(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function mapOutfit(id: string, data: DocumentData): Outfit {
  return {
    id,
    who: isPersonId(data.who) ? data.who : "other",
    personName: text(data.personName),
    outfit: text(data.outfit),
    shop: text(data.shop),
    vendorId: text(data.vendorId),
    vendorName: text(data.vendorName),
    price: price(data.price),
    status: isLookStatus(data.status) ? data.status : "searching",
    accessories: text(data.accessories),
    notes: text(data.notes),
    inBudget: data.inBudget === true,
    createdAt: toMillis(data.createdAt),
  };
}

export function mapBeauty(id: string, data: DocumentData): BeautyItem {
  return {
    id,
    service: isBeautyService(data.service) ? data.service : "other",
    forWho: text(data.forWho),
    provider: text(data.provider),
    vendorId: text(data.vendorId),
    vendorName: text(data.vendorName),
    trialDate: text(data.trialDate),
    trialTime: text(data.trialTime),
    trialPlace: text(data.trialPlace),
    dayTime: text(data.dayTime),
    price: price(data.price),
    status: isLookStatus(data.status) ? data.status : "searching",
    notes: text(data.notes),
    inBudget: data.inBudget === true,
    createdAt: toMillis(data.createdAt),
  };
}

export function mapDecor(id: string, data: DocumentData): DecorItem {
  return {
    id,
    kind: isDecorKind(data.kind) ? data.kind : "other",
    title: text(data.title),
    provider: text(data.provider),
    vendorId: text(data.vendorId),
    vendorName: text(data.vendorName),
    status: isLookStatus(data.status) ? data.status : "searching",
    price: price(data.price),
    notes: text(data.notes),
    inBudget: data.inBudget === true,
    createdAt: toMillis(data.createdAt),
  };
}

export function mapMoodImage(id: string, data: DocumentData): MoodImage {
  return {
    id,
    kind: data.kind === "upload" ? "upload" : "url",
    src: text(data.src),
    label: text(data.label),
    createdAt: toMillis(data.createdAt),
  };
}

export function mapRings(_id: string, data: DocumentData): Rings {
  return {
    model: text(data.model),
    shop: text(data.shop),
    vendorId: text(data.vendorId),
    vendorName: text(data.vendorName),
    sizeA: text(data.sizeA),
    sizeB: text(data.sizeB),
    engravingA: text(data.engravingA),
    engravingB: text(data.engravingB),
    price: price(data.price),
    status: isLookStatus(data.status) ? data.status : EMPTY_RINGS.status,
    pickupDate: text(data.pickupDate),
    notes: text(data.notes),
    inBudget: data.inBudget === true,
  };
}

function mapRoutine(value: unknown): RoutineItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === "object")
    .map((r, i) => ({ id: text(r.id) || `r${i}`, label: text(r.label), done: r.done === true }))
    .filter((r) => r.label.trim() !== "");
}

export function mapSettings(_id: string, data: DocumentData): StyleSettings {
  const palette = Array.isArray(data.palette)
    ? data.palette.filter((c: unknown): c is string => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c))
    : [];
  return { palette, routine: mapRoutine(data.routine) };
}

// ---------- Escritura ----------

const restoredCreatedAt = (createdAt: number | null) =>
  createdAt === null ? serverTimestamp() : Timestamp.fromMillis(createdAt);

export async function addItem(planId: string, name: StyleCollection, data: object): Promise<string> {
  const ref = await addDoc(styleCollection(planId, name), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateItem(planId: string, name: StyleCollection, id: string, data: object) {
  await updateDoc(styleDoc(planId, name, id), { ...data });
}

export async function deleteItem(planId: string, name: StyleCollection, id: string) {
  await deleteDoc(styleDoc(planId, name, id));
}

/** Deshace un borrado: vuelve a crear el documento con su mismo id y fecha de creación. */
export async function restoreItem(
  planId: string,
  name: StyleCollection,
  item: { id: string; createdAt: number | null }
) {
  const { id, createdAt, ...data } = item;
  await setDoc(styleDoc(planId, name, id), { ...data, createdAt: restoredCreatedAt(createdAt) });
}

/** Marca una partida como ya añadida al presupuesto. */
export async function markInBudget(planId: string, name: StyleCollection, id: string) {
  await updateDoc(styleDoc(planId, name, id), { inBudget: true });
}

export async function saveRings(planId: string, rings: Rings) {
  await setDoc(ringsRef(planId), { ...rings }, { merge: true });
}

export async function markRingsInBudget(planId: string) {
  await setDoc(ringsRef(planId), { inBudget: true }, { merge: true });
}

export async function savePalette(planId: string, palette: string[]) {
  await setDoc(settingsRef(planId), { palette }, { merge: true });
}

export async function saveRoutine(planId: string, routine: RoutineItem[]) {
  await setDoc(settingsRef(planId), { routine }, { merge: true });
}
