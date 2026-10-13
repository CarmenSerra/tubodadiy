// Utilidades puras del botón "Ideas": comparar títulos y agrupar plazos.

import type { TFunction } from "i18next";

import { LANGUAGES, type Namespace } from "@/lib/i18n/config";
import { getServerT } from "@/lib/i18n/server";

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
export function leadGroups(t: TFunction): IdeaGroup[] {
  return (["early", "mid", "late", "after", "other"] as const).map((id) => ({
    id,
    label: t(`ideas.lead.${id}`, { ns: "vendors" }),
  }));
}

/**
 * Textos de una idea en TODOS los idiomas (<ns>:<key>): se usan para reconocer que ya la
 * tienes aunque la añadieras con la app en otro idioma.
 */
export function titlesInAllLanguages(key: string, ns: Namespace = "vendors"): string[] {
  return LANGUAGES.map((l) => String(getServerT(l.code, ns)(key)));
}
