// Catálogo compartido de alergias, intolerancias y dietas. Sin dependencias de
// React ni de i18n: sirve igual en cliente, servidor y scripts. Los textos
// viven en el namespace `diets` (src/locales/<lang>/diets.json) y los iconos
// en src/components/diet-icons.tsx.

/** Los 14 alérgenos de declaración obligatoria en la UE. */
export const ALLERGEN_IDS = [
  "gluten",
  "crustaceans",
  "egg",
  "fish",
  "peanut",
  "soy",
  "dairy",
  "treeNuts",
  "celery",
  "mustard",
  "sesame",
  "sulfites",
  "lupin",
  "molluscs",
] as const;

/** Dietas y condiciones que no son alérgenos de la lista UE. */
export const DIET_ONLY_IDS = [
  "vegetarian",
  "vegan",
  "lactoseFree",
  "diabetes",
  "pregnancy",
  "halal",
  "kosher",
  "kids",
] as const;

/** Todos los ids, alérgenos primero. El orden es el de las listas y selectores. */
export const DIET_IDS = [...ALLERGEN_IDS, ...DIET_ONLY_IDS] as const;

export type AllergenId = (typeof ALLERGEN_IDS)[number];
export type DietOnlyId = (typeof DIET_ONLY_IDS)[number];
export type DietId = (typeof DIET_IDS)[number];

export type DietGroup = "allergen" | "diet";

export const DIET_GROUPS: readonly DietGroup[] = ["allergen", "diet"];

/** Ids de cada grupo, en orden de catálogo. */
export const DIET_IDS_BY_GROUP: Record<DietGroup, readonly DietId[]> = {
  allergen: ALLERGEN_IDS,
  diet: DIET_ONLY_IDS,
};

export function dietGroupOf(id: DietId): DietGroup {
  return (ALLERGEN_IDS as readonly string[]).includes(id) ? "allergen" : "diet";
}

export function isDietId(value: unknown): value is DietId {
  return typeof value === "string" && (DIET_IDS as readonly string[]).includes(value);
}

/**
 * Limpia un valor leído de Firestore (o de un formulario): descarta lo que no
 * sea un id conocido, quita duplicados y devuelve el orden del catálogo.
 */
export function normalizeDietIds(value: unknown): DietId[] {
  if (!Array.isArray(value)) return [];
  const found = new Set<DietId>();
  for (const item of value) if (isDietId(item)) found.add(item);
  return DIET_IDS.filter((id) => found.has(id));
}

/** Recuento por id de una lista de listas de ids (solo ids con al menos 1). */
export function countDietIds(lists: readonly (readonly DietId[])[]): Partial<Record<DietId, number>> {
  const counts: Partial<Record<DietId, number>> = {};
  for (const ids of lists) for (const id of ids) counts[id] = (counts[id] ?? 0) + 1;
  return counts;
}
