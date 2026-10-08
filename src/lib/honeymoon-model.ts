// Modelo de la «Luna de miel»: tipos, listas fijas (tipos de reserva, grupos de la
// maleta, artículos sugeridos) y cálculos puros. Sin dependencias de Firebase ni de
// React, para poder usarlo tanto desde `lib/firebase/honeymoon.ts` como desde la UI.
//
// Estructura en Firestore (reglas: weddingPlans/{planId}/honeymoon/{document=**}):
//   weddingPlans/{planId}/honeymoon/settings                  ← ajustes (presupuesto, maleta sembrada)
//   weddingPlans/{planId}/honeymoon/data/destinations/{id}    ← ideas de destino
//   weddingPlans/{planId}/honeymoon/data/days/{id}            ← itinerario por días
//   weddingPlans/{planId}/honeymoon/data/bookings/{id}        ← reservas
//   weddingPlans/{planId}/honeymoon/data/packing/{id}         ← maleta y papeles

/** Ruta de la pestaña dentro de un plan (para enlazarla desde los pasos). */
export function honeymoonHref(planId: string): string {
  return `/plan/${planId}/honeymoon`;
}

/** ¿La ruta es la de la Luna de miel? (activa el tema tropical y su fondo). */
export function isHoneymoonPath(pathname: string | null | undefined): boolean {
  return /^\/plan\/[^/]+\/honeymoon(\/|$)/.test(pathname ?? "");
}

// ---------- Destinos ----------

export interface Destination {
  id: string;
  name: string;
  country: string;
  notes: string;
  /** Enlace a una web (opcional). */
  link: string;
  /** URL de una imagen para la miniatura (opcional). */
  imageUrl: string;
  /** Precio aproximado del viaje (€), o null si aún no se sabe. */
  approxPrice: number | null;
  /** uid de cada miembro del plan al que le gusta este destino. */
  votes: string[];
  /** El destino elegido (solo uno a la vez). */
  chosen: boolean;
  createdAt: number | null;
}

export type DestinationInput = Omit<Destination, "id" | "createdAt" | "votes" | "chosen">;

// ---------- Itinerario ----------

export interface DayActivity {
  id: string;
  /** Hora «HH:MM» o cadena vacía si no tiene. */
  time: string;
  text: string;
}

export interface TripDay {
  id: string;
  /** Posición en el itinerario (el número de día sale de ella). */
  order: number;
  /** Fecha «yyyy-MM-dd» o cadena vacía. */
  date: string;
  place: string;
  activities: DayActivity[];
  createdAt: number | null;
}

export type TripDayInput = Pick<TripDay, "date" | "place" | "activities">;

// ---------- Reservas ----------

export const BOOKING_TYPES = ["vuelo", "hotel", "excursion", "seguro", "otro"] as const;
export type BookingType = (typeof BOOKING_TYPES)[number];

export const BOOKING_TYPE_LABEL: Record<BookingType, string> = {
  vuelo: "Vuelo",
  hotel: "Hotel",
  excursion: "Excursión",
  seguro: "Seguro",
  otro: "Otro",
};

export function isBookingType(value: unknown): value is BookingType {
  return typeof value === "string" && (BOOKING_TYPES as readonly string[]).includes(value);
}

export interface Booking {
  id: string;
  type: BookingType;
  name: string;
  /** Fecha «yyyy-MM-dd» o cadena vacía. */
  date: string;
  price: number;
  confirmationCode: string;
  paid: boolean;
  createdAt: number | null;
}

export type BookingInput = Omit<Booking, "id" | "createdAt">;

export interface BookingTotals {
  /** Suma de todas las reservas. */
  booked: number;
  /** Lo ya pagado. */
  paid: number;
  /** Lo reservado pero aún por pagar. */
  toPay: number;
  paidCount: number;
  count: number;
  /** Presupuesto menos lo reservado (negativo si te pasas). */
  remaining: number;
  /** Cuánto se supera el presupuesto (0 si no se supera o no hay presupuesto). */
  over: number;
  /** Porcentaje reservado sobre el presupuesto, para la barra (0-100). */
  ratio: number;
  /** Porcentaje real, sin tope (para el texto). */
  percent: number;
}

export function computeBookingTotals(budget: number, bookings: Booking[]): BookingTotals {
  const booked = bookings.reduce((sum, b) => sum + (b.price || 0), 0);
  const paid = bookings.reduce((sum, b) => sum + (b.paid ? b.price || 0 : 0), 0);
  const remaining = budget - booked;
  const percent = budget > 0 ? Math.round((booked / budget) * 100) : 0;
  return {
    booked,
    paid,
    toPay: booked - paid,
    paidCount: bookings.filter((b) => b.paid).length,
    count: bookings.length,
    remaining,
    over: budget > 0 && remaining < 0 ? -remaining : 0,
    ratio: Math.max(0, Math.min(100, percent)),
    percent,
  };
}

// ---------- Maleta y papeles ----------

export const PACKING_GROUPS = ["Papeles", "Salud", "Ropa", "Tecnología", "Otros"] as const;
export type PackingGroup = (typeof PACKING_GROUPS)[number];

export function isPackingGroup(value: unknown): value is PackingGroup {
  return typeof value === "string" && (PACKING_GROUPS as readonly string[]).includes(value);
}

export interface PackingItem {
  id: string;
  label: string;
  group: PackingGroup;
  checked: boolean;
  /** Pista opcional bajo el nombre (en los artículos sugeridos). */
  note: string;
  /** Viene de la lista sugerida (se puede volver a recuperar si se borra). */
  suggested: boolean;
  order: number;
}

export interface SuggestedPackingItem {
  /** Id estable: sembrar la lista dos veces no la duplica. */
  id: string;
  label: string;
  group: PackingGroup;
  note?: string;
}

export const SUGGESTED_PACKING: SuggestedPackingItem[] = [
  { id: "sug-pasaporte", label: "Pasaportes", group: "Papeles", note: "Comprueba que no caducan en los próximos 6 meses." },
  { id: "sug-dni", label: "DNI", group: "Papeles" },
  { id: "sug-visados", label: "Visados", group: "Papeles", note: "Mira si el destino los pide y con cuánta antelación." },
  { id: "sug-billetes", label: "Billetes y reservas a mano", group: "Papeles", note: "En el móvil y, por si acaso, impresos." },
  { id: "sug-seguro", label: "Seguro de viaje", group: "Papeles", note: "Con la póliza y el teléfono de asistencia guardados." },
  { id: "sug-tarjetas", label: "Tarjetas y algo de efectivo", group: "Papeles" },
  { id: "sug-vacunas", label: "Vacunas", group: "Salud", note: "Consúltalas en tu centro de salud con tiempo." },
  { id: "sug-botiquin", label: "Botiquín y medicación habitual", group: "Salud" },
  { id: "sug-solar", label: "Protector solar", group: "Salud" },
  { id: "sug-repelente", label: "Repelente de mosquitos", group: "Salud" },
  { id: "sug-banador", label: "Bañador", group: "Ropa" },
  { id: "sug-chanclas", label: "Chanclas y sandalias", group: "Ropa" },
  { id: "sug-ligera", label: "Ropa ligera y fresca", group: "Ropa" },
  { id: "sug-gorra", label: "Gorra o sombrero y gafas de sol", group: "Ropa" },
  { id: "sug-calzado", label: "Calzado cómodo para caminar", group: "Ropa" },
  { id: "sug-abrigo", label: "Una prenda de abrigo ligera", group: "Ropa", note: "Para vuelos, noches y excursiones." },
  { id: "sug-adaptador", label: "Adaptador de enchufe", group: "Tecnología" },
  { id: "sug-cargadores", label: "Cargadores y batería externa", group: "Tecnología" },
  { id: "sug-datos", label: "Datos móviles o eSIM", group: "Tecnología" },
  { id: "sug-toalla", label: "Toalla de playa", group: "Otros" },
  { id: "sug-candado", label: "Candado para la maleta", group: "Otros" },
];

export interface PackingProgress {
  done: number;
  total: number;
  percent: number;
}

export function packingProgress(items: PackingItem[]): PackingProgress {
  const total = items.length;
  const done = items.filter((i) => i.checked).length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

// ---------- Ajustes ----------

export interface HoneymoonSettings {
  /** Presupuesto propio de la luna de miel (€), independiente del de la boda. */
  budgetTotal: number;
  /** La lista sugerida de la maleta ya se sembró (no se vuelve a hacer sola). */
  packingSeeded: boolean;
}

export const DEFAULT_SETTINGS: HoneymoonSettings = { budgetTotal: 0, packingSeeded: false };

// ---------- Utilidades ----------

/** Solo http(s): nada de `javascript:` ni `data:` en enlaces o imágenes escritos por el equipo. */
export function isHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Añade `https://` si falta y devuelve cadena vacía si no es una URL válida. */
export function normalizeUrl(raw: string): string {
  const text = raw.trim();
  if (!text) return "";
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  return isHttpUrl(candidate) ? candidate : "";
}

/** Nombre corto del dominio de un enlace, para mostrarlo («booking.com»). */
export function urlHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Id corto para actividades (solo viven dentro del documento del día). */
export function newActivityId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Orden estable para un elemento nuevo al final de una lista. */
export function nextOrder(orders: number[]): number {
  return orders.length === 0 ? 1 : Math.max(...orders) + 1;
}

/** Variante de dibujo para la miniatura de un destino sin imagen (estable por nombre). */
export type SceneVariant = "playa" | "montana" | "selva" | "isla";
export const SCENE_VARIANTS: SceneVariant[] = ["playa", "montana", "selva", "isla"];

export function sceneFor(seed: string): SceneVariant {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return SCENE_VARIANTS[hash % SCENE_VARIANTS.length];
}
