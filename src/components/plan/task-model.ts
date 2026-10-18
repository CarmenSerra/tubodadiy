// Detalles de una tarea del plan (responsable, fecha límite, estado y notas) y
// lo que se deriva de ellos (tareas con fecha, recordatorios). Todo puro: sin
// React ni Firebase, para poder usarlo desde el plan, el dashboard y el
// calendario unificado. Las tareas guardadas antes de estos campos no los
// tienen y se leen como «sin responsable, sin fecha, pendiente».

import { displayTaskTitle, type StepTranslate } from "@/lib/steps";
import type { PlanStep, StepTask } from "@/lib/types";

/** `done` sigue mandando (la casilla); «en curso» es un paso intermedio. */
export type TaskStatus = "pending" | "in_progress" | "done";

export const TASK_STATUSES: readonly TaskStatus[] = ["pending", "in_progress", "done"];

export function taskStatus(task: Pick<StepTask, "done" | "inProgress">): TaskStatus {
  if (task.done) return "done";
  return task.inProgress ? "in_progress" : "pending";
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha `yyyy-MM-dd` válida o `null` (descarta valores raros guardados). */
export function taskDateOrNull(value: unknown): string | null {
  if (typeof value !== "string" || !DATE_RE.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : value;
}

/** Los campos editables de una tarea, tal como los maneja el formulario. */
export interface TaskDetails {
  status: TaskStatus;
  /** `yyyy-MM-dd` o "" (sin fecha). */
  dueDate: string;
  /** Texto del responsable o "" (sin responsable). */
  assignee: string;
  /** `userId` si el responsable es un miembro del plan; `null` si es texto libre. */
  assigneeId: string | null;
  notes: string;
}

export function taskDetailsOf(task: StepTask): TaskDetails {
  const assignee = (task.assignee ?? "").trim();
  return {
    status: taskStatus(task),
    dueDate: taskDateOrNull(task.dueDate) ?? "",
    assignee,
    assigneeId: assignee && task.assigneeId ? task.assigneeId : null,
    notes: task.notes ?? "",
  };
}

/** ¿Tiene algo que enseñar en la fila (responsable, fecha, «en curso» o notas)? */
export function hasTaskDetails(task: StepTask): boolean {
  const d = taskDetailsOf(task);
  return Boolean(d.assignee || d.dueDate || d.notes.trim() || d.status === "in_progress");
}

/**
 * Devuelve la lista de tareas con los detalles de una aplicados. Los campos
 * vacíos se quitan (Firestore no admite `undefined`) y el resto de tareas y de
 * campos —`auto` incluido— se conserva tal cual.
 */
export function applyTaskDetails(tasks: StepTask[], taskId: string, details: TaskDetails): StepTask[] {
  return tasks.map((task) => {
    if (task.id !== taskId) return task;
    const next: StepTask = { ...task, done: details.status === "done" };
    delete next.inProgress;
    delete next.dueDate;
    delete next.notes;
    delete next.assignee;
    delete next.assigneeId;
    if (details.status === "in_progress") next.inProgress = true;
    const dueDate = taskDateOrNull(details.dueDate);
    if (dueDate) next.dueDate = dueDate;
    const notes = details.notes.trim();
    if (notes) next.notes = notes;
    const assignee = details.assignee.trim();
    if (assignee) {
      next.assignee = assignee;
      if (details.assigneeId) next.assigneeId = details.assigneeId;
    }
    return next;
  });
}

/** Texto del responsable para mostrar: «Tú» si es la persona que mira. */
export function assigneeLabel(
  task: { assignee?: string | null; assigneeId?: string | null },
  currentUserId: string | null | undefined,
  youLabel: string
): string | null {
  const name = (task.assignee ?? "").trim();
  if (!name) return null;
  return task.assigneeId && task.assigneeId === currentUserId ? youLabel : name;
}

// ---- Tareas con fecha (calendario, recordatorios) ----

/** Ruta de la tarjeta de una tarea: abre su fase y despliega el paso (`#step-{id}`). */
export function taskHref(planId: string, stepId: string): string {
  return `/plan/${planId}#step-${encodeURIComponent(stepId)}`;
}

/** Una tarea del plan que tiene fecha límite. */
export interface PlanTaskWithDate {
  /** Id de la tarea (único dentro de su paso; usa `stepId` + `id` como clave global). */
  id: string;
  stepId: string;
  /** Categoría del paso (p. ej. `lugar`). */
  category: string;
  /** Título para mostrar (traducido si hay `t`; tareas propias, tal cual). */
  title: string;
  /** `yyyy-MM-dd`, siempre válida. */
  date: string;
  done: boolean;
  status: TaskStatus;
  /** Texto del responsable («Mamá», nombre o correo del miembro) o `null`. */
  assignee: string | null;
  /** `userId` si el responsable es un miembro del plan; si no, `null`. */
  assigneeId: string | null;
  /** Ruta relativa a la tarjeta (`/plan/{planId}#step-{stepId}`); antepón el origen si hace falta absoluta. */
  url: string;
}

export interface PlanTasksWithDatesOptions {
  /** `t` de i18next para traducir los títulos de las tareas base. Sin ella, el título guardado. */
  t?: StepTranslate;
  /** Incluir las tareas hechas (por defecto `true`; un calendario las querrá, un aviso no). */
  includeDone?: boolean;
}

/**
 * Tareas del plan con fecha límite, ordenadas por fecha (y luego por paso y
 * título). Las tareas sin fecha, o con una fecha no válida, se omiten.
 */
export function planTasksWithDates(
  planId: string,
  steps: readonly PlanStep[],
  options: PlanTasksWithDatesOptions = {}
): PlanTaskWithDate[] {
  const { t, includeDone = true } = options;
  const rows: { item: PlanTaskWithDate; order: number }[] = [];
  for (const step of steps) {
    for (const task of step.tasks) {
      const date = taskDateOrNull(task.dueDate);
      if (!date || (!includeDone && task.done)) continue;
      const details = taskDetailsOf(task);
      rows.push({
        order: step.sortOrder,
        item: {
          id: task.id,
          stepId: step.id,
          category: step.category,
          title: t ? displayTaskTitle(step.category, task, t) : task.title,
          date,
          done: task.done,
          status: details.status,
          assignee: details.assignee || null,
          assigneeId: details.assigneeId,
          url: taskHref(planId, step.id),
        },
      });
    }
  }
  rows.sort(
    (a, b) =>
      a.item.date.localeCompare(b.item.date) ||
      a.order - b.order ||
      a.item.title.localeCompare(b.item.title)
  );
  return rows.map((r) => r.item);
}

// ---- Recordatorios ----

/** Días de margen de «Próximas tareas». */
export const UPCOMING_WINDOW_DAYS = 14;

export type TaskWithDays = PlanTaskWithDate & {
  /** Días hasta la fecha: 0 hoy, 1 mañana, negativo si ya pasó. */
  days: number;
};

/** Días (de calendario) desde `now` hasta `date`; negativo si ya pasó. */
export function daysFrom(date: string, now: Date = new Date()): number {
  const target = new Date(`${date}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/**
 * Tareas sin hacer que vencen dentro de `windowDays` (hoy incluido) y las que
 * ya han pasado de fecha. Las próximas van de la más cercana a la más lejana;
 * las atrasadas, de la más antigua a la más reciente.
 */
export function taskReminders(
  tasks: readonly PlanTaskWithDate[],
  now: Date = new Date(),
  windowDays: number = UPCOMING_WINDOW_DAYS
): { upcoming: TaskWithDays[]; overdue: TaskWithDays[] } {
  const pending = tasks
    .filter((task) => !task.done)
    .map((task): TaskWithDays => ({ ...task, days: daysFrom(task.date, now) }));
  return {
    upcoming: pending.filter((t) => t.days >= 0 && t.days <= windowDays).sort((a, b) => a.days - b.days),
    overdue: pending.filter((t) => t.days < 0).sort((a, b) => a.days - b.days),
  };
}
