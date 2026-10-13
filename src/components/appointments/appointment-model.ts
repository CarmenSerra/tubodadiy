import type { TFunction } from "i18next";
import { format } from "date-fns";
import {
  CalendarCheck2Icon,
  ShirtIcon,
  HandshakeIcon,
  UtensilsCrossedIcon,
  LandmarkIcon,
  type LucideIcon,
} from "lucide-react";

import type { Appointment, AppointmentCategory } from "@/lib/firebase/appointments";
import { DEFAULT_LANG, type Lang } from "@/lib/i18n/config";
import { dateFormatter, noDateLabel } from "@/lib/i18n/format";

/** Parámetros del enlace directo: /plan/{id}?citas=1[&tipo=lugar] */
export const APPOINTMENTS_PARAM = "citas";
export const APPOINTMENTS_TYPE_PARAM = "tipo";

interface CategoryInfo {
  icon: LucideIcon;
}

/**
 * Icono de cada tipo. La etiqueta y el título sugerido salen de
 * `tools:appointments.categories.<tipo>.label|suggestedTitle`.
 */
export const CATEGORY_INFO: Record<AppointmentCategory, CategoryInfo> = {
  lugar: { icon: LandmarkIcon },
  vestuario: { icon: ShirtIcon },
  proveedor: { icon: HandshakeIcon },
  degustacion: { icon: UtensilsCrossedIcon },
  otro: { icon: CalendarCheck2Icon },
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

/** «sáb 12 jun» / «Sat 12 Jun» */
export function formatShortDate(date: string, lang: Lang = DEFAULT_LANG): string {
  const d = parseDay(date);
  return d
    ? dateFormatter(lang, { weekday: "short", day: "numeric", month: "short" }).format(d).replace(/\./g, "")
    : noDateLabel(lang);
}

/** «sábado, 12 de junio de 2027» / «Saturday 12 June 2027» */
export function formatLongDate(date: string, lang: Lang = DEFAULT_LANG): string {
  const d = parseDay(date);
  return d
    ? dateFormatter(lang, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d)
    : noDateLabel(lang);
}

export function dayNumber(date: string): string {
  const d = parseDay(date);
  return d ? String(d.getDate()) : "–";
}

export function monthShort(date: string, lang: Lang = DEFAULT_LANG): string {
  const d = parseDay(date);
  return d ? dateFormatter(lang, { month: "short" }).format(d).replace(/\./g, "") : "";
}

/** «Hoy», «Mañana», «En 5 días» (`tools:appointments.relative.*`); null si ya pasó o no hay fecha. */
export function relativeDay(date: string, t: TFunction, today: string = todayKey()): string | null {
  const a = parseDay(date);
  const b = parseDay(today);
  if (!a || !b) return null;
  const days = Math.round((a.getTime() - b.getTime()) / 86400000);
  if (days < 0) return null;
  if (days === 0) return t("appointments.relative.today");
  if (days === 1) return t("appointments.relative.tomorrow");
  return t("appointments.relative.inDays", { count: days });
}

/** «18:30 · Calle Mayor 3» (las partes vacías se omiten). */
export function whenAndWhere(a: Pick<Appointment, "time" | "place">): string {
  return [a.time, a.place.trim()].filter(Boolean).join(" · ");
}
