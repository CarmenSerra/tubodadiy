import { daysUntil } from "@/lib/utils";
import type {
  BudgetItem,
  Guest,
  PlanMember,
  PlanStep,
  Vendor,
  WeddingPlan,
} from "@/lib/types";

/**
 * Datos de la boda destacada. Se pasan como props simples para que la home
 * sea presentacional (y se pueda pintar con datos de ejemplo).
 */
export interface FeaturedPlanData {
  steps: PlanStep[];
  guests: Guest[];
  vendors: Vendor[];
  budgetItems: BudgetItem[];
  members: PlanMember[];
  /** Alguna de las suscripciones sigue esperando su primer snapshot. */
  loading: boolean;
  /** Alguna de las suscripciones ha fallado. */
  error: boolean;
}

/**
 * Ordena los planes por relevancia para la home:
 *  1. próximos (fecha de hoy o futura), el más cercano primero;
 *  2. sin fecha, el más reciente primero;
 *  3. con fecha ya pasada, el más reciente primero.
 * El primero es el plan destacado; el resto van a "Tus otros planes".
 */
export function rankPlans(plans: WeddingPlan[]): WeddingPlan[] {
  const bucket = (plan: WeddingPlan): number => {
    const days = daysUntil(plan.weddingDate);
    if (days === null) return 1;
    return days >= 0 ? 0 : 2;
  };
  return [...plans].sort((a, b) => {
    const ba = bucket(a);
    const bb = bucket(b);
    if (ba !== bb) return ba - bb;
    if (ba === 0) return (daysUntil(a.weddingDate) ?? 0) - (daysUntil(b.weddingDate) ?? 0);
    if (ba === 2) return (daysUntil(b.weddingDate) ?? 0) - (daysUntil(a.weddingDate) ?? 0);
    return (b.createdAt ?? 0) - (a.createdAt ?? 0);
  });
}

export function splitPlans(plans: WeddingPlan[]): {
  featured: WeddingPlan | null;
  others: WeddingPlan[];
} {
  const ranked = rankPlans(plans);
  return { featured: ranked[0] ?? null, others: ranked.slice(1) };
}

/** Primer nombre para el saludo; null si no hay nombre fiable. */
export function firstName(displayName: string | null | undefined): string | null {
  const name = displayName?.trim().split(/\s+/)[0];
  return name ? name : null;
}

export function computeProgress(steps: PlanStep[]) {
  const completed = steps.filter((s) => s.status === "completed").length;
  const skipped = steps.filter((s) => s.status === "skipped").length;
  const applicable = steps.length - skipped;
  const percent = applicable > 0 ? Math.round((completed / applicable) * 100) : 0;
  const tasks = steps.filter((s) => s.status !== "skipped").flatMap((s) => s.tasks);
  return {
    completed,
    applicable,
    percent,
    tasksDone: tasks.filter((t) => t.done).length,
    tasksTotal: tasks.length,
  };
}

/** Frase de ánimo según el avance; siempre amable, nunca de reproche. */
export function progressMessage(percent: number, applicable: number): string {
  if (applicable === 0) return "Cuando añadas secciones, aquí verás cómo avanzas.";
  if (percent >= 100) return "¡Todo listo! Has completado todas las secciones.";
  if (percent >= 75) return "Recta final: ya casi lo tienes todo atado.";
  if (percent >= 40) return "Vas a muy buen ritmo. Sigue a tu manera.";
  if (percent > 0) return "Buen comienzo: cada paso cuenta.";
  return "Todo por hacer, y ese es un gran punto de partida.";
}

/**
 * Siguientes pasos: primero lo que ya está en marcha, luego lo pendiente, en
 * el orden natural del checklist. Las secciones completadas y omitidas no
 * aparecen (omitir es una decisión, no una deuda).
 */
export function pickNextSteps(steps: PlanStep[], limit = 4): PlanStep[] {
  const open = steps.filter((s) => s.status === "in_progress" || s.status === "pending");
  const inProgress = open.filter((s) => s.status === "in_progress");
  const pending = open.filter((s) => s.status === "pending");
  return [...inProgress, ...pending].slice(0, limit);
}

export function summarizeBudget(plan: WeddingPlan, items: BudgetItem[]) {
  const estimated = items.reduce((sum, i) => sum + (i.estimatedCost || 0), 0);
  const spent = items.reduce((sum, i) => sum + (i.actualCost || 0), 0);
  const total = plan.budgetTotal;
  return {
    total,
    estimated,
    spent,
    itemCount: items.length,
    spentRatio: total > 0 ? Math.min(100, Math.round((spent / total) * 100)) : 0,
    over: total > 0 && spent > total ? spent - total : 0,
  };
}

export function summarizeGuests(guests: Guest[]) {
  const total = guests.length;
  const confirmed = guests.filter((g) => g.rsvpStatus === "confirmed").length;
  const declined = guests.filter((g) => g.rsvpStatus === "declined").length;
  const pending = total - confirmed - declined;
  return {
    total,
    confirmed,
    declined,
    pending,
    ratio: total > 0 ? Math.round((confirmed / total) * 100) : 0,
  };
}

export function summarizeVendors(vendors: Vendor[]) {
  const active = vendors.filter((v) => v.status !== "declined");
  const booked = active.filter((v) => v.status === "booked").length;
  return {
    total: active.length,
    booked,
    considering: active.length - booked,
    ratio: active.length > 0 ? Math.round((booked / active.length) * 100) : 0,
  };
}

/** "sábado, 15 de mayo de 2027" para el encabezado de la boda. */
export function formatLongDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value + "T00:00:00");
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function pluralize(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
