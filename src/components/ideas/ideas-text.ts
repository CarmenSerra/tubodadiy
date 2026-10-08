// Utilidades puras del botón "Ideas": comparar títulos y agrupar plazos.

/** Minúsculas, sin tildes ni signos: "Reservar la Finca." y "reservar la finca" coinciden. */
export function ideaKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Conjunto de claves de una lista de textos, para comprobar «¿ya lo tengo?». */
export function keySet(texts: string[]): Set<string> {
  return new Set(texts.map(ideaKey).filter(Boolean));
}

export interface IdeaGroup {
  id: string;
  label: string;
}

/** Tramos de plazo para filtrar las tareas sugeridas (en el orden en que se muestran). */
export const LEAD_GROUPS: IdeaGroup[] = [
  { id: "early", label: "9+ meses" },
  { id: "mid", label: "3–8 meses" },
  { id: "late", label: "< 3 meses" },
  { id: "after", label: "Tras la boda" },
  { id: "other", label: "Según el caso" },
];

/**
 * Tramo de un plazo orientativo («12–18 meses antes», «2–3 semanas antes»,
 * «Tras la boda», «Al visitar»…). Se usa la cifra menor: es cuando empieza a tocar.
 */
export function leadGroup(when?: string): string {
  if (!when) return "other";
  const text = when.toLowerCase();
  if (/despu[eé]s|tras la boda/.test(text)) return "after";
  if (/cada|durante|desde/.test(text)) return "other";
  const match = /(\d+)\s*(?:[–-]\s*\d+\s*)?(meses|mes|semanas|semana)/.exec(text);
  if (!match) return "other";
  const months = /sem/.test(match[2]) ? Number(match[1]) / 4.3 : Number(match[1]);
  if (months >= 9) return "early";
  if (months >= 3) return "mid";
  return "late";
}
