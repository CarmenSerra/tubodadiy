import { DEFAULT_LANG, localeOf, type Lang } from "@/lib/i18n/config";
import { dateFormatter, parseDateOnly } from "@/lib/i18n/format";
import { getServerT } from "@/lib/i18n/server";
import { responsibleText, contactsById, type DayContact } from "@/lib/dayof-model";
import type { TimelineItem } from "@/lib/types";

/** `t` fijo al namespace `timeline` para funciones puras que reciben el idioma por parámetro. */
const tl = (lang: Lang = DEFAULT_LANG) => getServerT(lang, "timeline");

// Todas las horas del cronograma son minutos desde las 00:00 del día de la
// boda. Pueden pasar de 1440 (madrugada del día siguiente).

export const DAY_MIN = 1440;
/** Última hora de inicio permitida: 23:59 del día siguiente. */
export const MAX_START_MIN = DAY_MIN * 2 - 1;
/** Paso de los botones de ajuste rápido. */
export const NUDGE_MIN = 15;
/** Huecos mayores que esto se muestran entre momentos. */
export const GAP_MIN = 30;
/** Duraciones habituales del desplegable (0 = momento puntual). */
export const COMMON_DURATIONS = [0, 15, 30, 45, 60, 90, 120, 180] as const;

const pad = (n: number) => String(n).padStart(2, "0");

/** Minutos del día → "HH:mm" (módulo 24 h). */
export function formatClock(min: number): string {
  const inDay = ((Math.round(min) % DAY_MIN) + DAY_MIN) % DAY_MIN;
  return `${pad(Math.floor(inDay / 60))}:${pad(inDay % 60)}`;
}

/** 0 = el día de la boda, 1 = madrugada siguiente… */
export function dayIndex(min: number): number {
  return Math.max(0, Math.floor(min / DAY_MIN));
}

/** "HH:mm" → minutos del día (0–1439), o null si no es válida. */
export function parseClock(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}

/** 45 → "45 min", 60 → "1 h", 90 → "1 h 30 min"; 0 → «Momento puntual» / «Single moment». */
export function formatDuration(min: number, lang: Lang = DEFAULT_LANG): string {
  if (min <= 0) return tl(lang)("duration.instant");
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function endMin(item: Pick<TimelineItem, "startMin" | "durationMin">): number {
  return item.startMin + Math.max(0, item.durationMin);
}

/** Orden estable por hora de inicio (luego fin, creación e id). */
export function sortItems<T extends TimelineItem>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      a.startMin - b.startMin ||
      endMin(a) - endMin(b) ||
      (a.createdAt ?? 0) - (b.createdAt ?? 0) ||
      a.id.localeCompare(b.id)
  );
}

/** Dos momentos coinciden si se pisan; uno puntual solo si cae dentro del otro. */
function overlaps(a: TimelineItem, b: TimelineItem): boolean {
  const ae = endMin(a);
  const be = endMin(b);
  if (a.durationMin <= 0 && b.durationMin <= 0) return false;
  if (a.durationMin <= 0) return a.startMin > b.startMin && a.startMin < be;
  if (b.durationMin <= 0) return b.startMin > a.startMin && b.startMin < ae;
  return a.startMin < be && b.startMin < ae;
}

/** Para cada momento, los títulos de los otros con los que coincide. */
export function overlapsById(sorted: TimelineItem[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const a of sorted) {
    const others = sorted.filter((b) => b.id !== a.id && overlaps(a, b)).map((b) => b.title);
    if (others.length > 0) result[a.id] = others;
  }
  return result;
}

/** "«A»", "«A» y «B»", "«A», «B» y «C»" (en inglés: “A”, “A” and “B”…). */
export function joinTitles(titles: string[], lang: Lang = DEFAULT_LANG): string {
  const t = tl(lang);
  const quoted = titles.map((title) => t("quoted", { text: title }));
  return new Intl.ListFormat(localeOf(lang), { style: "long", type: "conjunction" }).format(quoted);
}

/** Minutos libres antes de cada momento (solo los que superan GAP_MIN). */
export function gapsBefore(sorted: TimelineItem[]): Record<string, number> {
  const gaps: Record<string, number> = {};
  let latestEnd: number | null = null;
  for (const item of sorted) {
    if (latestEnd !== null && item.startMin - latestEnd > GAP_MIN) {
      gaps[item.id] = item.startMin - latestEnd;
    }
    latestEnd = latestEnd === null ? endMin(item) : Math.max(latestEnd, endMin(item));
  }
  return gaps;
}

export interface StartUpdate {
  id: string;
  startMin: number;
}

/**
 * Cambios de hora al mover un momento `delta` minutos. Con `cascade`, también
 * se mueven todos los que vienen después en la lista. Devuelve `null` si algún
 * momento se saldría del rango permitido (antes de las 00:00 o tras 23:59 del
 * día siguiente).
 */
export function planShift(
  sorted: TimelineItem[],
  id: string,
  delta: number,
  cascade: boolean
): StartUpdate[] | null {
  const index = sorted.findIndex((i) => i.id === id);
  if (index < 0) return null;
  const moved = cascade ? sorted.slice(index) : [sorted[index]];
  const updates = moved.map((i) => ({ id: i.id, startMin: i.startMin + delta }));
  if (updates.some((u) => u.startMin < 0 || u.startMin > MAX_START_MIN)) return null;
  return updates;
}

/* ------------------------------------------------------------------ */
/* Plantilla                                                          */
/* ------------------------------------------------------------------ */

interface TemplateMoment {
  /** Clave del título en `timeline:template.<key>`. */
  key: string;
  /** Minutos respecto al inicio de la ceremonia. */
  offset: number;
  durationMin: number;
  highlight?: boolean;
}

const h = (hours: number, minutes = 0) => hours * 60 + minutes;

// Una boda típica en España: ceremonia, cóctel con fotos en paralelo,
// banquete, tarta, primer baile y fiesta.
const TEMPLATE: TemplateMoment[] = [
  { key: "getReady", offset: -h(3), durationMin: 150 },
  { key: "guestsArrive", offset: -30, durationMin: 30 },
  { key: "ceremony", offset: 0, durationMin: 45, highlight: true },
  { key: "cocktail", offset: 45, durationMin: 90 },
  { key: "couplePhotos", offset: 60, durationMin: 45 },
  { key: "banquetEntrance", offset: h(2, 15), durationMin: 15 },
  { key: "banquet", offset: h(2, 30), durationMin: 120, highlight: true },
  { key: "cakeSpeeches", offset: h(4, 30), durationMin: 30 },
  { key: "firstDance", offset: h(5), durationMin: 15, highlight: true },
  { key: "party", offset: h(5, 15), durationMin: 180 },
  { key: "partyEnd", offset: h(8, 15), durationMin: 0 },
];

/** La plantilla necesita sitio para los preparativos antes de la ceremonia. */
export const MIN_CEREMONY_MIN = 3 * 60;
export const MAX_CEREMONY_MIN = DAY_MIN - 1;

export function isValidCeremonyStart(min: number | null): min is number {
  return min !== null && min >= MIN_CEREMONY_MIN && min <= MAX_CEREMONY_MIN;
}

export type NewTimelineItem = Omit<TimelineItem, "id" | "createdAt">;

/**
 * Momentos de la plantilla, ya colocados respecto a la hora de la ceremonia. Los
 * títulos se guardan en el idioma indicado (son del plan, luego se pueden editar).
 */
export function buildTemplate(ceremonyStartMin: number, lang: Lang = DEFAULT_LANG): NewTimelineItem[] {
  const t = tl(lang);
  return TEMPLATE.map((m) => ({
    title: t(`template.${m.key}`),
    startMin: ceremonyStartMin + m.offset,
    durationMin: m.durationMin,
    location: "",
    responsible: "",
    notes: "",
    highlight: Boolean(m.highlight),
  }));
}

/* ------------------------------------------------------------------ */
/* Ideas                                                              */
/* ------------------------------------------------------------------ */

/** Minúsculas y sin tildes, para encontrar «Ceremonia» escriba como se escriba. */
function plain(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

/** Palabras que identifican el momento de la ceremonia (en cualquiera de los idiomas). */
const CEREMONY_WORDS = ["ceremonia", "ceremony"];

/** El momento «Ceremonia» / «Ceremony» (o el primero que empiece por esa palabra), si existe. */
export function findCeremony(items: TimelineItem[]): TimelineItem | null {
  return (
    items.find((i) => CEREMONY_WORDS.includes(plain(i.title))) ??
    items.find((i) => CEREMONY_WORDS.some((word) => plain(i.title).startsWith(word))) ??
    null
  );
}

/**
 * Hora de inicio de un momento sugerido: respecto a la ceremonia si hay una y la
 * idea tiene hora típica; si no, justo cuando acaba el último momento (o a las
 * 12:00 con el cronograma vacío). Siempre dentro del rango permitido.
 */
export function suggestStart(items: TimelineItem[], typicalOffsetMin?: number): number {
  const ceremony = findCeremony(items);
  let start: number;
  if (ceremony && typicalOffsetMin !== undefined) {
    start = ceremony.startMin + typicalOffsetMin;
  } else if (items.length > 0) {
    start = Math.max(...items.map(endMin));
  } else {
    start = 12 * 60;
  }
  return Math.min(Math.max(start, 0), MAX_START_MIN);
}

/* ------------------------------------------------------------------ */
/* Textos                                                             */
/* ------------------------------------------------------------------ */

/** "7 de junio de 2027" / "7 June 2027", o null si no hay fecha. */
export function formatLongDate(
  value: string | null | undefined,
  lang: Lang = DEFAULT_LANG
): string | null {
  const date = parseDateOnly(value);
  if (!date) return null;
  return dateFormatter(lang, { day: "numeric", month: "long", year: "numeric" }).format(date);
}

/** "Sábado, 7 de junio de 2027" / "Saturday 7 June 2027", o null si no hay fecha. */
export function formatWeekdayDate(
  value: string | null | undefined,
  lang: Lang = DEFAULT_LANG
): string | null {
  const date = parseDateOnly(value);
  if (!date) return null;
  const text = dateFormatter(lang, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Boda de Ana y Luis" / "Wedding of Ana & Luis" (o el título tal cual si ya habla de la boda). */
export function weddingName(planTitle: string, lang: Lang = DEFAULT_LANG): string {
  const t = tl(lang);
  const title = planTitle.trim();
  if (!title) return t("weddingName.default");
  return /boda|wedding/i.test(title) ? title : t("weddingName.of", { names: title });
}

/** Rango legible en texto plano: "12:00–12:45", "23:30–00:30 (+1)". */
export function formatRangeText(item: TimelineItem): string {
  const end = endMin(item);
  const day = dayIndex(item.durationMin > 0 ? end : item.startMin);
  const suffix = day > 0 ? ` (+${day})` : "";
  if (item.durationMin <= 0) return `${formatClock(item.startMin)}${suffix}`;
  return `${formatClock(item.startMin)}–${formatClock(end)}${suffix}`;
}

const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();

/** Cronograma en texto plano, listo para pegar en un mensaje o correo. */
export function timelineToText(
  sorted: (TimelineItem & { responsibleContactId?: string })[],
  plan: { title: string; weddingDate: string | null },
  lang: Lang = DEFAULT_LANG,
  contacts: DayContact[] = []
): string {
  const t = tl(lang);
  const byId = contactsById(contacts);
  const date = formatLongDate(plan.weddingDate, lang);
  const heading = [t("text.heading"), weddingName(plan.title, lang), date].filter(Boolean).join(" — ");
  const lines = sorted.map((item) => {
    const parts = [item.title];
    if (item.location.trim()) parts.push(oneLine(item.location));
    const owner = responsibleText(item, byId, { phone: true });
    if (owner) parts.push(t("text.responsible", { name: oneLine(owner) }));
    if (item.notes.trim()) parts.push(t("text.notes", { notes: oneLine(item.notes) }));
    return `${formatRangeText(item)} ${parts.join(" · ")}`;
  });
  const people = contacts.map((c) => [c.name, c.role.trim(), c.phone.trim()].filter(Boolean).join(" · "));
  const footer = people.length > 0 ? ["", t("text.contacts"), ...people] : [];
  return [heading, "", ...lines, ...footer].join("\n");
}
