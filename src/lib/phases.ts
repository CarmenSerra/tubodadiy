import type { PlanStep } from "@/lib/types";

/**
 * Fases del plan: agrupan los pasos del checklist siguiendo una línea de
 * tiempo realista de una boda en España. Todo se deriva del estado y la
 * categoría de cada paso, sin tocar el esquema de Firestore.
 *
 * Reglas:
 *  - La fase 1 siempre está abierta.
 *  - La fase N+1 se abre cuando la fase N está completa (todos sus pasos
 *    completados u omitidos).
 *  - Un paso con avance propio (en progreso, completado o con alguna tarea
 *    hecha) se muestra siempre, aunque su fase siga cerrada.
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
  unlocked: boolean;
  /** Primera fase sin completar: donde toca trabajar ahora. */
  current: boolean;
  /** Pasos que se muestran aunque la fase esté cerrada (tienen avance propio). */
  visibleSteps: PlanStep[];
  /** Pasos que solo se ven como vista previa difuminada mientras esté cerrada. */
  previewSteps: PlanStep[];
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

export function computePhases(steps: PlanStep[]): PhasesSummary {
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
  let previousComplete = true; // la primera fase con pasos siempre está abierta

  PHASES.forEach((def, i) => {
    const bucket = buckets[i];
    if (bucket.length === 0) return;
    const ordered = [...bucket].sort(
      (a, b) => rank(def, a) - rank(def, b) || a.sortOrder - b.sortOrder
    );
    const done = ordered.filter(isStepDone).length;
    const complete = done === ordered.length;
    const unlocked = previousComplete;
    previousComplete = complete;
    const visibleSteps = unlocked ? ordered : ordered.filter(hasStepProgress);
    phases.push({
      ...def,
      index: phases.length,
      steps: ordered,
      total: ordered.length,
      done,
      complete,
      unlocked,
      current: false,
      visibleSteps,
      previewSteps: ordered.filter((s) => !visibleSteps.includes(s)),
    });
  });

  const currentIndex = phases.findIndex((p) => !p.complete);
  if (currentIndex !== -1) phases[currentIndex].current = true;

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
