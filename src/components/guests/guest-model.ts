import { countDietIds, type DietId } from "@/lib/diets";
import type { Guest } from "@/lib/types";
import { normalizeText, seatsOf } from "./guest-filters";

/** Cómo se agrupa la lista de invitados. */
export type GroupBy = "none" | "group" | "household";

export interface GuestSection {
  /** Clave estable de la sección ("" = invitados sin grupo / sin familia). */
  key: string;
  /** Nombre a mostrar; `null` en la sección «sin grupo» (la traduce la interfaz) o si no se agrupa. */
  label: string | null;
  guests: Guest[];
}

/** Familias distintas (sin distinguir mayúsculas ni tildes), ordenadas. */
export function listHouseholds(guests: readonly Guest[]): string[] {
  const map = new Map<string, string>();
  for (const g of guests) {
    const label = g.householdName.trim();
    if (!label) continue;
    const key = normalizeText(label);
    if (!map.has(key)) map.set(key, label);
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, "es"));
}

/** Parte la lista en secciones por grupo o por familia; «sin grupo» va siempre al final. */
export function sectionGuests(guests: readonly Guest[], by: GroupBy): GuestSection[] {
  if (by === "none") return [{ key: "", label: null, guests: [...guests] }];
  const nameOf = (g: Guest) => (by === "group" ? g.groupName : g.householdName).trim();
  const map = new Map<string, GuestSection>();
  for (const g of guests) {
    const label = nameOf(g);
    const key = normalizeText(label);
    const section = map.get(key);
    if (section) section.guests.push(g);
    else map.set(key, { key, label: label || null, guests: [g] });
  }
  return [...map.values()].sort((a, b) => {
    if (!a.label) return 1;
    if (!b.label) return -1;
    return a.label.localeCompare(b.label, "es");
  });
}

// ---- Alergias y dietas ----

/** Invitados que no han dicho que no: los que de verdad habrá que atender. */
export function attending(guests: readonly Guest[]): Guest[] {
  return guests.filter((g) => g.rsvpStatus !== "declined");
}

/** Recuento de invitados (que no han dicho que no) por alergia o dieta. */
export function dietCounts(guests: readonly Guest[]): Partial<Record<DietId, number>> {
  return countDietIds(attending(guests).map((g) => g.dietIds));
}

// ---- Alojamiento y transporte ----

export interface NeedBreakdown {
  /** Invitados que lo necesitan. */
  guests: number;
  /** Personas contando acompañantes. */
  people: number;
  /** Por sitio (alojamiento) u origen/autobús (transporte); `label` vacío = sin indicar. */
  places: { label: string; count: number }[];
}

function breakdown(list: readonly Guest[], placeOf: (g: Guest) => string): NeedBreakdown {
  const places = new Map<string, { label: string; count: number }>();
  let people = 0;
  for (const g of list) {
    people += seatsOf(g);
    const label = placeOf(g).trim();
    const key = normalizeText(label);
    const entry = places.get(key);
    if (entry) entry.count += 1;
    else places.set(key, { label, count: 1 });
  }
  return {
    guests: list.length,
    people,
    places: [...places.values()].sort((a, b) => {
      if (!a.label) return 1;
      if (!b.label) return -1;
      return b.count - a.count || a.label.localeCompare(b.label, "es");
    }),
  };
}

export function lodgingNeeds(guests: readonly Guest[]): NeedBreakdown {
  return breakdown(attending(guests).filter((g) => g.needsLodging), (g) => g.lodgingPlace);
}

export function transportNeeds(guests: readonly Guest[]): NeedBreakdown {
  return breakdown(attending(guests).filter((g) => g.needsTransport), (g) => g.transportFrom);
}

// ---- Regalos y agradecimientos ----

export function hasGift(g: Guest): boolean {
  return g.giftReceived.trim() !== "" || g.giftAmount !== null;
}

/** Unidad de agradecimiento: una familia (si la hay) o un invitado suelto. */
export interface ThankUnit {
  key: string;
  /** Nombre de la familia, o del invitado si va solo. */
  label: string;
  isHousehold: boolean;
  /** Invitados de la unidad con regalo registrado. */
  guests: Guest[];
  /** Importes sumados (0 si ninguno lleva importe). */
  amount: number;
  /** Todos los regalos de la unidad tienen ya su agradecimiento. */
  sent: boolean;
  /** Última fecha de envío entre los agradecidos, si la hay. */
  sentDate: string | null;
}

/** Unidades con al menos un regalo, ordenadas por nombre. */
export function thankUnits(guests: readonly Guest[]): ThankUnit[] {
  const map = new Map<string, ThankUnit>();
  for (const g of guests) {
    if (!hasGift(g)) continue;
    const household = g.householdName.trim();
    const key = household ? `h:${normalizeText(household)}` : `g:${g.id}`;
    let unit = map.get(key);
    if (!unit) {
      unit = {
        key,
        label: household || g.name,
        isHousehold: Boolean(household),
        guests: [],
        amount: 0,
        sent: true,
        sentDate: null,
      };
      map.set(key, unit);
    }
    unit.guests.push(g);
    unit.amount += g.giftAmount ?? 0;
    if (!g.thankYouSent) unit.sent = false;
    else if (g.thankYouDate && (!unit.sentDate || g.thankYouDate > unit.sentDate)) unit.sentDate = g.thankYouDate;
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, "es"));
}

/** Hoy como `yyyy-MM-dd` en hora local. */
export function todayValue(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
