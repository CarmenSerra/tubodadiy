import type { PlanGift } from "@/lib/types";

/**
 * Modelo de la invitación pública. Es lo único que lee la página del enlace
 * (`/i/{slug}`), así que NUNCA lleva datos privados del plan (correos, etc.).
 * Vive en `publicInvitations/{slug}`.
 */

export type InvitationTemplateId = "botanico" | "minimal" | "elegante";

export interface InvitationPlace {
  name: string;
  address: string;
  /** Enlace (http/https) a un mapa; si falta, se usa una búsqueda con la dirección. */
  mapUrl: string;
  /** Hora `HH:mm` o vacío. */
  time: string;
}

/** Datos de regalo que se muestran (ya filtrados: solo si la pareja lo permite). */
export interface InvitationGift {
  iban: string;
  bizum: string;
  message: string;
}

/** Lo que edita la pareja. */
export interface InvitationContent {
  template: InvitationTemplateId;
  /** «Ana & Luis». */
  names: string;
  /** `yyyy-MM-dd` o vacío. */
  date: string;
  ceremony: InvitationPlace;
  banquet: InvitationPlace;
  message: string;
  /** Fecha límite para confirmar, `yyyy-MM-dd` o vacío (sin límite). */
  rsvpDeadline: string;
  /** La pareja quiere enseñar los datos del regalo. */
  showGift: boolean;
}

/** Lo que se ve en la página pública. */
export interface InvitationPublicData extends Omit<InvitationContent, "showGift"> {
  gift: InvitationGift | null;
}

/** Documento completo de `publicInvitations/{slug}`. */
export interface InvitationDoc extends InvitationContent {
  slug: string;
  planId: string;
  published: boolean;
  gift: InvitationGift | null;
  createdAt: number | null;
  updatedAt: number | null;
}

export const LIMITS = {
  names: 80,
  message: 700,
  placeName: 100,
  address: 200,
  url: 400,
  iban: 42,
  bizum: 32,
  giftMessage: 300,
  // Respuestas de los invitados
  guestName: 120,
  plusOneName: 120,
  dietary: 300,
  rsvpMessage: 1000,
} as const;

export const TEMPLATES: {
  id: InvitationTemplateId;
  label: string;
  hint: string;
  /** Colores de la miniatura del selector. */
  swatch: { bg: string; ink: string; accent: string };
}[] = [
  {
    id: "botanico",
    label: "Botánico",
    hint: "Lila y salvia, con hojas",
    swatch: { bg: "#f6f2ec", ink: "#26413c", accent: "#927aac" },
  },
  {
    id: "minimal",
    label: "Minimal",
    hint: "Limpio y tipográfico",
    swatch: { bg: "#ffffff", ink: "#1f1f26", accent: "#7a6a93" },
  },
  {
    id: "elegante",
    label: "Elegante",
    hint: "Ciruela oscuro",
    swatch: { bg: "#2f2e41", ink: "#f4f1eb", accent: "#d4c0ea" },
  },
];

export const DEFAULT_MESSAGE =
  "Nos haría muchísima ilusión que nos acompañes en un día tan especial. Confirma tu asistencia con un par de toques.";

const EMPTY_PLACE: InvitationPlace = { name: "", address: "", mapUrl: "", time: "" };

export function defaultContent(weddingDate: string | null): InvitationContent {
  return {
    template: "botanico",
    names: "",
    date: weddingDate ?? "",
    ceremony: { ...EMPTY_PLACE },
    banquet: { ...EMPTY_PLACE },
    message: DEFAULT_MESSAGE,
    rsvpDeadline: "",
    showGift: true,
  };
}

// ---- Saneado / validación (se usa al guardar y al leer del servidor) ----

const clip = (value: unknown, max: number): string =>
  (typeof value === "string" ? value : "").replace(/\r\n/g, "\n").trim().slice(0, max);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const cleanDate = (value: unknown): string => {
  const v = typeof value === "string" ? value.trim() : "";
  return DATE_RE.test(v) ? v : "";
};

const cleanTime = (value: unknown): string => {
  const v = typeof value === "string" ? value.trim() : "";
  return TIME_RE.test(v) ? v : "";
};

/** Solo http(s): evita `javascript:` y similares en los enlaces de la invitación. */
export function cleanUrl(value: unknown): string {
  const v = clip(value, LIMITS.url);
  if (!v) return "";
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function cleanPlace(value: unknown): InvitationPlace {
  const p = (value && typeof value === "object" ? value : {}) as Partial<InvitationPlace>;
  return {
    name: clip(p.name, LIMITS.placeName),
    address: clip(p.address, LIMITS.address),
    mapUrl: cleanUrl(p.mapUrl),
    time: cleanTime(p.time),
  };
}

const TEMPLATE_IDS = TEMPLATES.map((t) => t.id);

export function cleanContent(value: Partial<InvitationContent>): InvitationContent {
  return {
    template: TEMPLATE_IDS.includes(value.template as InvitationTemplateId)
      ? (value.template as InvitationTemplateId)
      : "botanico",
    names: clip(value.names, LIMITS.names),
    date: cleanDate(value.date),
    ceremony: cleanPlace(value.ceremony),
    banquet: cleanPlace(value.banquet),
    message: clip(value.message, LIMITS.message),
    rsvpDeadline: cleanDate(value.rsvpDeadline),
    showGift: Boolean(value.showGift),
  };
}

export function placeIsEmpty(place: InvitationPlace): boolean {
  return !place.name && !place.address;
}

// ---- Regalo ----

/**
 * Datos de regalo que acaban en el documento público: solo si la pareja lo
 * pidió en la invitación Y en los datos del regalo del plan, y hay algo que
 * mostrar. `null` en cualquier otro caso (no se publica nada).
 */
export function publicGift(plan: PlanGift | null | undefined, showGift: boolean): InvitationGift | null {
  if (!plan || !plan.showOnInvitation || !showGift) return null;
  const gift: InvitationGift = {
    iban: clip(plan.iban, LIMITS.iban),
    bizum: clip(plan.bizum, LIMITS.bizum),
    message: clip(plan.message, LIMITS.giftMessage),
  };
  return gift.iban || gift.bizum || gift.message ? gift : null;
}

export function sameGift(a: InvitationGift | null, b: InvitationGift | null): boolean {
  if (!a || !b) return a === b;
  return a.iban === b.iban && a.bizum === b.bizum && a.message === b.message;
}

// ---- Fechas ----

/** `yyyy-MM-dd` → fecha local (mediodía, para esquivar saltos de huso). */
function parseDay(value: string): Date | null {
  if (!DATE_RE.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12);
  return Number.isNaN(date.getTime()) ? null : date;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** «Sábado, 12 de septiembre de 2026». */
export function formatLongDate(value: string): string {
  const date = parseDay(value);
  if (!date) return "";
  return capitalize(
    new Intl.DateTimeFormat("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date)
  );
}

/** «12 de septiembre». */
export function formatShortDate(value: string): string {
  const date = parseDay(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long" }).format(date);
}

/** Partes para el sello de fecha: día, mes, año. */
export function dateParts(value: string): { day: string; month: string; year: string; weekday: string } | null {
  const date = parseDay(value);
  if (!date) return null;
  const f = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-ES", opts).format(date);
  return {
    day: f({ day: "numeric" }),
    month: f({ month: "long" }),
    year: f({ year: "numeric" }),
    weekday: capitalize(f({ weekday: "long" })),
  };
}

/** `HH:mm` → «17:30 h». */
export function formatTime(value: string): string {
  return TIME_RE.test(value) ? `${value} h` : "";
}

/** Hoy en España como `yyyy-MM-dd` (el plazo vence al acabar ese día). */
export function todayInSpain(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parts; // en-CA → yyyy-MM-dd
}

export function isDeadlinePassed(deadline: string, now: Date = new Date()): boolean {
  return Boolean(deadline) && todayInSpain(now) > deadline;
}

// ---- Enlaces ----

export function invitationPath(slug: string): string {
  return `/i/${slug}`;
}

export function mapLink(place: InvitationPlace): string {
  if (place.mapUrl) return place.mapUrl;
  const query = [place.name, place.address].filter(Boolean).join(", ");
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : "";
}

export function whatsappLink(data: { names: string; date: string }, url: string): string {
  const when = formatLongDate(data.date);
  const who = data.names.trim();
  const text =
    `${who ? `${who} os invitan a su boda` : "Estás invitado/a a nuestra boda"}` +
    `${when ? ` (${when})` : ""}. ` +
    `Aquí tienes la invitación y puedes confirmar tu asistencia: ${url}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Id aleatorio, impredecible, para el enlace (12 caracteres ≈ 60 bits). */
export function generateSlug(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789"; // sin caracteres que se confunden
  const bytes = new Uint8Array(14);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) {
    // 248 es múltiplo de 31: sin sesgo al repartir.
    if (b >= 248) continue;
    out += alphabet[b % alphabet.length];
    if (out.length === 12) break;
  }
  // Extremadamente improbable (≥3 descartes seguidos de 14 bytes); rellena sin sesgo.
  while (out.length < 12) {
    const [b] = crypto.getRandomValues(new Uint8Array(1));
    if (b < 248) out += alphabet[b % alphabet.length];
  }
  return out;
}

export const SLUG_RE = /^[a-z0-9]{10,40}$/;

// ---- Respuestas (RSVP) ----

export interface RsvpAnswer {
  name: string;
  attending: boolean;
  plusOne: boolean;
  plusOneName: string;
  dietary: string;
  message: string;
}

export interface RsvpRecord extends RsvpAnswer {
  id: string;
  /** Milisegundos desde 1970 de la última vez que se envió/editó. */
  updatedAt: number | null;
  createdAt: number | null;
}

export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Misma persona aunque cambie el orden («Pérez María» = «María Pérez»). */
export function nameKey(value: string): string {
  return normalizeName(value).split(" ").filter(Boolean).sort().join(" ");
}
