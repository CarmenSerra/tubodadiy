import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarCheck2Icon,
  ShirtIcon,
  HandshakeIcon,
  UtensilsCrossedIcon,
  LandmarkIcon,
  type LucideIcon,
} from "lucide-react";

import type { Appointment, AppointmentCategory } from "@/lib/firebase/appointments";

/** Parámetros del enlace directo: /plan/{id}?citas=1[&tipo=lugar] */
export const APPOINTMENTS_PARAM = "citas";
export const APPOINTMENTS_TYPE_PARAM = "tipo";

interface CategoryInfo {
  /** Etiqueta del tipo (selector y chip). */
  label: string;
  /** Título que se sugiere al crear una cita de este tipo. */
  suggestedTitle: string;
  icon: LucideIcon;
}

export const CATEGORY_INFO: Record<AppointmentCategory, CategoryInfo> = {
  lugar: { label: "Visita de lugar", suggestedTitle: "Visita a un posible lugar", icon: LandmarkIcon },
  vestuario: { label: "Prueba de vestuario", suggestedTitle: "Prueba de vestuario", icon: ShirtIcon },
  proveedor: { label: "Reunión con proveedor", suggestedTitle: "Reunión con proveedor", icon: HandshakeIcon },
  degustacion: { label: "Degustación", suggestedTitle: "Degustación", icon: UtensilsCrossedIcon },
  otro: { label: "Otro", suggestedTitle: "", icon: CalendarCheck2Icon },
};

export function isCategory(value: string | null | undefined): value is AppointmentCategory {
  return !!value && Object.prototype.hasOwnProperty.call(CATEGORY_INFO, value);
}

/** Hoy como `yyyy-MM-dd` (hora local). */
export function todayKey(now: Date = new Date()): string {
  return format(now, "yyyy-MM-dd");
}

/** Orden cronológico: por día, luego por hora (las que no tienen hora, primero). */
function compareAsc(a: Appointment, b: Appointment): number {
  return (
    a.date.localeCompare(b.date) ||
    a.time.localeCompare(b.time) ||
    (a.createdAt ?? 0) - (b.createdAt ?? 0)
  );
}

/**
 * Próximas: sin hacer y de hoy en adelante (la más cercana, primero).
 * Pasadas: el resto, la más reciente primero.
 */
export function groupAppointments(items: Appointment[], today: string = todayKey()) {
  const upcoming = items.filter((a) => !a.done && a.date >= today).sort(compareAsc);
  const past = items.filter((a) => a.done || a.date < today).sort((a, b) => compareAsc(b, a));
  return { upcoming, past };
}

function parseDay(date: string): Date | null {
  const d = new Date(`${date}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** «sáb 12 jun» */
export function formatShortDate(date: string): string {
  const d = parseDay(date);
  return d ? format(d, "EEE d MMM", { locale: es }).replace(/\./g, "") : "Sin fecha";
}

/** «sábado, 12 de junio de 2027» */
export function formatLongDate(date: string): string {
  const d = parseDay(date);
  return d ? format(d, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }) : "Sin fecha";
}

export function dayNumber(date: string): string {
  const d = parseDay(date);
  return d ? String(d.getDate()) : "–";
}

export function monthShort(date: string): string {
  const d = parseDay(date);
  return d ? format(d, "MMM", { locale: es }).replace(/\./g, "") : "";
}

/** «Hoy», «Mañana», «En 5 días»; null si ya pasó o no hay fecha. */
export function relativeDay(date: string, today: string = todayKey()): string | null {
  const a = parseDay(date);
  const b = parseDay(today);
  if (!a || !b) return null;
  const days = Math.round((a.getTime() - b.getTime()) / 86400000);
  if (days < 0) return null;
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  return `En ${days} días`;
}

/** «18:30 · Calle Mayor 3» (las partes vacías se omiten). */
export function whenAndWhere(a: Pick<Appointment, "time" | "place">): string {
  return [a.time, a.place.trim()].filter(Boolean).join(" · ");
}
