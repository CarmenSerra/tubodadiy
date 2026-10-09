import type { Guest, RsvpStatus } from "@/lib/types";

export type StatusFilter = "all" | RsvpStatus;

/** Valores centinela del desplegable de grupos (Radix Select no admite "" ). */
export const GROUP_ALL = "__all__";
export const GROUP_NONE = "__none__";

/** Minúsculas y sin tildes, para buscar "maria" y encontrar "María". */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

/** Grupos distintos (sin distinguir mayúsculas ni tildes), ordenados. */
export function listGroups(guests: Guest[]): string[] {
  const map = new Map<string, string>();
  for (const g of guests) {
    const label = g.groupName.trim();
    if (!label) continue;
    const key = normalizeText(label);
    if (!map.has(key)) map.set(key, label);
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, "es"));
}

export function hasUngrouped(guests: Guest[]): boolean {
  return guests.some((g) => !g.groupName.trim());
}

export interface GuestFilters {
  query: string;
  status: StatusFilter;
  group: string;
}

export const NO_FILTERS: GuestFilters = { query: "", status: "all", group: GROUP_ALL };

export function isFiltering(f: GuestFilters): boolean {
  return f.query.trim() !== "" || f.status !== "all" || f.group !== GROUP_ALL;
}

export function filterGuests(guests: Guest[], f: GuestFilters): Guest[] {
  const q = normalizeText(f.query);
  const group = f.group === GROUP_ALL || f.group === GROUP_NONE ? f.group : normalizeText(f.group);
  return guests.filter((g) => {
    if (f.status !== "all" && g.rsvpStatus !== f.status) return false;
    if (group === GROUP_NONE) {
      if (g.groupName.trim()) return false;
    } else if (group !== GROUP_ALL && normalizeText(g.groupName) !== group) {
      return false;
    }
    if (!q) return true;
    return normalizeText([g.name, g.plusOneName, g.groupName, g.notes, g.dietaryNotes].join(" ")).includes(q);
  });
}

/** Un invitado ocupa su cubierto y, si lleva acompañante, otro más. */
export function seatsOf(guest: Guest): number {
  return 1 + (guest.plusOne ? 1 : 0);
}

export interface SeatSummary {
  /** Cubiertos: confirmados y sus acompañantes (2 por invitado confirmado con +1). */
  seats: number;
  /** Invitados con acompañante que no han dicho que no (pendientes o confirmados). */
  withCompanion: number;
  /** De ellos, los que ya han confirmado. */
  withCompanionConfirmed: number;
  /** Cubiertos extra de acompañantes: uno por invitado en `withCompanion`. */
  extraSeats: number;
  /** Cubiertos extra ya confirmados. */
  extraSeatsConfirmed: number;
  /** Cubiertos si respondiera que sí toda la lista que no ha dicho que no. */
  maxSeats: number;
}

export function summarizeSeats(guests: Guest[]): SeatSummary {
  let seats = 0;
  let maxSeats = 0;
  let withCompanion = 0;
  let withCompanionConfirmed = 0;
  for (const g of guests) {
    if (g.rsvpStatus === "declined") continue;
    maxSeats += seatsOf(g);
    if (g.plusOne) withCompanion += 1;
    if (g.rsvpStatus === "confirmed") {
      seats += seatsOf(g);
      if (g.plusOne) withCompanionConfirmed += 1;
    }
  }
  return {
    seats,
    withCompanion,
    withCompanionConfirmed,
    extraSeats: withCompanion,
    extraSeatsConfirmed: withCompanionConfirmed,
    maxSeats,
  };
}

/** Cubiertos estimados: confirmados + sus acompañantes. */
export function estimateAttendees(guests: Guest[]): number {
  return summarizeSeats(guests).seats;
}

/** Nombre del acompañante para mostrar: el guardado, o el que la invitación dejó en las notas (datos antiguos). */
const LEGACY_COMPANION = /^Acompañante \(invitación\): (.+)$/m;
export function companionName(guest: Guest): string {
  if (!guest.plusOne) return "";
  const own = guest.plusOneName.trim();
  if (own) return own;
  return LEGACY_COMPANION.exec(guest.notes)?.[1]?.trim() ?? "";
}

/** Notas sin la línea de acompañante que escribía la invitación (ya se muestra aparte). */
export function visibleNotes(guest: Guest): string {
  return guest.notes
    .split("\n")
    .filter((l) => !LEGACY_COMPANION.test(l))
    .join("\n")
    .trim();
}
