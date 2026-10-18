import { honeymoonHref } from "@/lib/honeymoon-model";
import type { AppointmentCategory } from "@/lib/firebase/appointments";
import type { StepTaskAuto } from "@/lib/types";

/** A dónde lleva la flecha de una tarea base. `labelKey` es una clave del namespace `plan`. */
export type TaskTarget =
  | { kind: "href"; href: string; labelKey: string }
  | { kind: "edit-plan"; labelKey: string }
  | { kind: "timeline"; labelKey: string }
  | { kind: "tool"; tool: PlanTool; labelKey: string }
  | { kind: "agenda"; category: AppointmentCategory; labelKey: string }
  | { kind: "save-the-date"; labelKey: string };

/** Herramientas de la app que se abren en un diálogo desde la flecha de una tarea. */
export type PlanTool = "ceremony" | "legal-docs" | "gift";

/** Parámetro de Proveedores que abre «Nuevo proveedor» con esa categoría. */
export const NEW_VENDOR_PARAM = "nuevo";
/** Parámetro de Invitados que filtra por respuesta (p. ej. `pending`). */
export const GUEST_STATUS_PARAM = "estado";

/** Parámetro del Resumen que abre una herramienta del plan en su diálogo (p. ej. `?herramienta=regalo`). */
export const PLAN_TOOL_PARAM = "herramienta";
/** Valor de `PLAN_TOOL_PARAM` que abre los datos del regalo. */
export const GIFT_TOOL_VALUE = "regalo";

/** Pestaña Invitación (editor de la invitación en tres pasos). */
export function invitationHref(planId: string) {
  return `/plan/${planId}/invitation`;
}

/** Resumen del plan con el diálogo del regalo abierto. */
export function giftToolHref(planId: string) {
  return `/plan/${planId}?${PLAN_TOOL_PARAM}=${GIFT_TOOL_VALUE}`;
}

/** Pestaña Ceremonia; el ancla lleva a su sección. */
export function ceremonyHref(planId: string, section?: "tipo" | "oficiante" | "documentos" | "cronograma") {
  return `/plan/${planId}/ceremonia${section ? `#${section}` : ""}`;
}

function vendors(planId: string, category: string, labelKey: string): TaskTarget {
  const query = new URLSearchParams({ [NEW_VENDOR_PARAM]: category });
  return { kind: "href", href: `/plan/${planId}/vendors?${query}`, labelKey };
}

/**
 * Herramienta de la app donde se hace cada tarea base (por su clave `auto`).
 * Las tareas sin herramienta, y las que añade la gente, no tienen flecha.
 */
export function taskTarget(auto: StepTaskAuto | undefined, planId: string): TaskTarget | null {
  switch (auto) {
    case "date":
    case "budget":
      return { kind: "edit-plan", labelKey: "taskLinks.editPlan" };
    case "budget-split":
      return { kind: "href", href: `/plan/${planId}?${PLAN_TOOL_PARAM}=reparto`, labelKey: "taskLinks.budget" };
    case "guests-draft":
      return { kind: "href", href: `/plan/${planId}/guests`, labelKey: "taskLinks.guests" };
    case "guests-final":
      return {
        kind: "href",
        href: `/plan/${planId}/guests?${GUEST_STATUS_PARAM}=pending`,
        labelKey: "taskLinks.guestsPending",
      };
    case "vendor-catering":
      return vendors(planId, "Catering", "taskLinks.vendorCatering");
    case "vendor-photo":
      return vendors(planId, "Fotógrafo", "taskLinks.vendorPhoto");
    case "vendor-music":
      return vendors(planId, "Música", "taskLinks.vendorMusic");
    case "venue-ceremony":
    case "venue-banquet":
      return vendors(planId, "Finca", "taskLinks.vendorVenue");
    case "venue-visit":
      return { kind: "agenda", category: "lugar", labelKey: "taskLinks.agendaVisits" };
    case "outfit-fitting":
      return { kind: "agenda", category: "vestuario", labelKey: "taskLinks.agendaFittings" };
    case "stationery-save-date":
      return { kind: "save-the-date", labelKey: "taskLinks.saveTheDate" };
    case "invitations-send":
      return { kind: "href", href: invitationHref(planId), labelKey: "taskLinks.invitation" };
    case "honeymoon-destination":
      return { kind: "href", href: honeymoonHref(planId), labelKey: "taskLinks.honeymoon" };
    case "honeymoon-book":
      return { kind: "href", href: honeymoonHref(planId), labelKey: "taskLinks.honeymoonBook" };
    case "timeline-draft":
    case "timeline-share":
      return { kind: "timeline", labelKey: "taskLinks.timeline" };
    case "ceremony-type":
      return { kind: "href", href: ceremonyHref(planId, "tipo"), labelKey: "taskLinks.ceremonyTab" };
    case "officiant-confirmed":
      return { kind: "href", href: ceremonyHref(planId, "oficiante"), labelKey: "taskLinks.officiant" };
    case "legal-start":
    case "legal-docs":
      return { kind: "href", href: ceremonyHref(planId, "documentos"), labelKey: "taskLinks.legalDocs" };
    case "gift-decide":
    case "gift-data":
      return { kind: "tool", tool: "gift", labelKey: "taskLinks.gift" };
    default:
      return null;
  }
}

/** Tareas base sin `auto` (se guardan solo como texto) que también tienen herramienta. */
const MANUAL_TASK_TARGETS: Record<string, (planId: string) => TaskTarget> = {
  "vestuario|Elegir vestido/traje": (planId) => ({ kind: "href", href: `/plan/${planId}/estilo#vestuario`, labelKey: "taskLinks.style" }),
  "alojamiento_transporte|Buscar alojamientos cercanos": (planId) => ({ kind: "href", href: `/plan/${planId}/guests`, labelKey: "taskLinks.guestsNeeds" }),
  "alojamiento_transporte|Organizar transporte": (planId) => ({ kind: "href", href: `/plan/${planId}/guests`, labelKey: "taskLinks.guestsNeeds" }),
};

/** Herramienta de una tarea base manual, por categoría y título original. */
export function manualTaskTarget(category: string, title: string, planId: string): TaskTarget | null {
  return MANUAL_TASK_TARGETS[`${category}|${title}`]?.(planId) ?? null;
}
