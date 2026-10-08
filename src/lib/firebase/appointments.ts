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

import { getFirebaseDb } from "@/lib/firebase/client";

/** Tipo de cita. El id es el que se guarda y el que usan los enlaces a la agenda. */
export type AppointmentCategory = "lugar" | "vestuario" | "proveedor" | "degustacion" | "otro";

export const APPOINTMENT_CATEGORIES: readonly AppointmentCategory[] = [
  "lugar",
  "vestuario",
  "proveedor",
  "degustacion",
  "otro",
];

export interface Appointment {
  id: string;
  title: string;
  category: AppointmentCategory;
  /** Día de la cita, `yyyy-MM-dd`. */
  date: string;
  /** Hora, `HH:mm`; cadena vacía si no se ha fijado. */
  time: string;
  /** Lugar o dirección en texto libre. */
  place: string;
  notes: string;
  /** Proveedor vinculado (solo lectura de la colección `vendors`), o cadena vacía. */
  vendorId: string;
  /** Nombre del proveedor al vincularlo: se muestra si luego se borra. */
  vendorName: string;
  done: boolean;
  createdAt: number | null;
}

export type AppointmentInput = Omit<Appointment, "id" | "createdAt">;

function isCategory(value: unknown): value is AppointmentCategory {
  return (APPOINTMENT_CATEGORIES as readonly unknown[]).includes(value);
}

function toMillis(value: unknown): number | null {
  return value instanceof Timestamp ? value.toMillis() : null;
}

export function mapAppointment(id: string, data: DocumentData): Appointment {
  return {
    id,
    title: data.title ?? "",
    category: isCategory(data.category) ? data.category : "otro",
    date: typeof data.date === "string" ? data.date : "",
    time: typeof data.time === "string" ? data.time : "",
    place: data.place ?? "",
    notes: data.notes ?? "",
    vendorId: data.vendorId ?? "",
    vendorName: data.vendorName ?? "",
    done: Boolean(data.done),
    createdAt: toMillis(data.createdAt),
  };
}

export function appointmentsCollection(planId: string) {
  return collection(getFirebaseDb(), "weddingPlans", planId, "appointments");
}

function appointmentDoc(planId: string, id: string) {
  return doc(getFirebaseDb(), "weddingPlans", planId, "appointments", id);
}

/** Crea una cita y devuelve su id (para poder deshacer la creación). */
export async function createAppointment(planId: string, data: AppointmentInput): Promise<string> {
  const ref = await addDoc(appointmentsCollection(planId), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateAppointment(
  planId: string,
  id: string,
  data: Partial<AppointmentInput>
): Promise<void> {
  await updateDoc(appointmentDoc(planId, id), data);
}

export async function deleteAppointment(planId: string, id: string): Promise<void> {
  await deleteDoc(appointmentDoc(planId, id));
}

/** Vuelve a crear una cita borrada con su mismo id y su fecha de creación original. */
export async function restoreAppointment(planId: string, item: Appointment): Promise<void> {
  const { id, createdAt, ...data } = item;
  await setDoc(appointmentDoc(planId, id), {
    ...data,
    createdAt: createdAt === null ? serverTimestamp() : Timestamp.fromMillis(createdAt),
  });
}
