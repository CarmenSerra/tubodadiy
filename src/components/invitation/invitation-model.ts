import { sortGiftItems, type GiftItem } from "@/components/plan-tools/gift-model";
import { DEFAULT_BACKGROUND, cleanBackground, type InvitationBackground } from "@/components/invitation/invitation-backgrounds";
import { DEFAULT_LAYOUT, cleanLayout, type InvitationLayout } from "@/components/invitation/invitation-layouts";
import {
  COLOR_ROLES,
  DEFAULT_PALETTE,
  manualEnvelope,
  normalizeHex,
  type InvitationPalette,
  type PaletteColors,
} from "@/components/invitation/invitation-theme";
import { DEFAULT_LANG, normalizeLang, type Lang } from "@/lib/i18n/config";
import { dateFormatter } from "@/lib/i18n/format";
import { getServerT } from "@/lib/i18n/server";
import type { GiftMode, PlanGift } from "@/lib/types";

/**
 * Modelo de la invitación pública. Es lo único que lee la página del enlace
 * (`/i/{slug}`), así que NUNCA lleva datos privados del plan (correos, etc.).
 * Vive en `publicInvitations/{slug}`.
 */

export type InvitationTemplateId = "botanico" | "minimal" | "elegante";

/**
 * OBSOLETO: la tarjeta ya no lleva imagen arriba (ni foto del lugar ni
 * ilustración). Los campos `imageMode` y `photo` de las invitaciones antiguas se
 * leen y se conservan tal cual, pero nadie los usa.
 */
export type InvitationImageMode = "photo" | "illustration" | "none";
export const IMAGE_MODES: readonly InvitationImageMode[] = ["photo", "illustration", "none"];

/**
 * Estilo compartido de todo el plan: la invitación y «Reserva la fecha» se ven
 * con la misma plantilla, paleta, fondo de la tarjeta y composición. Vive en
 * `weddingPlans/{id}/designs/style`.
 */
export interface InvitationStyle {
  template: InvitationTemplateId;
  palette?: InvitationPalette;
  /** Fondo de la tarjeta (liso, rayas, motivos…); la mesa de detrás siempre es lisa. */
  background?: InvitationBackground;
  /** Cómo se coloca la fecha, la hora, el lugar y los nombres. Sin valor, la clásica. */
  layout?: InvitationLayout;
  /**
   * Color del sobre (`#rrggbb`) de la vista previa y de «Reserva la fecha», SOLO si se eligió a mano.
   * Sin valor, el sobre sale de la paleta (ver `resolveEnvelope`).
   */
  envelopeColor?: string;
}

export interface InvitationPlace {
  name: string;
  address: string;
  /** Enlace (http/https) a un mapa; si falta, se usa una búsqueda con la dirección. */
  mapUrl: string;
  /** Hora `HH:mm` o vacío. */
  time: string;
}

/** Una cosa de la lista de regalos tal como la ven los invitados (sin prioridad ni estado). */
export interface InvitationGiftItem {
  name: string;
  /** Enlace http(s) o vacío. */
  link: string;
  /** Precio aproximado en euros, si lo hay. */
  price: number | null;
  note: string;
}

/**
 * Regalo que se muestra (ya filtrado: solo si la pareja lo permite). Sin `mode`
 * (invitaciones anteriores a la lista) es dinero. En modo lista solo van las
 * cosas aún por conseguir; no hay reservas: los invitados solo la ven.
 */
export interface InvitationGift {
  mode?: GiftMode;
  iban: string;
  bizum: string;
  message: string;
  items?: InvitationGiftItem[];
}

/** Lo que edita la pareja. */
export interface InvitationContent {
  template: InvitationTemplateId;
  /**
   * Idioma de la invitación pública (lo elige la pareja; el invitado no tiene
   * selector). Las invitaciones anteriores a este campo son en español.
   */
  lang: Lang;
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
  /**
   * Colores de la invitación (4 roles). Las invitaciones anteriores no lo
   * tienen: entonces se ven con los colores de su plantilla, como siempre.
   */
  palette?: InvitationPalette;
  /** Fondo de la tarjeta. Sin valor equivale a «liso». */
  background?: InvitationBackground;
  /** Composición de la tarjeta (compartida con «Reserva la fecha» cuando esta la sabe dibujar). */
  layout?: InvitationLayout;
  /** Color del sobre elegido a mano (compartido con «Reserva la fecha»); sin valor, el de la paleta. */
  envelopeColor?: string;
  /** Obsoleto e ignorado (ver `InvitationImageMode`). */
  imageMode?: InvitationImageMode;
  /** Obsoleto e ignorado: foto del lugar de invitaciones antiguas. */
  photo?: string;
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
  /** Foto como data URI (~60 KB de imagen en base64 + cabecera). */
  photo: 90_000,
  iban: 42,
  bizum: 32,
  giftMessage: 300,
  giftItems: 60,
  giftItemName: 100,
  giftItemNote: 200,
  giftItemPrice: 1_000_000,
  // Respuestas de los invitados
  guestName: 120,
  plusOneName: 120,
  dietary: 300,
  rsvpMessage: 1000,
} as const;

/** Plantillas. El nombre y la descripción salen de `invitation:templates.<id>.*`. */
export const TEMPLATES: {
  id: InvitationTemplateId;
  /** Colores de la miniatura del selector. */
  swatch: { bg: string; ink: string; accent: string };
}[] = [
  { id: "botanico", swatch: { bg: "#f6f2ec", ink: "#26413c", accent: "#927aac" } },
  { id: "minimal", swatch: { bg: "#ffffff", ink: "#1f1f26", accent: "#7a6a93" } },
  { id: "elegante", swatch: { bg: "#2f2e41", ink: "#f4f1eb", accent: "#d4c0ea" } },
];

/** Mensaje de bienvenida que lleva una invitación nueva, en el idioma de la invitación. */
export function defaultMessage(lang: Lang = DEFAULT_LANG): string {
  return getServerT(lang, "invitation")("defaults.message");
}

/** ¿El mensaje es el de serie de algún idioma (o está vacío)? Entonces se puede cambiar al cambiar de idioma. */
export function isDefaultMessage(message: string): boolean {
  const value = message.trim();
  return !value || (["es", "en"] as const).some((l) => defaultMessage(l) === value);
}

const EMPTY_PLACE: InvitationPlace = { name: "", address: "", mapUrl: "", time: "" };

export function defaultContent(weddingDate: string | null, lang: Lang = DEFAULT_LANG): InvitationContent {
  return {
    template: "botanico",
    lang,
    names: "",
    date: weddingDate ?? "",
    ceremony: { ...EMPTY_PLACE },
    banquet: { ...EMPTY_PLACE },
    message: defaultMessage(lang),
    rsvpDeadline: "",
    showGift: true,
    palette: { id: DEFAULT_PALETTE.id, colors: { ...DEFAULT_PALETTE.colors } },
    background: DEFAULT_BACKGROUND,
    layout: DEFAULT_LAYOUT,
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

/** Paleta guardada, saneada: `undefined` si falta o algún color no es `#rrggbb`. */
export function cleanPalette(value: unknown): InvitationPalette | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as { id?: unknown; colors?: unknown };
  if (!raw.colors || typeof raw.colors !== "object") return undefined;
  const source = raw.colors as Record<string, unknown>;
  const colors = {} as PaletteColors;
  for (const role of COLOR_ROLES) {
    const hex = normalizeHex(source[role]);
    if (!hex) return undefined;
    colors[role] = hex;
  }
  const id = typeof raw.id === "string" && /^[a-z0-9-]{1,32}$/.test(raw.id) ? raw.id : "custom";
  return { id, colors };
}

/** Foto guardada, saneada: data URI de imagen web o URL http(s); si no, vacío. */
export function cleanPhoto(value: unknown): string {
  if (typeof value !== "string") return "";
  const v = value.trim();
  if (/^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(v)) {
    return v.length <= LIMITS.photo ? v : "";
  }
  return cleanUrl(v);
}

export function cleanTemplate(value: unknown): InvitationTemplateId {
  return TEMPLATE_IDS.includes(value as InvitationTemplateId) ? (value as InvitationTemplateId) : "botanico";
}

/**
 * Color del sobre elegido a mano, saneado: `#rrggbb` o `undefined` (automático, el de la paleta).
 * El oliva que antes se guardaba siempre cuenta como automático.
 */
export function cleanEnvelopeColor(value: unknown): string | undefined {
  return manualEnvelope(value);
}

/** Estilo compartido, saneado (lo que se guarda en `designs/style`). */
export function cleanStyle(value: Partial<InvitationStyle> | null | undefined): InvitationStyle {
  const palette = cleanPalette(value?.palette);
  const background = cleanBackground(value?.background);
  const envelopeColor = cleanEnvelopeColor(value?.envelopeColor);
  return {
    template: cleanTemplate(value?.template),
    ...(palette ? { palette } : {}),
    ...(background ? { background } : {}),
    layout: cleanLayout(value?.layout),
    ...(envelopeColor ? { envelopeColor } : {}),
  };
}

export function styleOf(
  content: Pick<InvitationContent, "template" | "palette" | "background" | "layout" | "envelopeColor">
): InvitationStyle {
  return cleanStyle(content);
}

export function sameStyle(a: InvitationStyle, b: InvitationStyle): boolean {
  return JSON.stringify(cleanStyle(a)) === JSON.stringify(cleanStyle(b));
}

export function cleanContent(value: Partial<InvitationContent>): InvitationContent {
  const palette = cleanPalette(value.palette);
  const background = cleanBackground(value.background);
  const imageMode = IMAGE_MODES.includes(value.imageMode as InvitationImageMode)
    ? (value.imageMode as InvitationImageMode)
    : undefined;
  const photo = cleanPhoto(value.photo);
  const envelopeColor = cleanEnvelopeColor(value.envelopeColor);
  return {
    template: TEMPLATE_IDS.includes(value.template as InvitationTemplateId)
      ? (value.template as InvitationTemplateId)
      : "botanico",
    lang: normalizeLang(value.lang),
    names: clip(value.names, LIMITS.names),
    date: cleanDate(value.date),
    ceremony: cleanPlace(value.ceremony),
    banquet: cleanPlace(value.banquet),
    message: clip(value.message, LIMITS.message),
    rsvpDeadline: cleanDate(value.rsvpDeadline),
    showGift: Boolean(value.showGift),
    layout: cleanLayout(value.layout),
    // Solo si existen: Firestore no admite `undefined` y las invitaciones antiguas no los tienen.
    ...(palette ? { palette } : {}),
    ...(background ? { background } : {}),
    ...(envelopeColor ? { envelopeColor } : {}),
    ...(imageMode ? { imageMode } : {}),
    ...(photo ? { photo } : {}),
  };
}

export function placeIsEmpty(place: InvitationPlace): boolean {
  return !place.name && !place.address;
}

const placeKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/**
 * ¿Ceremonia y banquete son el mismo sitio? Sí si el banquete está vacío o si
 * coinciden el nombre o la dirección (sin tildes ni mayúsculas).
 */
export function samePlace(a: InvitationPlace, b: InvitationPlace): boolean {
  if (placeIsEmpty(b) || placeIsEmpty(a)) return true;
  const [na, nb] = [placeKey(a.name), placeKey(b.name)];
  const [aa, ab] = [placeKey(a.address), placeKey(b.address)];
  return Boolean((na && na === nb) || (aa && aa === ab));
}

// ---- Regalo ----

/** Lo que se copia de la lista: las cosas aún por conseguir, las más importantes primero. */
function publicGiftItems(items: GiftItem[]): InvitationGiftItem[] {
  return sortGiftItems(items.filter((i) => !i.achieved && i.name.trim()))
    .slice(0, LIMITS.giftItems)
    .map((i) => ({
      name: clip(i.name, LIMITS.giftItemName),
      link: cleanUrl(i.link),
      price: cleanPrice(i.price),
      note: clip(i.note, LIMITS.giftItemNote),
    }));
}

function cleanPrice(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.min(value, LIMITS.giftItemPrice)
    : null;
}

/**
 * Datos de regalo que acaban en el documento público: solo si la pareja lo
 * pidió en la invitación Y en los datos del regalo del plan, y hay algo que
 * mostrar. `null` en cualquier otro caso (no se publica nada). En modo lista se
 * copia una foto saneada de la lista (sin lo conseguido).
 */
export function publicGift(
  plan: PlanGift | null | undefined,
  items: GiftItem[],
  showGift: boolean
): InvitationGift | null {
  if (!plan || !plan.showOnInvitation || !showGift) return null;
  if (plan.mode === "list") {
    const message = clip(plan.listMessage, LIMITS.giftMessage);
    const list = publicGiftItems(items);
    return list.length > 0 || message
      ? { mode: "list", iban: "", bizum: "", message, items: list }
      : null;
  }
  const gift: InvitationGift = {
    mode: "money",
    iban: clip(plan.iban, LIMITS.iban),
    bizum: clip(plan.bizum, LIMITS.bizum),
    message: clip(plan.message, LIMITS.giftMessage),
  };
  return gift.iban || gift.bizum || gift.message ? gift : null;
}

/**
 * Regalo de un documento público ya leído (cliente o servidor), saneado: no se
 * fía de lo guardado. `null` si no hay nada que enseñar.
 */
export function cleanInvitationGift(raw: unknown): InvitationGift | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Record<string, unknown>;
  const mode: GiftMode = g.mode === "list" ? "list" : "money";
  const base = {
    iban: clip(g.iban, LIMITS.iban),
    bizum: clip(g.bizum, LIMITS.bizum),
    message: clip(g.message, LIMITS.giftMessage),
  };
  if (mode === "money") return base.iban || base.bizum || base.message ? { mode, ...base } : null;
  const items = (Array.isArray(g.items) ? g.items : [])
    .filter((i): i is Record<string, unknown> => Boolean(i) && typeof i === "object")
    .slice(0, LIMITS.giftItems)
    .map((i) => ({
      name: clip(i.name, LIMITS.giftItemName),
      link: cleanUrl(i.link),
      price: cleanPrice(i.price),
      note: clip(i.note, LIMITS.giftItemNote),
    }))
    .filter((i) => i.name);
  return items.length > 0 || base.message ? { mode, iban: "", bizum: "", message: base.message, items } : null;
}

export function sameGift(a: InvitationGift | null, b: InvitationGift | null): boolean {
  if (!a || !b) return a === b;
  return (
    (a.mode ?? "money") === (b.mode ?? "money") &&
    a.iban === b.iban &&
    a.bizum === b.bizum &&
    a.message === b.message &&
    JSON.stringify(a.items ?? []) === JSON.stringify(b.items ?? [])
  );
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

/** «Sábado, 12 de septiembre de 2026» / «Saturday 12 September 2026». */
export function formatLongDate(value: string, lang: Lang = DEFAULT_LANG): string {
  const date = parseDay(value);
  if (!date) return "";
  return capitalize(
    dateFormatter(lang, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date)
  );
}

/** «12 de septiembre» / «12 September». */
export function formatShortDate(value: string, lang: Lang = DEFAULT_LANG): string {
  const date = parseDay(value);
  if (!date) return "";
  return dateFormatter(lang, { day: "numeric", month: "long" }).format(date);
}

export interface DateParts {
  /** «24» */
  day: string;
  /** «octubre» */
  month: string;
  /** «10» */
  monthNumber: string;
  /** «2026» */
  year: string;
  /** «Sábado» */
  weekday: string;
}

/** Partes para el sello de fecha: día, mes, año. */
export function dateParts(value: string, lang: Lang = DEFAULT_LANG): DateParts | null {
  const date = parseDay(value);
  if (!date) return null;
  const f = (opts: Intl.DateTimeFormatOptions) => dateFormatter(lang, opts).format(date);
  return {
    day: f({ day: "numeric" }),
    month: f({ month: "long" }),
    monthNumber: String(date.getMonth() + 1).padStart(2, "0"),
    year: f({ year: "numeric" }),
    weekday: capitalize(f({ weekday: "long" })),
  };
}

export interface CalendarMonth {
  /** «Octubre 2026» */
  title: string;
  /** Iniciales de los días de la semana, de lunes a domingo. */
  weekdays: string[];
  /** Los días del mes en filas de 7 (de lunes a domingo); `null` = hueco. */
  cells: (number | null)[];
  /** El día de la boda. */
  day: number;
}

/** Calendario del mes de la fecha (semanas de lunes a domingo) para la composición «Calendario». */
export function calendarOf(value: string, lang: Lang = DEFAULT_LANG): CalendarMonth | null {
  const date = parseDay(value);
  if (!date) return null;
  const [year, month] = [date.getFullYear(), date.getMonth()];
  const lead = (new Date(year, month, 1, 12).getDay() + 6) % 7;
  const total = new Date(year, month + 1, 0, 12).getDate();
  const cells: (number | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  // 5 de enero de 2026 fue lunes: de ahí salen las iniciales en el orden de la semana.
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    dateFormatter(lang, { weekday: "narrow" }).format(new Date(2026, 0, 5 + i, 12))
  );
  const monthName = dateFormatter(lang, { month: "long" }).format(date);
  return { title: `${capitalize(monthName)} ${year}`, weekdays, cells, day: date.getDate() };
}

/** `HH:mm` → «17:30 h» (es) / «17:30» (en). */
export function formatTime(value: string, lang: Lang = DEFAULT_LANG): string {
  return TIME_RE.test(value) ? getServerT(lang, "invitation")("view.time", { time: value }) : "";
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

/** Enlace de WhatsApp con el texto en el idioma de la invitación (lo leerán los invitados). */
export function whatsappLink(data: { names: string; date: string; lang?: Lang }, url: string): string {
  const lang = normalizeLang(data.lang);
  const t = getServerT(lang, "invitation");
  const when = formatLongDate(data.date, lang);
  const who = data.names.trim();
  const text = t("share.whatsapp", {
    intro: who ? t("share.introNames", { names: who }) : t("share.introGeneric"),
    when: when ? ` (${when})` : "",
    url,
  });
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

export const SLUG_MIN = 3;
export const SLUG_MAX = 60;
/** Enlaces válidos: minúsculas, números y guiones bajos. Los aleatorios antiguos (12 letras/números) también valen. */
export const SLUG_RE = /^[a-z0-9_]{3,60}$/;

/** Texto → trozo de enlace: sin tildes, en minúsculas, con guiones bajos («Ana María» → «ana_maria»). */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Recorta a la longitud máxima sin dejar un «_» colgando. */
export function clampSlug(slug: string): string {
  return slug.slice(0, SLUG_MAX).replace(/_+$/g, "");
}

/** «Ana & Luis» → «ana_y_luis» («ana_and_luis» en inglés); un solo nombre → «ana». */
export function slugFromNames(names: string, lang: Lang = DEFAULT_LANG): string {
  const parts = names
    .split(/\s*&\s*|\s+\+\s+|\s+(?:y|e|and)\s+/i)
    .map(slugify)
    .filter(Boolean);
  const joiner = lang === "en" ? "and" : "y";
  return clampSlug(parts.join(`_${joiner}_`));
}

/** Propuesta de enlace a partir de los nombres de la pareja o, si no hay, del nombre del plan. */
export function proposeSlug(names: string, planTitle: string, lang: Lang = DEFAULT_LANG): string {
  const title = planTitle.trim().replace(/^(?:boda\s+(?:de|del)|wedding\s+of)\s+/i, "");
  for (const source of [names, title]) {
    const slug = slugFromNames(source, lang);
    if (slug.length >= SLUG_MIN) return slug;
  }
  return "";
}

/** Texto de la caja del enlace → enlace: solo [a-z0-9_] (convierte espacios y guiones medios en «_»). */
export function typedSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, SLUG_MAX);
}

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

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
