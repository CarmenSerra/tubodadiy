import type { SaveTheDateDesign } from "@/lib/firebase/designs";
import { MAX_NAME } from "@/lib/firebase/designs";
import { DEFAULT_LANG, LANGUAGES, type Lang } from "@/lib/i18n/config";
import { dateFormatter } from "@/lib/i18n/format";
import { getServerT } from "@/lib/i18n/server";
import type { WeddingPlan } from "@/lib/types";

/** Parámetro de la URL que abre el diseñador: /plan/{id}?reserva=1 */
export const STATIONERY_PARAM = "reserva";

// Nombre y descripción de cada plantilla: `tools:stationery.templates.<id>.label|blurb`.

/** Encabezado de serie de la tarjeta, en el idioma pedido. */
export function defaultHeading(lang: Lang = DEFAULT_LANG): string {
  return getServerT(lang, "tools")("stationery.defaults.heading");
}

/** Mensaje de serie de la tarjeta, en el idioma pedido. */
export function defaultMessage(lang: Lang = DEFAULT_LANG): string {
  return getServerT(lang, "tools")("stationery.defaults.message");
}

/**
 * Los textos de serie se guardan tal cual con el diseño. Si siguen siendo los de
 * serie (de cualquier idioma), se muestran en el idioma actual; si la pareja los
 * cambió, se respetan.
 */
export function localizeDefaults(design: SaveTheDateDesign, lang: Lang): SaveTheDateDesign {
  const isDefault = (value: string, make: (l: Lang) => string) =>
    LANGUAGES.some((l) => make(l.code) === value);
  return {
    ...design,
    heading: isDefault(design.heading, defaultHeading) ? defaultHeading(lang) : design.heading,
    message: isDefault(design.message, defaultMessage) ? defaultMessage(lang) : design.message,
  };
}

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
export function defaultDesign(plan: WeddingPlan | null, lang: Lang = DEFAULT_LANG): SaveTheDateDesign {
  const [name1, name2] = plan ? namesFromPlanTitle(plan.title) : ["", ""];
  return {
    template: "jardin",
    heading: defaultHeading(lang),
    name1,
    name2,
    date: plan?.weddingDate ?? "",
    place: "",
    message: defaultMessage(lang),
  };
}

/** Para la vista previa: nombres de muestra si aún no hay (nunca se exportan así). */
export function withSamples(design: SaveTheDateDesign, lang: Lang = DEFAULT_LANG): SaveTheDateDesign {
  if (design.name1.trim() || design.name2.trim()) return design;
  const sample = getServerT(lang, "tools")("stationery.sampleName");
  return { ...design, name1: sample, name2: sample };
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
  /** «12 de junio» / «12 June» */
  dayMonth: string;
  /** «2027» */
  year: string;
}

export function dateParts(date: string, lang: Lang = DEFAULT_LANG): DateParts | null {
  const d = parseDay(date);
  if (!d) return null;
  const f = (options: Intl.DateTimeFormatOptions) => dateFormatter(lang, options).format(d);
  return {
    weekday: f({ weekday: "long" }),
    day: String(d.getDate()),
    monthNumber: String(d.getMonth() + 1).padStart(2, "0"),
    month: f({ month: "long" }),
    dayMonth: f({ day: "numeric", month: "long" }),
    year: String(d.getFullYear()),
  };
}

/** «Ana y Luis», «Ana» o cadena vacía («Ana and Luis» en inglés). */
export function namesText(
  design: Pick<SaveTheDateDesign, "name1" | "name2">,
  lang: Lang = DEFAULT_LANG
): string {
  const and = getServerT(lang, "tools")("stationery.and");
  return [design.name1.trim(), design.name2.trim()].filter(Boolean).join(` ${and} `);
}

/** Texto para mandar por WhatsApp, en el idioma de la tarjeta. */
export function whatsappText(design: SaveTheDateDesign, lang: Lang = DEFAULT_LANG): string {
  const t = getServerT(lang, "tools");
  const names = namesText(design, lang);
  const both = design.name1.trim() && design.name2.trim();
  const parts = dateParts(design.date, lang);
  const when = parts ? t("stationery.share.when", { weekday: parts.weekday, dayMonth: parts.dayMonth, year: parts.year }) : "";
  const where = design.place.trim() ? t("stationery.share.where", { place: design.place.trim() }) : "";

  const lines: string[] = [t("stationery.share.heading", { heading: design.heading.trim() || defaultHeading(lang) })];
  if (names) {
    lines.push(
      [t(both ? "stationery.share.marryPlural" : "stationery.share.marrySingular", { names }), when, where]
        .filter(Boolean)
        .join(" ") + "."
    );
  } else if (when) {
    lines.push([t("stationery.share.weMarry"), when, where].filter(Boolean).join(" ") + ".");
  }
  if (design.message.trim()) lines.push(design.message.trim());
  return lines.join("\n\n");
}

/** Nombre de archivo sin acentos ni símbolos: reserva-la-fecha-ana-y-luis */
export function fileBaseName(design: SaveTheDateDesign, lang: Lang = DEFAULT_LANG): string {
  const base = getServerT(lang, "tools")("stationery.fileName");
  const slug = namesText(design, lang)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `${base}-${slug}` : base;
}
