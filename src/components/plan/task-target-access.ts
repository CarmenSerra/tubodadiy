import type { TaskTarget } from "@/components/plan/task-links";
import type { PlanSection, SectionLevel } from "@/lib/permissions";

/** Pestaña (primer tramo de la ruta del plan) → sección de permisos. */
const SECTION_BY_PATH: Record<string, PlanSection> = {
  guests: "guests",
  budget: "budget",
  vendors: "vendors",
  banquete: "banquet",
  estilo: "style",
  "dia-b": "dayof",
  ceremonia: "ceremony",
  honeymoon: "honeymoon",
  invitation: "invitation",
};

/** Sección a la que lleva un enlace interno de una tarea; `null` si va al Resumen o a otro sitio. */
function sectionOfHref(href: string): PlanSection | null {
  const [path, query = ""] = href.split("#")[0].split("?");
  const segments = path.split("/").filter(Boolean); // ["plan", id, pestaña?]
  if (segments[0] === "plan" && segments.length === 2) {
    // Resumen con una herramienta de otra sección abierta (p. ej. el reparto del presupuesto).
    return /herramienta=reparto/.test(query) ? "budget" : null;
  }
  return SECTION_BY_PATH[segments[2] ?? ""] ?? null;
}

/**
 * ¿Tiene sentido enseñar la flecha de una tarea a esta persona? Las pestañas
 * piden poder ver su sección; los diálogos que solo sirven para editar
 * (ceremonia, documentos, regalo, «reserva la fecha»), poder editarla.
 */
export function canUseTaskTarget(levels: Record<PlanSection, SectionLevel>, target: TaskTarget): boolean {
  switch (target.kind) {
    case "href": {
      const section = sectionOfHref(target.href);
      return section === null || levels[section] !== "none";
    }
    case "timeline":
      return levels.dayof !== "none";
    case "tool":
      return target.tool === "gift" ? levels.invitation === "edit" : levels.ceremony === "edit";
    case "save-the-date":
      return levels.invitation === "edit";
    default:
      // Agenda (Tareas) y datos del plan: se resuelven donde se abren.
      return true;
  }
}
