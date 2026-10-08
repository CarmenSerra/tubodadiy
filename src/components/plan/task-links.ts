import { INVITATION_PARAM } from "@/components/invitation/invitation-launcher";
import { honeymoonHref } from "@/lib/honeymoon-model";
import type { AppointmentCategory } from "@/lib/firebase/appointments";
import type { StepTaskAuto } from "@/lib/types";

/** A dónde lleva la flecha de una tarea base. */
export type TaskTarget =
  | { kind: "href"; href: string; label: string }
  | { kind: "edit-plan"; label: string }
  | { kind: "timeline"; label: string }
  | { kind: "tool"; tool: PlanTool; label: string }
  | { kind: "agenda"; category: AppointmentCategory; label: string }
  | { kind: "save-the-date"; label: string };

/** Herramientas de la app que se abren en un diálogo desde la flecha de una tarea. */
export type PlanTool = "ceremony" | "legal-docs" | "gift";

/** Parámetro de Proveedores que abre «Nuevo proveedor» con esa categoría. */
export const NEW_VENDOR_PARAM = "nuevo";
/** Parámetro de Invitados que filtra por respuesta (p. ej. `pending`). */
export const GUEST_STATUS_PARAM = "estado";

function vendors(planId: string, category: string, label: string): TaskTarget {
  const query = new URLSearchParams({ [NEW_VENDOR_PARAM]: category });
  return { kind: "href", href: `/plan/${planId}/vendors?${query}`, label };
}

/**
 * Herramienta de la app donde se hace cada tarea base (por su clave `auto`).
 * Las tareas sin herramienta, y las que añade la gente, no tienen flecha.
 */
export function taskTarget(auto: StepTaskAuto | undefined, planId: string): TaskTarget | null {
  switch (auto) {
    case "date":
    case "budget":
      return { kind: "edit-plan", label: "Ir a editar el plan" };
    case "budget-split":
      return { kind: "href", href: `/plan/${planId}/budget`, label: "Ir al presupuesto" };
    case "guests-draft":
      return { kind: "href", href: `/plan/${planId}/guests`, label: "Ir a invitados" };
    case "guests-final":
      return {
        kind: "href",
        href: `/plan/${planId}/guests?${GUEST_STATUS_PARAM}=pending`,
        label: "Ir a invitados pendientes de respuesta",
      };
    case "vendor-catering":
      return vendors(planId, "Catering", "Ir a proveedores de catering");
    case "vendor-photo":
      return vendors(planId, "Fotógrafo", "Ir a proveedores de fotografía");
    case "vendor-music":
      return vendors(planId, "Música", "Ir a proveedores de música");
    case "vendor-officiant":
      return vendors(planId, "Oficiante", "Ir a proveedores de oficiante");
    case "venue-ceremony":
    case "venue-banquet":
      return vendors(planId, "Finca", "Ir a proveedores de lugar");
    case "venue-visit":
      return { kind: "agenda", category: "lugar", label: "Abrir la agenda de visitas" };
    case "outfit-fitting":
      return { kind: "agenda", category: "vestuario", label: "Abrir la agenda de pruebas" };
    case "stationery-save-date":
      return { kind: "save-the-date", label: "Diseñar la tarjeta «reserva la fecha»" };
    case "invitations-send":
      return {
        kind: "href",
        href: `/plan/${planId}/guests?${INVITATION_PARAM}=1`,
        label: "Ir al editor de la invitación",
      };
    case "honeymoon-destination":
      return { kind: "href", href: honeymoonHref(planId), label: "Ir a la luna de miel" };
    case "honeymoon-book":
      return { kind: "href", href: honeymoonHref(planId), label: "Ir a las reservas de la luna de miel" };
    case "timeline-draft":
    case "timeline-share":
      return { kind: "timeline", label: "Ir al cronograma" };
    case "ceremony-type":
      return { kind: "tool", tool: "ceremony", label: "Elegir el tipo de ceremonia" };
    case "legal-start":
    case "legal-docs":
      return { kind: "tool", tool: "legal-docs", label: "Ver la guía de documentos legales" };
    case "gift-decide":
    case "gift-data":
      return { kind: "tool", tool: "gift", label: "Abrir los datos del regalo" };
    default:
      return null;
  }
}
