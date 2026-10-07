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
    return normalizeText([g.name, g.groupName, g.notes, g.dietaryNotes].join(" ")).includes(q);
  });
}

/** Asistentes estimados: confirmados + confirmados que llevan acompañante. */
export function estimateAttendees(guests: Guest[]): number {
  return guests.reduce(
    (sum, g) => (g.rsvpStatus === "confirmed" ? sum + 1 + (g.plusOne ? 1 : 0) : sum),
    0
  );
}
