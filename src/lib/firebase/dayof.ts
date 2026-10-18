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
  writeBatch,
  type DocumentData,
} from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebase/client";
import {
  SUGGESTED_SHOTS,
  isCeremonyMusicMoment,
  isPlaylistMoment,
  isShotGroup,
  isSongFlag,
  suggestedShotId,
  type CeremonyTrack,
  type DayContact,
  type DayContactInput,
  type DayOfCollection,
  type Reading,
  type Shot,
  type Song,
  type Witness,
} from "@/lib/dayof-model";

// Ruta: weddingPlans/{planId}/dayof/data/<colección>/{id}. Las reglas dejan leer y
// escribir a los miembros del plan todo lo que cuelga de `dayof`.

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toMillis(value: unknown): number | null {
  return value instanceof Timestamp ? value.toMillis() : null;
}

function collectionRef(planId: string, name: DayOfCollection) {
  return collection(getFirebaseDb(), "weddingPlans", planId, "dayof", "data", name);
}

function docRef(planId: string, name: DayOfCollection, id: string) {
  return doc(getFirebaseDb(), "weddingPlans", planId, "dayof", "data", name, id);
}

export const readingsQuery = (planId: string) => collectionRef(planId, "readings");
export const musicQuery = (planId: string) => collectionRef(planId, "music");
export const witnessesQuery = (planId: string) => collectionRef(planId, "witnesses");
export const contactsQuery = (planId: string) => collectionRef(planId, "contacts");
export const shotsQuery = (planId: string) => collectionRef(planId, "shots");
export const songsQuery = (planId: string) => collectionRef(planId, "songs");

/* ---------------------------- Mapeos ----------------------------- */

export function mapReading(id: string, data: DocumentData): Reading {
  return {
    id,
    title: text(data.title),
    text: text(data.text),
    url: text(data.url),
    reader: text(data.reader),
    order: typeof data.order === "number" ? data.order : 0,
    createdAt: toMillis(data.createdAt),
  };
}

export function mapTrack(id: string, data: DocumentData): CeremonyTrack {
  return {
    id,
    moment: isCeremonyMusicMoment(data.moment) ? data.moment : "other",
    song: text(data.song),
    artist: text(data.artist),
    url: text(data.url),
    createdAt: toMillis(data.createdAt),
  };
}

export function mapWitness(id: string, data: DocumentData): Witness {
  return {
    id,
    name: text(data.name),
    phone: text(data.phone),
    forWhom: text(data.forWhom),
    dniDelivered: data.dniDelivered === true,
    createdAt: toMillis(data.createdAt),
  };
}

export function mapContact(id: string, data: DocumentData): DayContact {
  return {
    id,
    name: text(data.name),
    role: text(data.role),
    phone: text(data.phone),
    vendorId: text(data.vendorId),
    createdAt: toMillis(data.createdAt),
  };
}

export function mapShot(id: string, data: DocumentData): Shot {
  return {
    id,
    group: isShotGroup(data.group) ? data.group : "party",
    key: text(data.key),
    label: text(data.label),
    checked: data.checked === true,
    createdAt: toMillis(data.createdAt),
  };
}

export function mapSong(id: string, data: DocumentData): Song {
  return {
    id,
    moment: isPlaylistMoment(data.moment) ? data.moment : "general",
    title: text(data.title),
    artist: text(data.artist),
    url: text(data.url),
    flag: isSongFlag(data.flag) ? data.flag : "normal",
    createdAt: toMillis(data.createdAt),
  };
}

/* ------------------------- Operaciones comunes ------------------------- */

/** Crea un documento y devuelve su id. */
export async function createDayOfItem(
  planId: string,
  name: DayOfCollection,
  data: Record<string, unknown>
): Promise<string> {
  const ref = await addDoc(collectionRef(planId, name), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateDayOfItem(
  planId: string,
  name: DayOfCollection,
  id: string,
  data: Record<string, unknown>
) {
  await updateDoc(docRef(planId, name, id), data);
}

export async function deleteDayOfItem(planId: string, name: DayOfCollection, id: string) {
  await deleteDoc(docRef(planId, name, id));
}

/** Vuelve a crear un documento borrado, con su mismo id y su fecha de creación. */
export async function restoreDayOfItem(
  planId: string,
  name: DayOfCollection,
  item: { id: string; createdAt: number | null }
) {
  const { id, createdAt, ...rest } = item;
  await setDoc(docRef(planId, name, id), {
    ...rest,
    createdAt: createdAt === null ? serverTimestamp() : Timestamp.fromMillis(createdAt),
  });
}

/* ------------------------------ Lecturas ------------------------------ */

/** Intercambia la posición de dos lecturas (subir / bajar). */
export async function swapReadings(planId: string, a: Reading, b: Reading) {
  const batch = writeBatch(getFirebaseDb());
  batch.update(docRef(planId, "readings", a.id), { order: b.order });
  batch.update(docRef(planId, "readings", b.id), { order: a.order });
  await batch.commit();
}

/* ------------------------------- Testigos ------------------------------- */

export async function setDniDelivered(planId: string, id: string, delivered: boolean) {
  await updateDoc(docRef(planId, "witnesses", id), { dniDelivered: delivered });
}

/* ------------------------------- Contactos ------------------------------- */

/** Añade varios contactos de una vez (los copiados de proveedores). */
export async function addContacts(planId: string, contacts: DayContactInput[]) {
  const batch = writeBatch(getFirebaseDb());
  for (const contact of contacts) {
    batch.set(doc(collectionRef(planId, "contacts")), { ...contact, createdAt: serverTimestamp() });
  }
  await batch.commit();
}

/* ------------------------------ Fotos clave ------------------------------ */

export async function setShotChecked(planId: string, id: string, checked: boolean) {
  await updateDoc(docRef(planId, "shots", id), { checked });
}

/**
 * Carga la plantilla sugerida (o recupera las sugeridas que falten). Los ids son fijos, así
 * que repetirlo nunca duplica; las que ya existen no se tocan.
 */
export async function addSuggestedShots(planId: string, presentIds: string[]) {
  const batch = writeBatch(getFirebaseDb());
  const present = new Set(presentIds);
  let count = 0;
  for (const shot of SUGGESTED_SHOTS) {
    const id = suggestedShotId(shot.key);
    if (present.has(id)) continue;
    batch.set(docRef(planId, "shots", id), {
      group: shot.group,
      key: shot.key,
      label: "",
      checked: false,
      createdAt: serverTimestamp(),
    });
    count += 1;
  }
  if (count > 0) await batch.commit();
  return count;
}
