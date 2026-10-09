import { listCategories } from "@/components/budget/budget-math";
import { canonicalCategory, categoryKey } from "@/components/vendors/vendor-model";
import { baseTaskAuto } from "@/lib/steps";
import type {
  BudgetItem,
  CeremonyType,
  Guest,
  StepStatus,
  StepTask,
  StepTaskAuto,
  Vendor,
} from "@/lib/types";

export const AUTO_TASKS_CATEGORY = "fecha_presupuesto";
export const GUESTS_CATEGORY = "invitados";
export const VENDORS_CATEGORY = "proveedores";
export const CEREMONY_CATEGORY = "ceremonia";
export const LEGAL_DOCS_CATEGORY = "documentos_legales";
export const GIFT_CATEGORY = "lista_regalos";

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
  /** Si viene definido, se sincroniza «Elegir tipo de ceremonia» (en los dos sentidos). */
  ceremonyType?: CeremonyType | null;
  /** Si viene definido, se sincroniza «Reunir documentación» (en los dos sentidos). */
  legalDocsComplete?: boolean;
  /** Si viene definido, se sincroniza «Añadir los datos para el regalo» (en los dos sentidos). */
  giftSet?: boolean;
  /**
   * Tareas cuyo hito se cumple ahora mismo según los datos de una herramienta
   * (invitados, proveedores, gastos). Solo se marcan: nunca se desmarcan solas,
   * para no borrar un tick puesto a mano.
   */
  reached?: StepTaskAuto[];
}

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
 * anteriores a `auto` no lo tienen: se reconocen por el paso y el título
 * original y se les escribe `auto`. Devuelve `changed: false` si no hay nada
 * que guardar.
 *
 * La fecha y el presupuesto se reflejan en los dos sentidos (si se borran, la
 * tarea se desmarca). El resto son hitos: solo se marcan, nunca se desmarcan
 * solas.
 */
export function syncAutoTasks(
  category: string,
  tasks: StepTask[],
  input: AutoTaskInput
): { tasks: StepTask[]; changed: boolean } {
  let changed = false;
  const next = tasks.map((task) => {
    const auto = task.auto ?? baseTaskAuto(category, task.title);
    let done = task.done;
    if (auto === "date" && input.weddingDate !== undefined) done = isDateSet(input.weddingDate);
    if (auto === "budget" && input.budgetTotal !== undefined) done = isBudgetSet(input.budgetTotal);
    if (auto === "ceremony-type" && input.ceremonyType !== undefined) {
      done = input.ceremonyType !== null;
    }
    if (auto === "legal-docs" && input.legalDocsComplete !== undefined) {
      done = input.legalDocsComplete;
    }
    if (auto === "gift-data" && input.giftSet !== undefined) done = input.giftSet;
    if (auto === "timeline-draft" && input.timelineDraft) done = true;
    if (auto === "timeline-share" && input.timelineShare) done = true;
    if (auto && input.reached?.includes(auto)) done = true;
    if (auto === task.auto && done === task.done) return task;
    changed = true;
    return { ...task, auto, done };
  });
  return { tasks: next, changed };
}

/** Hitos de «Lista de invitados» que cumple la lista actual. */
export function guestsReached(guests: Pick<Guest, "rsvpStatus">[]): StepTaskAuto[] {
  const reached: StepTaskAuto[] = [];
  if (guests.length > 0) reached.push("guests-draft");
  if (guests.length > 0 && guests.every((g) => g.rsvpStatus !== "pending")) {
    reached.push("guests-final");
  }
  return reached;
}

/** Categoría de proveedor cuya elección marca cada tarea de «Contratar…». */
const VENDOR_AUTO_CATEGORY: Partial<Record<StepTaskAuto, string>> = {
  "vendor-catering": "Catering",
  "vendor-photo": "Fotógrafo",
  "vendor-music": "Música",
  "vendor-officiant": "Oficiante",
};

/**
 * Tareas de proveedor cumplidas: hay uno «Elegida» (el estado más cercano a
 * contratado) en esa categoría.
 */
export function vendorsReached(vendors: Pick<Vendor, "category" | "status">[]): StepTaskAuto[] {
  const chosen = new Set(
    vendors
      .filter((v) => v.status === "chosen")
      .map((v) => categoryKey(canonicalCategory(v.category)))
  );
  return (Object.keys(VENDOR_AUTO_CATEGORY) as StepTaskAuto[]).filter((auto) =>
    chosen.has(categoryKey(VENDOR_AUTO_CATEGORY[auto]!))
  );
}

/** El presupuesto está repartido cuando hay gastos en 2 o más categorías. */
export function budgetReached(items: BudgetItem[]): StepTaskAuto[] {
  return listCategories(items).length >= 2 ? ["budget-split"] : [];
}

/** Un paso pendiente pasa a "en progreso" en cuanto alguna tarea está hecha. */
export function statusAfterTaskSync(status: StepStatus, tasks: StepTask[]): StepStatus {
  return status === "pending" && tasks.some((t) => t.done) ? "in_progress" : status;
}

/**
 * Estado que le corresponde a un paso con las tareas que tiene AHORA, aunque
 * ninguna haya cambiado. Repara pasos que se quedaron atrás (tareas ya hechas
 * con el estado sin mover): las sincronizaciones lo usan en vez de salir
 * cuando no hay tareas que cambiar.
 */
export function statusForTasks(status: StepStatus, tasks: StepTask[]): StepStatus {
  return statusAfterTasksChange(status, tasks, tasks);
}

/**
 * Estado de un paso tras cambiar sus tareas (marcar, desmarcar, añadir,
 * quitar o sincronizar una automática). El estado se guarda en Firestore y es
 * lo que leen las fases, el progreso y la home, así que tiene que moverse con
 * las tareas:
 *  - todas hechas (y hay alguna): completado;
 *  - estaba completo por tenerlas todas y ya no: vuelve a "en progreso" (o a
 *    "pendiente" si no queda ninguna hecha);
 *  - pendiente con alguna hecha: en progreso.
 * Un paso omitido no se toca. Un paso completado a mano (con tareas sin hacer)
 * tampoco se revierte al marcar una tarea: solo al pasar de "todas" a "no todas".
 */
export function statusAfterTasksChange(
  status: StepStatus,
  before: StepTask[],
  after: StepTask[]
): StepStatus {
  if (status === "skipped") return status;
  const allDone = (tasks: StepTask[]) => tasks.length > 0 && tasks.every((t) => t.done);
  if (allDone(after)) return "completed";
  if (status === "completed" && allDone(before)) {
    return after.some((t) => t.done) ? "in_progress" : "pending";
  }
  return statusAfterTaskSync(status, after);
}
