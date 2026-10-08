"use client";

import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebase/client";
import {
  DEFAULT_SETTINGS,
  SUGGESTED_PACKING,
  isBookingType,
  isPackingGroup,
  type Booking,
  type BookingInput,
  type DayActivity,
  type Destination,
  type DestinationInput,
  type HoneymoonSettings,
  type PackingGroup,
  type PackingItem,
  type TripDay,
  type TripDayInput,
} from "@/lib/honeymoon-model";

// Ruta: weddingPlans/{planId}/honeymoon/…  (las reglas ya permiten a los miembros del plan
// leer y escribir todo lo que cuelga de `honeymoon`).

function toMillis(value: unknown): number | null {
  return value instanceof Timestamp ? value.toMillis() : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

// ---------- Referencias ----------

function honeymoonCollection(planId: string, name: string) {
  return collection(getFirebaseDb(), "weddingPlans", planId, "honeymoon", "data", name);
}

function honeymoonDoc(planId: string, name: string, id: string) {
  return doc(getFirebaseDb(), "weddingPlans", planId, "honeymoon", "data", name, id);
}

/** Documento de ajustes (presupuesto propio y marca de maleta sembrada). */
export function settingsRef(planId: string) {
  return doc(getFirebaseDb(), "weddingPlans", planId, "honeymoon", "settings");
}

export const destinationsQuery = (planId: string) => honeymoonCollection(planId, "destinations");
export const daysQuery = (planId: string) => honeymoonCollection(planId, "days");
export const bookingsQuery = (planId: string) => honeymoonCollection(planId, "bookings");
export const packingQuery = (planId: string) => honeymoonCollection(planId, "packing");

// ---------- Mapeos (tolerantes con documentos incompletos) ----------

export function mapSettings(_id: string, data: DocumentData): HoneymoonSettings {
  const budget = Number(data.budgetTotal);
  return {
    budgetTotal: Number.isFinite(budget) && budget > 0 ? budget : DEFAULT_SETTINGS.budgetTotal,
    packingSeeded: data.packingSeeded === true,
  };
}

export function mapDestination(id: string, data: DocumentData): Destination {
  const price = data.approxPrice;
  return {
    id,
    name: text(data.name),
    country: text(data.country),
    notes: text(data.notes),
    link: text(data.link),
    imageUrl: text(data.imageUrl),
    approxPrice: typeof price === "number" && Number.isFinite(price) ? price : null,
    votes: Array.isArray(data.votes) ? data.votes.filter((v: unknown): v is string => typeof v === "string") : [],
    chosen: data.chosen === true,
    createdAt: toMillis(data.createdAt),
  };
}

function mapActivities(value: unknown): DayActivity[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((a): a is Record<string, unknown> => Boolean(a) && typeof a === "object")
    .map((a, i) => ({
      id: text(a.id) || `a${i}`,
      time: text(a.time),
      text: text(a.text),
    }));
}

export function mapDay(id: string, data: DocumentData): TripDay {
  return {
    id,
    order: typeof data.order === "number" ? data.order : 0,
    date: text(data.date),
    place: text(data.place),
    activities: mapActivities(data.activities),
    createdAt: toMillis(data.createdAt),
  };
}

export function mapBooking(id: string, data: DocumentData): Booking {
  return {
    id,
    type: isBookingType(data.type) ? data.type : "otro",
    name: text(data.name),
    date: text(data.date),
    price: typeof data.price === "number" && Number.isFinite(data.price) ? data.price : 0,
    confirmationCode: text(data.confirmationCode),
    paid: data.paid === true,
    createdAt: toMillis(data.createdAt),
  };
}

export function mapPackingItem(id: string, data: DocumentData): PackingItem {
  return {
    id,
    label: text(data.label),
    group: isPackingGroup(data.group) ? data.group : "Otros",
    checked: data.checked === true,
    note: text(data.note),
    suggested: data.suggested === true,
    order: typeof data.order === "number" ? data.order : 0,
  };
}

// ---------- Ajustes y presupuesto ----------

export async function setHoneymoonBudget(planId: string, budgetTotal: number) {
  await setDoc(settingsRef(planId), { budgetTotal }, { merge: true });
}

// ---------- Destinos ----------

export async function createDestination(planId: string, data: DestinationInput): Promise<string> {
  const ref = await addDoc(destinationsQuery(planId), {
    ...data,
    votes: [],
    chosen: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDestination(planId: string, id: string, data: Partial<DestinationInput>) {
  await updateDoc(honeymoonDoc(planId, "destinations", id), data);
}

export async function deleteDestination(planId: string, id: string) {
  await deleteDoc(honeymoonDoc(planId, "destinations", id));
}

/** Vuelve a crear un destino borrado, con su mismo id y sus votos. */
export async function restoreDestination(planId: string, dest: Destination) {
  const { id, createdAt, ...rest } = dest;
  await setDoc(honeymoonDoc(planId, "destinations", id), {
    ...rest,
    createdAt: createdAt ? Timestamp.fromMillis(createdAt) : serverTimestamp(),
  });
}

/** Añade o quita el voto de un miembro (atómico: varios miembros pueden votar a la vez). */
export async function setDestinationVote(planId: string, id: string, uid: string, voted: boolean) {
  await updateDoc(honeymoonDoc(planId, "destinations", id), {
    votes: voted ? arrayUnion(uid) : arrayRemove(uid),
  });
}

/**
 * Marca un destino como el elegido (y desmarca el anterior) o, con `id = null`, quita la
 * elección. `chosenIds` son los destinos que ahora figuran como elegidos.
 */
export async function setChosenDestination(planId: string, id: string | null, chosenIds: string[]) {
  const batch = writeBatch(getFirebaseDb());
  for (const other of chosenIds) {
    if (other !== id) batch.update(honeymoonDoc(planId, "destinations", other), { chosen: false });
  }
  if (id) batch.update(honeymoonDoc(planId, "destinations", id), { chosen: true });
  await batch.commit();
}

// ---------- Itinerario ----------

export async function createDay(planId: string, data: TripDayInput, order: number): Promise<string> {
  const ref = await addDoc(daysQuery(planId), { ...data, order, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateDay(planId: string, id: string, data: Partial<TripDayInput>) {
  await updateDoc(honeymoonDoc(planId, "days", id), data);
}

export async function deleteDay(planId: string, id: string) {
  await deleteDoc(honeymoonDoc(planId, "days", id));
}

export async function restoreDay(planId: string, day: TripDay) {
  const { id, createdAt, ...rest } = day;
  await setDoc(honeymoonDoc(planId, "days", id), {
    ...rest,
    createdAt: createdAt ? Timestamp.fromMillis(createdAt) : serverTimestamp(),
  });
}

/** Intercambia la posición de dos días (subir / bajar). */
export async function swapDays(planId: string, a: TripDay, b: TripDay) {
  const batch = writeBatch(getFirebaseDb());
  batch.update(honeymoonDoc(planId, "days", a.id), { order: b.order });
  batch.update(honeymoonDoc(planId, "days", b.id), { order: a.order });
  await batch.commit();
}

// ---------- Reservas ----------

export async function createBooking(planId: string, data: BookingInput): Promise<string> {
  const ref = await addDoc(bookingsQuery(planId), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateBooking(planId: string, id: string, data: Partial<BookingInput>) {
  await updateDoc(honeymoonDoc(planId, "bookings", id), data);
}

export async function deleteBooking(planId: string, id: string) {
  await deleteDoc(honeymoonDoc(planId, "bookings", id));
}

export async function restoreBooking(planId: string, booking: Booking) {
  const { id, createdAt, ...rest } = booking;
  await setDoc(honeymoonDoc(planId, "bookings", id), {
    ...rest,
    createdAt: createdAt ? Timestamp.fromMillis(createdAt) : serverTimestamp(),
  });
}

// ---------- Maleta y papeles ----------

/**
 * Siembra la lista sugerida la primera vez. En una transacción para que dos miembros que
 * abren la página a la vez no la dupliquen; los ids de las sugerencias son fijos, así que
 * aun repetida sería idempotente.
 */
export async function ensurePackingSeeded(planId: string) {
  const db = getFirebaseDb();
  const settings = settingsRef(planId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(settings);
    if (snap.exists() && snap.data().packingSeeded === true) return;
    SUGGESTED_PACKING.forEach((item, index) => {
      tx.set(honeymoonDoc(planId, "packing", item.id), {
        label: item.label,
        group: item.group,
        note: item.note ?? "",
        checked: false,
        suggested: true,
        order: (index + 1) * 10,
        createdAt: serverTimestamp(),
      });
    });
    tx.set(settings, { packingSeeded: true }, { merge: true });
  });
}

/** Recupera las sugerencias que se hayan borrado (las que siguen ahí no se tocan). */
export async function restoreSuggestedPacking(planId: string, missingIds: string[]) {
  const batch = writeBatch(getFirebaseDb());
  SUGGESTED_PACKING.forEach((item, index) => {
    if (!missingIds.includes(item.id)) return;
    batch.set(honeymoonDoc(planId, "packing", item.id), {
      label: item.label,
      group: item.group,
      note: item.note ?? "",
      checked: false,
      suggested: true,
      order: (index + 1) * 10,
      createdAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

export async function addPackingItem(planId: string, label: string, group: PackingGroup): Promise<string> {
  const ref = await addDoc(packingQuery(planId), {
    label,
    group,
    note: "",
    checked: false,
    suggested: false,
    // Los artículos propios van detrás de los sugeridos, en orden de creación.
    order: Date.now(),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function setPackingChecked(planId: string, id: string, checked: boolean) {
  await updateDoc(honeymoonDoc(planId, "packing", id), { checked });
}

export async function deletePackingItem(planId: string, id: string) {
  await deleteDoc(honeymoonDoc(planId, "packing", id));
}

export async function restorePackingItem(planId: string, item: PackingItem) {
  const { id, ...rest } = item;
  await setDoc(honeymoonDoc(planId, "packing", id), { ...rest, createdAt: serverTimestamp() });
}
