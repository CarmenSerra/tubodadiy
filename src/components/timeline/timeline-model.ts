import type { TimelineItem } from "@/lib/types";

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

/** 45 → "45 min", 60 → "1 h", 90 → "1 h 30 min". */
export function formatDuration(min: number): string {
  if (min <= 0) return "Momento puntual";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function endMin(item: Pick<TimelineItem, "startMin" | "durationMin">): number {
  return item.startMin + Math.max(0, item.durationMin);
}

/** Orden estable por hora de inicio (luego fin, creación e id). */
export function sortItems(items: TimelineItem[]): TimelineItem[] {
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

/** "«A»", "«A» y «B»", "«A», «B» y «C»". */
export function joinTitles(titles: string[]): string {
  const quoted = titles.map((t) => `«${t}»`);
  if (quoted.length <= 1) return quoted.join("");
  return `${quoted.slice(0, -1).join(", ")} y ${quoted[quoted.length - 1]}`;
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
  title: string;
  /** Minutos respecto al inicio de la ceremonia. */
  offset: number;
  durationMin: number;
  highlight?: boolean;
}

const h = (hours: number, minutes = 0) => hours * 60 + minutes;

// Una boda típica en España: ceremonia, cóctel con fotos en paralelo,
// banquete, tarta, primer baile y fiesta.
const TEMPLATE: TemplateMoment[] = [
  { title: "Preparativos", offset: -h(3), durationMin: 150 },
  { title: "Llegada de invitados", offset: -30, durationMin: 30 },
  { title: "Ceremonia", offset: 0, durationMin: 45, highlight: true },
  { title: "Cóctel", offset: 45, durationMin: 90 },
  { title: "Fotos de pareja", offset: 60, durationMin: 45 },
  { title: "Entrada al banquete", offset: h(2, 15), durationMin: 15 },
  { title: "Banquete", offset: h(2, 30), durationMin: 120, highlight: true },
  { title: "Tarta y discursos", offset: h(4, 30), durationMin: 30 },
  { title: "Primer baile", offset: h(5), durationMin: 15, highlight: true },
  { title: "Fiesta", offset: h(5, 15), durationMin: 180 },
  { title: "Fin de fiesta", offset: h(8, 15), durationMin: 0 },
];

/** La plantilla necesita sitio para los preparativos antes de la ceremonia. */
export const MIN_CEREMONY_MIN = 3 * 60;
export const MAX_CEREMONY_MIN = DAY_MIN - 1;

export function isValidCeremonyStart(min: number | null): min is number {
  return min !== null && min >= MIN_CEREMONY_MIN && min <= MAX_CEREMONY_MIN;
}

export type NewTimelineItem = Omit<TimelineItem, "id" | "createdAt">;

/** Momentos de la plantilla, ya colocados respecto a la hora de la ceremonia. */
export function buildTemplate(ceremonyStartMin: number): NewTimelineItem[] {
  return TEMPLATE.map((m) => ({
    title: m.title,
    startMin: ceremonyStartMin + m.offset,
    durationMin: m.durationMin,
    location: "",
    responsible: "",
    notes: "",
    highlight: Boolean(m.highlight),
  }));
}

/* ------------------------------------------------------------------ */
/* Textos                                                             */
/* ------------------------------------------------------------------ */

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value + "T00:00:00");
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "7 de junio de 2027", o null si no hay fecha. */
export function formatLongDate(value: string | null | undefined): string | null {
  const date = parseDate(value);
  if (!date) return null;
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" }).format(
    date
  );
}

/** "Sábado, 7 de junio de 2027", o null si no hay fecha. */
export function formatWeekdayDate(value: string | null | undefined): string | null {
  const date = parseDate(value);
  if (!date) return null;
  const text = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Boda de Ana y Luis" (o el título tal cual si ya habla de la boda). */
export function weddingName(planTitle: string): string {
  const title = planTitle.trim();
  if (!title) return "Nuestra boda";
  return /boda/i.test(title) ? title : `Boda de ${title}`;
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
  sorted: TimelineItem[],
  plan: { title: string; weddingDate: string | null }
): string {
  const date = formatLongDate(plan.weddingDate);
  const heading = ["Cronograma", weddingName(plan.title), date].filter(Boolean).join(" — ");
  const lines = sorted.map((item) => {
    const parts = [item.title];
    if (item.location.trim()) parts.push(oneLine(item.location));
    if (item.responsible.trim()) parts.push(`Responsable: ${oneLine(item.responsible)}`);
    if (item.notes.trim()) parts.push(`Notas: ${oneLine(item.notes)}`);
    return `${formatRangeText(item)} ${parts.join(" · ")}`;
  });
  return [heading, "", ...lines].join("\n");
}
