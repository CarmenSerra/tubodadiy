import { format } from "date-fns";
import { es } from "date-fns/locale";

import type { SaveTheDateDesign, SaveTheDateTemplate } from "@/lib/firebase/designs";
import { MAX_NAME } from "@/lib/firebase/designs";
import type { WeddingPlan } from "@/lib/types";

/** Parámetro de la URL que abre el diseñador: /plan/{id}?reserva=1 */
export const STATIONERY_PARAM = "reserva";

export const TEMPLATE_INFO: Record<SaveTheDateTemplate, { label: string; blurb: string }> = {
  jardin: { label: "Jardín", blurb: "Lila y salvia con ramitas de eucalipto" },
  arco: { label: "Arco", blurb: "Un arco suave sobre fondo lila" },
  minimal: { label: "Minimal", blurb: "Limpio, con mucho aire" },
  noche: { label: "Noche", blurb: "Elegante, en ciruela oscuro" },
};

export const DEFAULT_HEADING = "Reserva la fecha";
export const DEFAULT_MESSAGE = "Muy pronto recibirás la invitación con todos los detalles.";

/**
 * Intenta sacar los dos nombres del título del plan («Boda de Ana y Luis»,
 * «Ana & Luis»…). Si no se parece a eso, no se inventa nada.
 */
export function namesFromPlanTitle(title: string): [string, string] {
  const match = /^(?:boda de\s+)?(.+?)\s+(?:y|&|e)\s+(.+)$/i.exec(title.trim());
  if (!match) return ["", ""];
  const [a, b] = [match[1].trim(), match[2].trim()];
  if (a.length > MAX_NAME || b.length > MAX_NAME) return ["", ""];
  return [a, b];
}

/** Diseño inicial cuando aún no hay uno guardado: la fecha sale del plan. */
export function defaultDesign(plan: WeddingPlan | null): SaveTheDateDesign {
  const [name1, name2] = plan ? namesFromPlanTitle(plan.title) : ["", ""];
  return {
    template: "jardin",
    heading: DEFAULT_HEADING,
    name1,
    name2,
    date: plan?.weddingDate ?? "",
    place: "",
    message: DEFAULT_MESSAGE,
  };
}

/** Para la vista previa: nombres de muestra si aún no hay (nunca se exportan así). */
export function withSamples(design: SaveTheDateDesign): SaveTheDateDesign {
  if (design.name1.trim() || design.name2.trim()) return design;
  return { ...design, name1: "Nombre", name2: "Nombre" };
}

/** Lo mínimo para exportar o compartir: al menos un nombre y la fecha. */
export function isShareable(design: SaveTheDateDesign): boolean {
  return Boolean((design.name1.trim() || design.name2.trim()) && design.date);
}

export function sameDesign(a: SaveTheDateDesign, b: SaveTheDateDesign): boolean {
  return (
    a.template === b.template &&
    a.heading === b.heading &&
    a.name1 === b.name1 &&
    a.name2 === b.name2 &&
    a.date === b.date &&
    a.place === b.place &&
    a.message === b.message
  );
}

function parseDay(date: string): Date | null {
  const d = new Date(`${date}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface DateParts {
  /** «sábado» */
  weekday: string;
  /** «12» */
  day: string;
  /** «06» */
  monthNumber: string;
  /** «junio» */
  month: string;
  /** «2027» */
  year: string;
}

export function dateParts(date: string): DateParts | null {
  const d = parseDay(date);
  if (!d) return null;
  return {
    weekday: format(d, "EEEE", { locale: es }),
    day: String(d.getDate()),
    monthNumber: format(d, "MM"),
    month: format(d, "MMMM", { locale: es }),
    year: format(d, "yyyy"),
  };
}

/** «Ana y Luis», «Ana» o cadena vacía. */
export function namesText(design: Pick<SaveTheDateDesign, "name1" | "name2">): string {
  return [design.name1.trim(), design.name2.trim()].filter(Boolean).join(" y ");
}

/** Texto para mandar por WhatsApp. */
export function whatsappText(design: SaveTheDateDesign): string {
  const names = namesText(design);
  const both = design.name1.trim() && design.name2.trim();
  const parts = dateParts(design.date);
  const when = parts ? `el ${parts.weekday} ${parts.day} de ${parts.month} de ${parts.year}` : "";
  const where = design.place.trim() ? `en ${design.place.trim()}` : "";

  const lines: string[] = [`¡${design.heading.trim() || DEFAULT_HEADING}!`];
  if (names) {
    lines.push(
      [both ? `${names} se casan` : `${names} se casa`, when, where].filter(Boolean).join(" ") + "."
    );
  } else if (when) {
    lines.push([`Nos casamos`, when, where].filter(Boolean).join(" ") + ".");
  }
  if (design.message.trim()) lines.push(design.message.trim());
  return lines.join("\n\n");
}

/** Nombre de archivo sin acentos ni símbolos: reserva-la-fecha-ana-y-luis */
export function fileBaseName(design: SaveTheDateDesign): string {
  const slug = namesText(design)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `reserva-la-fecha-${slug}` : "reserva-la-fecha";
}
