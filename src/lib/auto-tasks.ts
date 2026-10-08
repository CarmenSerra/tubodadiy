import {
  BUDGET_TASK_TITLE,
  DATE_TASK_TITLE,
  TIMELINE_DRAFT_TASK_TITLE,
  TIMELINE_SHARE_TASK_TITLE,
} from "@/lib/steps";
import type { StepStatus, StepTask, StepTaskAuto } from "@/lib/types";

export const AUTO_TASKS_CATEGORY = "fecha_presupuesto";

/** Qué tareas automáticas hay que (re)evaluar y con qué datos del plan. */
export interface AutoTaskInput {
  /** Si viene definido, se sincroniza la tarea de la fecha. */
  weddingDate?: string | null;
  /** Si viene definido, se sincroniza la tarea del presupuesto. */
  budgetTotal?: number;
  /** `true`: se acaba de crear el primer momento del cronograma. */
  timelineDraft?: boolean;
  /** `true`: se acaba de copiar o imprimir el cronograma. */
  timelineShare?: boolean;
}

const LEGACY_AUTO_BY_TITLE: Record<string, StepTaskAuto> = {
  [DATE_TASK_TITLE]: "date",
  [BUDGET_TASK_TITLE]: "budget",
  [TIMELINE_DRAFT_TASK_TITLE]: "timeline-draft",
  [TIMELINE_SHARE_TASK_TITLE]: "timeline-share",
};

export function isDateSet(weddingDate: string | null | undefined): boolean {
  return Boolean(weddingDate);
}

export function isBudgetSet(budgetTotal: number | null | undefined): boolean {
  return typeof budgetTotal === "number" && budgetTotal > 0;
}

/** Estado inicial de una tarea automática al crear un plan. */
export function initialAutoDone(
  auto: StepTaskAuto,
  plan: { weddingDate: string | null; budgetTotal: number }
): boolean {
  if (auto === "date") return isDateSet(plan.weddingDate);
  if (auto === "budget") return isBudgetSet(plan.budgetTotal);
  return false;
}

/**
 * Aplica los datos del plan a las tareas automáticas de un paso. Los planes
 * anteriores a `auto` no lo tienen: se reconocen por el título original y se
 * les escribe `auto`. Devuelve `changed: false` si no hay nada que guardar.
 *
 * La fecha y el presupuesto se reflejan en los dos sentidos (si se borran, la
 * tarea se desmarca). Las del cronograma son hitos: solo se marcan, nunca se
 * desmarcan solas.
 */
export function syncAutoTasks(
  tasks: StepTask[],
  input: AutoTaskInput
): { tasks: StepTask[]; changed: boolean } {
  let changed = false;
  const next = tasks.map((task) => {
    const auto = task.auto ?? LEGACY_AUTO_BY_TITLE[task.title];
    let done = task.done;
    if (auto === "date" && input.weddingDate !== undefined) done = isDateSet(input.weddingDate);
    if (auto === "budget" && input.budgetTotal !== undefined) done = isBudgetSet(input.budgetTotal);
    if (auto === "timeline-draft" && input.timelineDraft) done = true;
    if (auto === "timeline-share" && input.timelineShare) done = true;
    if (auto === task.auto && done === task.done) return task;
    changed = true;
    return { ...task, auto, done };
  });
  return { tasks: next, changed };
}

/** Un paso pendiente pasa a "en progreso" en cuanto alguna tarea está hecha. */
export function statusAfterTaskSync(status: StepStatus, tasks: StepTask[]): StepStatus {
  return status === "pending" && tasks.some((t) => t.done) ? "in_progress" : status;
}
