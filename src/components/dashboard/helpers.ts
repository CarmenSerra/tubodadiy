import { daysUntil } from "@/lib/utils";
import type {
  BudgetItem,
  Guest,
  PlanMember,
  PlanStep,
  Vendor,
  WeddingPlan,
} from "@/lib/types";

/** Plan elegido por la persona en este navegador (solo una comodidad). */
export const SELECTED_PLAN_KEY = "tubodadiy:home-plan";

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
 * El primero es el plan que se muestra por defecto en la home.
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

/** Primer nombre para el saludo; null si no hay nombre fiable. */
export function firstName(displayName: string | null | undefined): string | null {
  const name = displayName?.trim().split(/\s+/)[0];
  return name ? name : null;
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
  // booked = opciones "elegidas"; considering = el resto (explorando, visitada, favorita).
  const total = vendors.length;
  const booked = vendors.filter((v) => v.status === "chosen").length;
  return {
    total,
    booked,
    considering: total - booked,
    ratio: total > 0 ? Math.round((booked / total) * 100) : 0,
  };
}

export function pluralize(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
