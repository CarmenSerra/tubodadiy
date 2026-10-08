import type { CeremonyType } from "@/lib/types";

export interface CeremonyOption {
  value: CeremonyType;
  label: string;
  /** Una frase que resume cómo es. */
  tagline: string;
  /** Qué implica en la práctica. */
  implies: string[];
  /** Validez legal en España. */
  legal: string;
  /** Resumen corto de la validez, para la etiqueta. */
  legalBadge: string;
  /** `true` si por sí sola vale como matrimonio legal. */
  legalByItself: boolean;
}

export const CEREMONY_OPTIONS: CeremonyOption[] = [
  {
    value: "civil",
    label: "Civil",
    tagline: "La celebra una autoridad civil y tiene plena validez legal.",
    implies: [
      "La oficia una autoridad: alcalde o concejal, juez de paz, notario o letrado de la Administración de Justicia.",
      "Antes hay que tramitar el expediente matrimonial (en el Registro Civil o ante notario).",
      "Suele ser corta y se puede hacer en el ayuntamiento, el juzgado, la notaría o, según el municipio, en otro lugar acordado.",
    ],
    legal:
      "El matrimonio queda inscrito en el Registro Civil y es legal desde ese momento.",
    legalBadge: "Validez legal plena",
    legalByItself: true,
  },
  {
    value: "religiosa",
    label: "Religiosa",
    tagline: "Se celebra según el rito de una confesión religiosa.",
    implies: [
      "La oficia quien corresponda en vuestra confesión (sacerdote, pastor, rabino, imán…).",
      "En la católica hay expediente en la parroquia, partida de bautismo y, normalmente, cursillo prematrimonial.",
      "Los tiempos y el lugar dependen de la parroquia o la comunidad: conviene hablar con ellas pronto.",
    ],
    legal:
      "La católica tiene efectos civiles si se inscribe en el Registro Civil (normalmente lo tramita la parroquia). Otras confesiones con acuerdo con el Estado (evangélica, judía, islámica) también pueden tenerlos, con sus propios requisitos.",
    legalBadge: "Efectos civiles al inscribirla",
    legalByItself: true,
  },
  {
    value: "simbolica",
    label: "Simbólica",
    tagline: "Una ceremonia a vuestra medida, sin efectos legales por sí sola.",
    implies: [
      "Elegís el lugar, los textos, los rituales y quién la oficia, sin un guion obligatorio.",
      "No cambia vuestro estado civil ni se inscribe en ningún registro.",
      "Se puede hacer el mismo día de la boda civil o en otra fecha.",
    ],
    legal:
      "No tiene validez legal por sí sola. Para que el matrimonio sea legal necesitáis, además, una boda civil (o religiosa con efectos civiles).",
    legalBadge: "Necesita también la civil",
    legalByItself: false,
  },
];

export function ceremonyLabel(type: CeremonyType | null | undefined): string | null {
  return CEREMONY_OPTIONS.find((o) => o.value === type)?.label ?? null;
}
