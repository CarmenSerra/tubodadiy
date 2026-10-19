// Modelo puro del calendario unificado: junta citas, tareas con fecha, plazos de
// pago sin pagar y el día de la boda en una sola lista de eventos, y ofrece lo
// que necesitan la vista de mes, la lista «Próximos», el .ics y los avisos.
// Sin React ni Firebase (solo los tipos), para poder usarlo desde cualquier sitio.

import {
  CalendarCheck2Icon,
  HeartIcon,
  ListChecksIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";

import { itemInstallments } from "@/components/budget/budget-math";
import { planTasksWithDates, taskDateOrNull } from "@/components/plan/task-model";
import type { Appointment } from "@/lib/firebase/appointments";
import type { IcsEvent } from "@/lib/export/ics";
import { DEFAULT_LANG, type Lang } from "@/lib/i18n/config";
import { formatMoney } from "@/lib/i18n/format";
import { getServerT } from "@/lib/i18n/server";
import type { BudgetItem, PlanStep } from "@/lib/types";

export const EVENT_TYPES = ["wedding", "appointment", "task", "payment"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface CalendarEvent {
  /** Identificador estable (sirve de clave y de UID del .ics). */
  uid: string;
  type: EventType;
  title: string;
  /** `yyyy-MM-dd`. */
  date: string;
  /** `HH:mm` o null (día completo). */
  time: string | null;
  /** Línea corta bajo el título: hora y lugar, responsable o importe. */
  detail: string;
  place: string;
  notes: string;
  /** Tarea hecha o cita marcada como hecha. */
  done: boolean;
  /** Ruta relativa a su sitio en la app. */
  href: string;
}

/** Icono y colores de cada tipo (el color nunca es lo único que lo distingue: lleva icono y etiqueta). */
export const TYPE_META: Record<EventType, { icon: LucideIcon; chip: string; dot: string }> = {
  wedding: { icon: HeartIcon, chip: "bg-cta text-on-cta", dot: "bg-cta" },
  appointment: { icon: CalendarCheck2Icon, chip: "bg-lilac-mid text-ink-on-tint", dot: "bg-lilac" },
  task: { icon: ListChecksIcon, chip: "bg-sage-pale text-ink", dot: "bg-sage" },
  payment: { icon: WalletIcon, chip: "border border-line-strong bg-raised text-ink", dot: "bg-ink-muted" },
};

const TYPE_ORDER: Record<EventType, number> = { wedding: 0, appointment: 1, payment: 2, task: 3 };

export interface BuildEventsInput {
  planId: string;
  planTitle: string;
  weddingDate: string | null;
  steps: readonly PlanStep[];
  appointments: readonly Appointment[];
  budgetItems: readonly BudgetItem[];
  lang?: Lang;
}

const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

function compareEvents(a: CalendarEvent, b: CalendarEvent): number {
  return (
    a.date.localeCompare(b.date) ||
    (a.time ?? "").localeCompare(b.time ?? "") ||
    TYPE_ORDER[a.type] - TYPE_ORDER[b.type] ||
    a.title.localeCompare(b.title)
  );
}

/** Todos los eventos del plan, en orden cronológico. */
export function buildCalendarEvents(input: BuildEventsInput): CalendarEvent[] {
  const lang = input.lang ?? DEFAULT_LANG;
  const t = getServerT(lang, "calendar");
  const tTools = getServerT(lang, "tools");
  const { planId } = input;
  const events: CalendarEvent[] = [];

  const weddingDate = taskDateOrNull(input.weddingDate);
  if (weddingDate) {
    events.push({
      uid: `wedding-${planId}`,
      type: "wedding",
      title: t("types.wedding.title"),
      date: weddingDate,
      time: null,
      detail: input.planTitle.trim(),
      place: "",
      notes: "",
      done: false,
      href: `/plan/${planId}`,
    });
  }

  for (const a of input.appointments) {
    const date = taskDateOrNull(a.date);
    if (!date) continue;
    const time = TIME_RE.test(a.time) ? a.time.padStart(5, "0") : null;
    const place = a.place.trim();
    const title = a.title.trim() || tTools(`appointments.categories.${a.category}.label`);
    events.push({
      uid: `appointment-${planId}-${a.id}`,
      type: "appointment",
      title,
      date,
      time,
      detail: [time, place].filter(Boolean).join(" · "),
      place,
      notes: [a.vendorName.trim(), a.notes.trim()].filter(Boolean).join("\n"),
      done: a.done,
      href: `/plan/${planId}?citas=1`,
    });
  }

  for (const task of planTasksWithDates(planId, [...input.steps], { t })) {
    events.push({
      uid: `task-${planId}-${task.stepId}-${task.id}`,
      type: "task",
      title: task.title,
      date: task.date,
      time: null,
      detail: task.assignee ? t("types.task.assignee", { name: task.assignee }) : "",
      place: "",
      notes: "",
      done: task.done,
      href: task.url,
    });
  }

  for (const item of input.budgetItems) {
    const installments = itemInstallments(item);
    installments.forEach((p, index) => {
      const date = taskDateOrNull(p.dueDate);
      if (p.paid || !date) return;
      const parts = [formatMoney(p.amount, lang)];
      if (installments.length > 1) parts.push(t("types.payment.installment", { n: index + 1, total: installments.length }));
      events.push({
        uid: `payment-${planId}-${item.id}-${p.id}`,
        type: "payment",
        title: t("types.payment.title", { concept: item.concept }),
        date,
        time: null,
        detail: parts.join(" · "),
        place: "",
        notes: "",
        done: false,
        href: `/plan/${planId}/budget`,
      });
    });
  }

  return events.sort(compareEvents);
}

// ---- Filtros y agrupado ----

export function filterByTypes(events: readonly CalendarEvent[], types: ReadonlySet<EventType>): CalendarEvent[] {
  return events.filter((e) => types.has(e.type));
}

export function groupByDate(events: readonly CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const list = map.get(e.date);
    if (list) list.push(e);
    else map.set(e.date, [e]);
  }
  return map;
}

export function countByType(events: readonly CalendarEvent[]): Record<EventType, number> {
  const counts: Record<EventType, number> = { wedding: 0, appointment: 0, task: 0, payment: 0 };
  for (const e of events) counts[e.type] += 1;
  return counts;
}

/** Eventos por venir (hoy incluido) que aún no están hechos. */
export function upcomingEvents(events: readonly CalendarEvent[], today: string): CalendarEvent[] {
  return events.filter((e) => e.date >= today && !e.done);
}

// ---- Fechas ----

const pad = (n: number) => String(n).padStart(2, "0");

/** `yyyy-MM-dd` de una fecha local. */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(now: Date = new Date()): string {
  return dateKey(now);
}

/** Primer día (local) del mes de un `yyyy-MM-dd`. */
export function monthStartOf(date: string): Date {
  const [y, m] = date.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

export interface MonthCell {
  date: string;
  /** Día del mes (1-31). */
  day: number;
  inMonth: boolean;
}

/** Semanas del mes (lunes a domingo), con los días de los meses vecinos que completan la cuadrícula. */
export function monthWeeks(monthStart: Date): MonthCell[][] {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weekCount = Math.ceil((offset + daysInMonth) / 7);
  const weeks: MonthCell[][] = [];
  for (let w = 0; w < weekCount; w++) {
    const week: MonthCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(year, month, 1 - offset + w * 7 + d);
      week.push({ date: dateKey(date), day: date.getDate(), inMonth: date.getMonth() === month });
    }
    weeks.push(week);
  }
  return weeks;
}

/** Días desde `from` hasta `to` (ambos `yyyy-MM-dd`); negativo si `to` es anterior. */
export function dayDiff(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00`).getTime();
  const b = new Date(`${to}T00:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

// ---- iCal ----

export interface IcsBuildOptions {
  lang?: Lang;
  /** Origen de la app (`https://…`) para los enlaces absolutos. */
  origin?: string;
}

/**
 * Eventos del calendario en formato iCal. Las citas con hora llevan hora; el resto
 * son de día completo. Las tareas hechas y las citas hechas no se exportan.
 */
export function toIcsEvents(events: readonly CalendarEvent[], options: IcsBuildOptions = {}): IcsEvent[] {
  const lang = options.lang ?? DEFAULT_LANG;
  const t = getServerT(lang, "calendar");
  const origin = (options.origin ?? "").replace(/\/+$/, "");
  return events
    .filter((e) => !e.done)
    .map((e) => ({
      uid: e.uid,
      title: e.title,
      date: e.date,
      time: e.time,
      // En las citas el detalle es la hora y el lugar, que ya van en sus propios campos.
      description: [t(`types.${e.type}.label`), e.type === "appointment" ? "" : e.detail, e.notes]
        .map((s) => s.trim())
        .filter(Boolean)
        .join("\n"),
      location: e.place,
      url: origin ? `${origin}${e.href}` : undefined,
      categories: [t(`types.${e.type}.label`)],
    }));
}

// ---- Avisos (hoy y mañana) ----

export interface DueEvent {
  event: CalendarEvent;
  /** 0 = hoy, 1 = mañana. */
  days: 0 | 1;
}

/** Eventos de hoy y de mañana que no están hechos (la boda incluida). */
export function dueSoon(events: readonly CalendarEvent[], now: Date = new Date()): DueEvent[] {
  const today = todayKey(now);
  const out: DueEvent[] = [];
  for (const event of events) {
    if (event.done) continue;
    const diff = dayDiff(today, event.date);
    if (diff === 0 || diff === 1) out.push({ event, days: diff });
  }
  return out.sort((a, b) => a.days - b.days || (a.event.time ?? "").localeCompare(b.event.time ?? ""));
}

/** Título y cuerpo del aviso del navegador. */
export function dueNotificationText(due: readonly DueEvent[], lang: Lang = DEFAULT_LANG): { title: string; body: string } {
  const t = getServerT(lang, "calendar");
  const when = ({ event, days }: DueEvent) => {
    if (event.time) return t(days === 0 ? "notify.when.todayAt" : "notify.when.tomorrowAt", { time: event.time });
    return t(days === 0 ? "notify.when.today" : "notify.when.tomorrow");
  };
  const lines = due.slice(0, 3).map((d) => t("notify.line", { title: d.event.title, when: when(d) }));
  if (due.length > 3) lines.push(t("notify.more", { count: due.length - 3 }));
  return { title: t("notify.title", { count: due.length }), body: lines.join("\n") };
}
