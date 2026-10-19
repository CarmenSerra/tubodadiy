import {
  ALLERGEN_IDS,
  DIET_ONLY_IDS,
  normalizeDietIds,
  type AllergenId,
  type DietId,
  type DietOnlyId,
} from "@/lib/diets";
import type { Guest } from "@/lib/types";

// Modelo puro del Banquete (sin React ni Firebase): tipos, constantes y los cálculos
// de mesas y de avisos entre el menú y las dietas de los invitados.

/** Tipos de plato, en el orden de la comida. `special` = opción infantil o especial. */
export const COURSES = ["appetizer", "starter", "main", "dessert", "cake", "drink", "special"] as const;
export type CourseId = (typeof COURSES)[number];

export function isCourseId(value: unknown): value is CourseId {
  return typeof value === "string" && (COURSES as readonly string[]).includes(value);
}

/** Platos con los que se cruzan las dietas de los invitados (la «comida» propiamente dicha). */
const CHECKED_COURSES: readonly CourseId[] = ["starter", "main", "dessert"];

export const TABLE_SHAPES = ["round", "rect"] as const;
export type TableShape = (typeof TABLE_SHAPES)[number];

export const MAX_TABLE_CAPACITY = 30;
export const DEFAULT_CAPACITY: Record<TableShape, number> = { round: 8, rect: 10 };

export interface Dish {
  id: string;
  course: CourseId;
  name: string;
  notes: string;
  /** Alérgenos que lleva el plato. */
  contains: AllergenId[];
  /** Dietas para las que está pensado (vegetariana, sin lactosa, halal…). */
  suitableFor: DietOnlyId[];
  createdAt: number | null;
}

export type DishInput = Omit<Dish, "id" | "createdAt">;

export interface BanquetTable {
  id: string;
  name: string;
  shape: TableShape;
  capacity: number;
  /** Ids de invitados sentados (pueden incluir invitados ya borrados: se ignoran). */
  guestIds: string[];
  order: number;
  createdAt: number | null;
}

export type TableInput = Pick<BanquetTable, "name" | "shape" | "capacity">;

// ---------- Invitados ----------

/** Alergias y dietas anotadas en el invitado (campo `dietIds` de la ficha). */
export function guestDietIds(guest: Guest): DietId[] {
  return normalizeDietIds(guest.dietIds);
}

export function seatsOf(guest: Guest): number {
  return 1 + (guest.plusOne ? 1 : 0);
}

/** Quien no viene no ocupa mesa ni cuenta para el menú. */
export function isComing(guest: Guest): boolean {
  return guest.rsvpStatus !== "declined";
}

export type GuestScope = "confirmed" | "all";

/** «Confirmados» o «todos los que vienen» (confirmados y pendientes; quien declina nunca se sienta). */
export function inScope(guest: Guest, scope: GuestScope): boolean {
  return scope === "all" ? isComing(guest) : guest.rsvpStatus === "confirmed";
}

// ---------- Mesas ----------

export interface TableView {
  table: BanquetTable;
  /** Invitados que siguen existiendo, en el orden en que se sentaron. */
  guests: Guest[];
  used: number;
  free: number;
}

/** Cruza las mesas con los invitados vivos. Cada invitado aparece en una sola mesa. */
export function buildTableViews(tables: BanquetTable[], guests: Guest[]): TableView[] {
  const byId = new Map(guests.map((g) => [g.id, g]));
  const seen = new Set<string>();
  return tables.map((table) => {
    const seated: Guest[] = [];
    for (const id of table.guestIds) {
      const guest = byId.get(id);
      if (!guest || seen.has(id)) continue;
      seen.add(id);
      seated.push(guest);
    }
    const used = seated.reduce((sum, g) => sum + seatsOf(g), 0);
    return { table, guests: seated, used, free: table.capacity - used };
  });
}

/** Invitados que aún no tienen mesa. */
export function unseatedGuests(views: TableView[], guests: Guest[]): Guest[] {
  const seated = new Set(views.flatMap((v) => v.guests.map((g) => g.id)));
  return guests.filter((g) => !seated.has(g.id));
}

/** Recuento de dietas de un grupo de invitados: [id, nº de invitados], en orden de catálogo. */
export function dietCounts(guests: readonly Guest[]): [DietId, number][] {
  const counts = new Map<DietId, number>();
  for (const g of guests) for (const id of guestDietIds(g)) counts.set(id, (counts.get(id) ?? 0) + 1);
  const order: readonly DietId[] = [...ALLERGEN_IDS, ...DIET_ONLY_IDS];
  return order.filter((id) => counts.has(id)).map((id) => [id, counts.get(id) ?? 0]);
}

// ---------- Menú frente a dietas ----------

/** Dieta que implica otras: un plato vegano también es vegetariano y sin lactosa. */
const IMPLIES: Partial<Record<DietOnlyId, DietOnlyId[]>> = {
  vegan: ["vegetarian", "lactoseFree"],
};

function dishSuits(dish: Dish, need: DietId): boolean {
  if ((ALLERGEN_IDS as readonly string[]).includes(need)) {
    return !dish.contains.includes(need as AllergenId);
  }
  const diet = need as DietOnlyId;
  return dish.suitableFor.some((s) => s === diet || IMPLIES[s]?.includes(diet));
}

export interface MenuNote {
  need: DietId;
  /** Invitados (que vienen) con esa necesidad. */
  guests: number;
  /** Platos en los que no hay ninguna opción para ellos. */
  courses: CourseId[];
}

/**
 * Cruza las dietas de los invitados con el menú. Para cada necesidad, mira cada plato
 * (entrante, principal, postre) que ya tiene opciones y avisa si ninguna le sirve.
 * Una opción «infantil / especial» sirve de alternativa en cualquier plato.
 */
export function menuNotes(guests: Guest[], dishes: Dish[]): MenuNote[] {
  const counts = dietCounts(guests.filter(isComing));
  const special = dishes.filter((d) => d.course === "special");
  const notes: MenuNote[] = [];
  for (const [need, count] of counts) {
    const missing = CHECKED_COURSES.filter((course) => {
      const options = dishes.filter((d) => d.course === course);
      if (options.length === 0) return false;
      return !options.concat(special).some((d) => dishSuits(d, need));
    });
    if (missing.length > 0) notes.push({ need, guests: count, courses: missing });
  }
  return notes;
}
