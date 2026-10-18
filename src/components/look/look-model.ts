// Tipos y constantes puros de la pestaña «Estilo» (sin Firebase ni React).

/** Estado de una prenda, un servicio o un elemento: buscando → elegido → encargado → listo. */
export const LOOK_STATUSES = ["searching", "chosen", "ordered", "ready"] as const;
export type LookStatus = (typeof LOOK_STATUSES)[number];

export function isLookStatus(value: unknown): value is LookStatus {
  return (LOOK_STATUSES as readonly unknown[]).includes(value);
}

/** Secciones de la página; el id es también el ancla de la URL (`/estilo#vestuario`). */
export const SECTION_IDS = ["vestuario", "belleza", "anillos", "decoracion"] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export function isSectionId(value: unknown): value is SectionId {
  return (SECTION_IDS as readonly unknown[]).includes(value);
}

/** Máximo de imágenes en el moodboard (cada una es un documento de ≤ ~60 KB). */
export const MOODBOARD_MAX = 24;
/** Peso máximo de una imagen subida, ya comprimida. */
export const MOODBOARD_IMAGE_BYTES = 60 * 1024;
/** Lado mayor de una imagen subida. */
export const MOODBOARD_IMAGE_SIDE = 720;
/** Máximo de colores de la paleta. */
export const PALETTE_MAX = 8;

// ---------- Vestuario ----------

export const PEOPLE = ["partnerA", "partnerB", "bridesmaid", "groomsman", "kid", "other"] as const;
export type PersonId = (typeof PEOPLE)[number];

export function isPersonId(value: unknown): value is PersonId {
  return (PEOPLE as readonly unknown[]).includes(value);
}

export interface Outfit {
  id: string;
  who: PersonId;
  /** Nombre de la persona (opcional en la pareja; útil para damas, niños…). */
  personName: string;
  /** Prenda o look. */
  outfit: string;
  /** Tienda o diseñador (texto libre). */
  shop: string;
  /** Proveedor enlazado (solo lectura de la colección `vendors`), o "". */
  vendorId: string;
  vendorName: string;
  price: number | null;
  status: LookStatus;
  accessories: string;
  notes: string;
  /** Ya se ha añadido al presupuesto desde aquí. */
  inBudget: boolean;
  createdAt: number | null;
}

export type OutfitInput = Omit<Outfit, "id" | "createdAt">;

// ---------- Belleza ----------

export const BEAUTY_SERVICES = ["hair", "makeup", "both", "other"] as const;
export type BeautyService = (typeof BEAUTY_SERVICES)[number];

export function isBeautyService(value: unknown): value is BeautyService {
  return (BEAUTY_SERVICES as readonly unknown[]).includes(value);
}

export interface BeautyItem {
  id: string;
  service: BeautyService;
  /** Para quién es (texto libre: «Novia», «Madre de la novia»…). */
  forWho: string;
  provider: string;
  vendorId: string;
  vendorName: string;
  /** Prueba: día `yyyy-MM-dd`, hora `HH:mm` y lugar (todo opcional). */
  trialDate: string;
  trialTime: string;
  trialPlace: string;
  /** Hora a la que empiezan el día de la boda (`HH:mm`). */
  dayTime: string;
  price: number | null;
  status: LookStatus;
  notes: string;
  inBudget: boolean;
  createdAt: number | null;
}

export type BeautyInput = Omit<BeautyItem, "id" | "createdAt">;

export interface RoutineItem {
  id: string;
  label: string;
  done: boolean;
}

/** Claves (`look:beauty.routine.suggestions.<clave>`) de la rutina previa sugerida. */
export const ROUTINE_SUGGESTIONS = ["facial", "nails", "haircut", "hydration", "sleep", "brows"] as const;

// ---------- Alianzas ----------

export interface Rings {
  model: string;
  shop: string;
  vendorId: string;
  vendorName: string;
  sizeA: string;
  sizeB: string;
  engravingA: string;
  engravingB: string;
  price: number | null;
  status: LookStatus;
  /** Fecha de recogida `yyyy-MM-dd` o "". */
  pickupDate: string;
  notes: string;
  inBudget: boolean;
}

export const EMPTY_RINGS: Rings = {
  model: "",
  shop: "",
  vendorId: "",
  vendorName: "",
  sizeA: "",
  sizeB: "",
  engravingA: "",
  engravingB: "",
  price: null,
  status: "searching",
  pickupDate: "",
  notes: "",
  inBudget: false,
};

// ---------- Decoración y flores ----------

export const DECOR_KINDS = [
  "centerpieces",
  "bouquet",
  "boutonnieres",
  "ceremony",
  "arch",
  "aisle",
  "photocall",
  "tableware",
  "lighting",
  "signs",
  "other",
] as const;
export type DecorKind = (typeof DECOR_KINDS)[number];

export function isDecorKind(value: unknown): value is DecorKind {
  return (DECOR_KINDS as readonly unknown[]).includes(value);
}

export interface DecorItem {
  id: string;
  kind: DecorKind;
  /** Nombre propio; si falta se muestra el del tipo. */
  title: string;
  provider: string;
  vendorId: string;
  vendorName: string;
  status: LookStatus;
  price: number | null;
  notes: string;
  inBudget: boolean;
  createdAt: number | null;
}

export type DecorInput = Omit<DecorItem, "id" | "createdAt">;

// ---------- Moodboard y paleta ----------

export interface MoodImage {
  id: string;
  /** `url`: enlace externo; `upload`: imagen comprimida guardada en el documento (data URI). */
  kind: "url" | "upload";
  src: string;
  label: string;
  createdAt: number | null;
}

export interface StyleSettings {
  palette: string[];
  routine: RoutineItem[];
}

export const EMPTY_SETTINGS: StyleSettings = { palette: [], routine: [] };

/** Paletas de partida (hex en minúsculas). El nombre sale de `look:decor.palette.presets.<clave>`. */
export const PALETTE_PRESETS: { key: string; colors: string[] }[] = [
  { key: "lavenderSage", colors: ["#927aac", "#d4c0ea", "#8faf8a", "#d2d7cb", "#f4f1eb"] },
  { key: "dustyRose", colors: ["#c98b8b", "#e8c4c4", "#f4e4dc", "#a67c6d", "#7d8c6a"] },
  { key: "terracotta", colors: ["#b5654a", "#d9a58b", "#f0dcc8", "#8c6a4f", "#6f7d5c"] },
  { key: "dustyBlue", colors: ["#7f9bb5", "#b9cde0", "#e8eef3", "#c7b8a3", "#4f6275"] },
  { key: "burgundyGold", colors: ["#7a2e3b", "#b5495b", "#d4b06a", "#f2e6d4", "#3d4a3a"] },
];

const HEX_RE = /^#[0-9a-f]{6}$/i;

/** Hex válido de 6 cifras en minúsculas, o `null`. Acepta «927aac» sin almohadilla y «#fff». */
export function normalizeHex(value: string): string | null {
  let v = value.trim().toLowerCase();
  if (!v.startsWith("#")) v = `#${v}`;
  if (/^#[0-9a-f]{3}$/.test(v)) v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return HEX_RE.test(v) ? v : null;
}

/** Orden por fecha de creación (los recién creados, con `createdAt` aún a null, al final). */
export function byCreated<T extends { createdAt: number | null }>(a: T, b: T): number {
  return (a.createdAt ?? Infinity) - (b.createdAt ?? Infinity);
}

/** Nombre del proveedor a mostrar: el actual si sigue existiendo y, si no, el guardado. */
export function linkedVendorName(
  vendorId: string,
  savedName: string,
  vendors: { id: string; name: string }[]
): string {
  if (!vendorId) return "";
  return vendors.find((v) => v.id === vendorId)?.name || savedName;
}
