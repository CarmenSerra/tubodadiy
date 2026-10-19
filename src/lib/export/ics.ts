// iCalendar (RFC 5545) para «Añadir a mi calendario». Puro: sin React ni
// Firebase. Las citas con hora llevan hora «flotante» (la misma hora de reloj
// en cualquier zona, que es lo que significa «a las 18:30» para una cita en
// persona); las tareas, los plazos de pago y el día de la boda son eventos de
// día completo. Los UID son estables: volver a importar el fichero actualiza
// los eventos en lugar de duplicarlos.

export const ICS_MIME = "text/calendar;charset=utf-8";

export interface IcsEvent {
  /** Identificador estable y único (sin espacios). Se le añade `@tubodadiy`. */
  uid: string;
  title: string;
  /** Día, `yyyy-MM-dd`. */
  date: string;
  /** Hora de inicio `HH:mm`; si falta (o no es válida), evento de día completo. */
  time?: string | null;
  /** Duración de un evento con hora, en minutos (por defecto 60). */
  durationMin?: number;
  description?: string;
  location?: string;
  /** Enlace absoluto (`https://…`); si es relativo se ignora. */
  url?: string;
  /** Etiquetas del evento (p. ej. el tipo). */
  categories?: string[];
}

export interface IcsOptions {
  /** Nombre del calendario (`X-WR-CALNAME`). */
  calendarName?: string;
  /** Momento de generación (`DTSTAMP`); por defecto, ahora. */
  now?: Date;
}

const PRODID = "-//TuBodaDIY//Calendario//ES";
const CRLF = "\r\n";

/** Escapa un valor TEXT: `\`, `;`, `,` y saltos de línea (RFC 5545 §3.3.11). */
export function icsEscape(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

/**
 * Corta una línea a 75 octetos UTF-8 (RFC 5545 §3.1): las continuaciones
 * empiezan por un espacio. Nunca parte un carácter multibyte.
 */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  // La primera línea admite 75 octetos; las siguientes, 74 (el espacio inicial cuenta).
  let limit = 75;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
      limit = 74;
    }
    current += char;
    bytes += size;
  }
  if (current) parts.push(current);
  return parts.join(CRLF + " ");
}

const pad = (n: number) => String(n).padStart(2, "0");

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** `2027-06-12` → `20270612`, o null si no es una fecha válida. */
export function icsDate(date: string): string | null {
  const m = DATE_RE.exec(date);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (d.getUTCFullYear() !== Number(m[1]) || d.getUTCMonth() !== Number(m[2]) - 1 || d.getUTCDate() !== Number(m[3])) {
    return null;
  }
  return `${m[1]}${m[2]}${m[3]}`;
}

/** El día siguiente (`DTEND` de un evento de día completo es exclusivo). */
function nextDay(date: string): string {
  const m = DATE_RE.exec(date)!;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + 1));
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

/** Fecha y hora flotantes `yyyyMMddTHHmm00` sumando minutos a un inicio. */
function floating(date: string, time: string, addMinutes: number): string {
  const d = DATE_RE.exec(date)!;
  const t = TIME_RE.exec(time)!;
  const ms = Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2])) + addMinutes * 60_000;
  const x = new Date(ms);
  return `${x.getUTCFullYear()}${pad(x.getUTCMonth() + 1)}${pad(x.getUTCDate())}T${pad(x.getUTCHours())}${pad(x.getUTCMinutes())}00`;
}

function utcStamp(now: Date): string {
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(
    now.getUTCMinutes()
  )}${pad(now.getUTCSeconds())}Z`;
}

function uidOf(uid: string): string {
  return `${uid.replace(/[^A-Za-z0-9._-]+/g, "-")}@tubodadiy`;
}

function eventLines(event: IcsEvent, stamp: string): string[] | null {
  const day = icsDate(event.date);
  if (!day) return null;
  const time = event.time && TIME_RE.test(event.time) ? event.time : null;
  const lines = ["BEGIN:VEVENT", `UID:${uidOf(event.uid)}`, `DTSTAMP:${stamp}`];
  if (time) {
    const duration = event.durationMin && event.durationMin > 0 ? Math.round(event.durationMin) : 60;
    lines.push(`DTSTART:${floating(event.date, time, 0)}`, `DTEND:${floating(event.date, time, duration)}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${nextDay(event.date)}`);
  }
  lines.push(`SUMMARY:${icsEscape(event.title || "—")}`);
  if (event.description?.trim()) lines.push(`DESCRIPTION:${icsEscape(event.description.trim())}`);
  if (event.location?.trim()) lines.push(`LOCATION:${icsEscape(event.location.trim())}`);
  if (event.url && /^https?:\/\//i.test(event.url)) lines.push(`URL:${event.url.replace(/[\r\n]/g, "")}`);
  const categories = (event.categories ?? []).map((c) => c.trim()).filter(Boolean);
  if (categories.length > 0) lines.push(`CATEGORIES:${categories.map(icsEscape).join(",")}`);
  // Los eventos de día completo no deben bloquear el día como «ocupado».
  lines.push(`TRANSP:${time ? "OPAQUE" : "TRANSPARENT"}`, "END:VEVENT");
  return lines;
}

/** Fichero `.ics` (líneas con CRLF, cortadas a 75 octetos). Los eventos con fecha no válida se omiten. */
export function buildIcs(events: readonly IcsEvent[], options: IcsOptions = {}): string {
  const stamp = utcStamp(options.now ?? new Date());
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:${PRODID}`, "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  if (options.calendarName?.trim()) lines.push(`X-WR-CALNAME:${icsEscape(options.calendarName.trim())}`);
  for (const event of events) {
    const eventPart = eventLines(event, stamp);
    if (eventPart) lines.push(...eventPart);
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join(CRLF) + CRLF;
}
