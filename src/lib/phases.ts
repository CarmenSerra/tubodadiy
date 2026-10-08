import type { PlanStep } from "@/lib/types";

/**
 * Fases del plan: agrupan los pasos del checklist siguiendo una línea de
 * tiempo realista de una boda en España. Todo se deriva del estado y la
 * categoría de cada paso, sin tocar el esquema de Firestore.
 *
 * Las fases ORDENAN y RECOMIENDAN. Las posteriores a la actual se muestran
 * "bloqueadas" (difuminadas) hasta que alguien del plan las desbloquea con un
 * clic: es una invitación a no adelantarse, no una restricción. Reglas:
 *  - La fase actual (`current`) es la primera sin completar: es la que se
 *    recomienda y se preselecciona.
 *  - Una fase está completa cuando todos sus pasos están completados u
 *    omitidos.
 *  - "tareas_generales" no pertenece a ninguna fase: siempre está a mano.
 *  - Una categoría desconocida cae en la última fase.
 */

export type PhaseId = "esencial" | "equipo" | "detalles" | "recta_final";

export interface PhaseDefinition {
  id: PhaseId;
  name: string;
  /** Una línea que explica por qué estos pasos van juntos. */
  blurb: string;
  /** Categorías de la fase, en el orden en que conviene abordarlas. */
  categories: string[];
}

export const PHASES: PhaseDefinition[] = [
  {
    id: "esencial",
    name: "Lo esencial",
    blurb: "Fecha, invitados y lugar: la base de todo lo demás.",
    categories: ["fecha_presupuesto", "invitados", "lugar"],
  },
  {
    id: "equipo",
    name: "Tu equipo",
    blurb: "Las personas y los trámites que necesitan más tiempo.",
    categories: ["proveedores", "ceremonia", "documentos_legales"],
  },
  {
    id: "detalles",
    name: "Los detalles",
    blurb: "Vestuario, papelería, alojamiento y regalos.",
    categories: ["vestuario", "papeleria", "alojamiento_transporte", "lista_regalos"],
  },
  {
    id: "recta_final",
    name: "Recta final",
    blurb: "Cronograma y luna de miel, para llegar con calma.",
    categories: ["timeline", "luna_de_miel"],
  },
];

/** Categoría sin fase: siempre disponible ("Siempre a mano"). */
export const ALWAYS_AVAILABLE_CATEGORY = "tareas_generales";

export function isAlwaysAvailable(category: string): boolean {
  return category === ALWAYS_AVAILABLE_CATEGORY;
}

/** Posición (0-based) de la fase de una categoría; las desconocidas van a la última. */
export function phaseIndexOf(category: string): number {
  const index = PHASES.findIndex((p) => p.categories.includes(category));
  return index === -1 ? PHASES.length - 1 : index;
}

/** Fase de una categoría; null para la que no tiene fase (tareas generales). */
export function phaseOf(category: string): PhaseDefinition | null {
  if (isAlwaysAvailable(category)) return null;
  return PHASES[phaseIndexOf(category)];
}

/** Completado u omitido: omitir es una decisión, no una deuda. */
export function isStepDone(step: PlanStep): boolean {
  return step.status === "completed" || step.status === "skipped";
}

/**
 * Progreso global del plan (0-100), calculado en cliente con los pasos en vivo.
 * Cada paso aplicable (no omitido) pesa lo mismo: uno completado vale 1 y el
 * resto, la fracción de sus tareas hechas. Así sube al marcar cada tarea y
 * llega a 100 solo cuando todos los pasos están completados.
 */
export function planProgress(steps: PlanStep[]): number {
  const applicable = steps.filter((s) => s.status !== "skipped");
  if (applicable.length === 0) return 0;
  const sum = applicable.reduce((acc, s) => {
    if (s.status === "completed") return acc + 1;
    return acc + (s.tasks.length > 0 ? s.tasks.filter((t) => t.done).length / s.tasks.length : 0);
  }, 0);
  return Math.round((sum / applicable.length) * 100);
}

/** El paso ya tiene trabajo propio: nunca se oculta. */
export function hasStepProgress(step: PlanStep): boolean {
  return (
    step.status === "in_progress" || step.status === "completed" || step.tasks.some((t) => t.done)
  );
}

export interface PhaseState extends PhaseDefinition {
  /** Posición entre las fases con pasos (0-based). */
  index: number;
  steps: PlanStep[];
  total: number;
  /** Pasos completados u omitidos. */
  done: number;
  complete: boolean;
  /**
   * Posterior a la actual y aún sin desbloquear: se ve difuminada. Nunca lo
   * están la fase actual, las completas, las que el plan ya desbloqueó ni las
   * que ya tienen trabajo (planes anteriores a esta función). Precedencia:
   * bloqueo explícito > desbloqueo explícito > progreso.
   */
  locked: boolean;
  /** Se puede bloquear/desbloquear a mano: posterior a la actual y sin completar. */
  lockable: boolean;
  /** Primera fase sin completar: donde toca trabajar ahora. */
  current: boolean;
}

export interface PhasesSummary {
  /** Solo las fases que tienen pasos, en orden. */
  phases: PhaseState[];
  /** Pasos de "tareas_generales" (siempre disponibles). */
  general: PlanStep[];
  /** Índice de la fase actual en `phases`; -1 si todas están completas. */
  currentIndex: number;
  current: PhaseState | null;
}

export function computePhases(
  steps: PlanStep[],
  unlockedPhaseIds: readonly string[] = [],
  lockedPhaseIds: readonly string[] = []
): PhasesSummary {
  const buckets: PlanStep[][] = PHASES.map(() => []);
  const general: PlanStep[] = [];

  for (const step of steps) {
    if (isAlwaysAvailable(step.category)) general.push(step);
    else buckets[phaseIndexOf(step.category)].push(step);
  }

  // Dentro de cada fase: orden de la fase y, para igualdad (o categorías
  // desconocidas), el orden original del checklist.
  const rank = (phase: PhaseDefinition, step: PlanStep) => {
    const i = phase.categories.indexOf(step.category);
    return i === -1 ? phase.categories.length : i;
  };

  const phases: PhaseState[] = [];
  PHASES.forEach((def, i) => {
    const bucket = buckets[i];
    if (bucket.length === 0) return;
    const ordered = [...bucket].sort(
      (a, b) => rank(def, a) - rank(def, b) || a.sortOrder - b.sortOrder
    );
    const done = ordered.filter(isStepDone).length;
    const complete = done === ordered.length;
    phases.push({
      ...def,
      index: phases.length,
      steps: ordered,
      total: ordered.length,
      done,
      complete,
      locked: false,
      lockable: false,
      current: false,
    });
  });

  const currentIndex = phases.findIndex((p) => !p.complete);
  if (currentIndex !== -1) {
    phases[currentIndex].current = true;
    for (const phase of phases) {
      phase.lockable = phase.index > currentIndex && !phase.complete;
      phase.locked =
        phase.lockable &&
        (lockedPhaseIds.includes(phase.id) ||
          (!unlockedPhaseIds.includes(phase.id) && !phase.steps.some(hasStepProgress)));
    }
  }

  return {
    phases,
    general,
    currentIndex,
    current: currentIndex === -1 ? null : phases[currentIndex],
  };
}

/**
 * The one step we recommend working on now: an in-progress step of the
 * current phase, else its first pending step; if the current phase has
 * nothing left, any in-progress step elsewhere. Null when all is done.
 */
export function recommendedStep(steps: PlanStep[]): PlanStep | null {
  const { current, phases, general } = computePhases(steps);
  if (current) {
    const inPhase = current.steps.find((s) => s.status === "in_progress")
      ?? current.steps.find((s) => s.status === "pending");
    if (inPhase) return inPhase;
  }
  const all = [...phases.flatMap((p) => p.steps), ...general];
  return all.find((s) => s.status === "in_progress") ?? null;
}
