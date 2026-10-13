import type { TFunction } from "i18next";

import { communityOf } from "@/lib/places/spain";
import type { Vendor } from "@/lib/types";

// Lógica pura de la pestaña Proveedores: categorías, estados, URLs y agrupado.

/** Categorías de partida: siempre se muestran, en este orden, aunque estén vacías. */
export const STARTER_CATEGORIES = ["Finca", "Catering", "Fotógrafo"] as const;

/** Categorías del desplegable del formulario (las 3 primeras son las de partida). */
export const CATEGORY_OPTIONS = [
  ...STARTER_CATEGORIES,
  "Vídeo",
  "Música",
  "Flores",
  "Pastel",
  "Transporte",
  "Decoración",
] as const;

/** Valor interno de "Otra categoría…" en el desplegable. */
export const OTHER_CATEGORY = "__other";

/**
 * Clave de traducción (vendors:categories.<slug>) de cada categoría conocida. Los valores
 * guardados en Firestore son los nombres en español: solo se traducen al mostrarlos.
 */
const CATEGORY_SLUGS: Record<string, string> = {
  finca: "venue",
  catering: "catering",
  fotografo: "photographer",
  video: "video",
  musica: "music",
  flores: "flowers",
  pastel: "cake",
  transporte: "transport",
  decoracion: "decor",
  "musica para la ceremonia": "ceremonyMusic",
  "peluqueria y maquillaje": "hairMakeup",
  vestido: "dress",
  traje: "suit",
  alianzas: "rings",
  "animacion infantil": "kidsEntertainment",
  fotomaton: "photoBooth",
  "wedding planner": "weddingPlanner",
  invitaciones: "invitations",
  otros: "other",
};

/** Minúsculas y sin tildes: "Fotografía" y "fotografia " son la misma categoría. */
export function categoryKey(category: string): string {
  return category
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

// Nombres antiguos que se agrupan bajo la categoría actual.
const CATEGORY_ALIASES: Record<string, string> = {
  fotografia: "Fotógrafo",
  fotografo: "Fotógrafo",
  fotografa: "Fotógrafo",
  "musica / dj": "Música",
};

/** Nombre canónico de una categoría (respeta mayúsculas de las conocidas). */
export function canonicalCategory(category: string): string {
  const trimmed = category.trim();
  const key = categoryKey(trimmed);
  if (CATEGORY_ALIASES[key]) return CATEGORY_ALIASES[key];
  const known = CATEGORY_OPTIONS.find((c) => categoryKey(c) === key);
  return known ?? trimmed;
}

/** Clave (sin prefijo) de una categoría conocida, o undefined si es personalizada. */
export function categorySlug(category: string): string | undefined {
  return CATEGORY_SLUGS[categoryKey(canonicalCategory(category))];
}

/** Nombre a mostrar de una categoría: traducido si es conocida; las personalizadas, tal cual. */
export function categoryLabel(category: string, t: TFunction): string {
  const slug = categorySlug(category);
  return slug ? t(`categories.${slug}`, { ns: "vendors" }) : category;
}

export interface VendorGroup {
  category: string;
  vendors: Vendor[];
}

/**
 * Ordena de más nueva a más antigua (`createdAt` descendente). Una opción recién
 * creada llega un instante con `createdAt` a null (serverTimestamp pendiente): se
 * trata como la más nueva. Estable en los empates.
 */
export function sortByNewest(vendors: Vendor[]): Vendor[] {
  const age = (v: Vendor) => v.createdAt ?? Number.POSITIVE_INFINITY;
  return [...vendors].sort((a, b) => {
    const x = age(a);
    const y = age(b);
    return x === y ? 0 : x > y ? -1 : 1;
  });
}

/**
 * Una sección por categoría: primero las de partida (siempre presentes), luego
 * el resto de categorías conocidas con proveedores y, al final, las
 * personalizadas por orden alfabético.
 */
export function groupVendors(vendors: Vendor[]): VendorGroup[] {
  const byCategory = new Map<string, Vendor[]>();
  for (const category of STARTER_CATEGORIES) byCategory.set(category, []);
  for (const vendor of vendors) {
    const category = canonicalCategory(vendor.category) || "Otros";
    const list = byCategory.get(category) ?? [];
    list.push(vendor);
    byCategory.set(category, list);
  }
  const rank = (category: string) => {
    const i = CATEGORY_OPTIONS.findIndex((c) => c === category);
    return i === -1 ? CATEGORY_OPTIONS.length : i;
  };
  return [...byCategory.entries()]
    .sort(([a], [b]) => {
      const d = rank(a) - rank(b);
      return d !== 0 ? d : a.localeCompare(b, "es");
    })
    .map(([category, list]) => ({ category, vendors: sortByNewest(list) }));
}

/** Solo se aceptan enlaces http(s); evita esquemas como javascript:. */
export function isHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Comprobación laxa de email: algo@dominio.tld */
export function isLooseEmail(value: string): boolean {
  return /^\S+@\S+\.\S+$/.test(value.trim());
}

/** Enlace a Google Maps: el guardado, o una búsqueda con la dirección. */
export function mapsHref(vendor: Pick<Vendor, "mapsUrl" | "location">): string | null {
  if (isHttpUrl(vendor.mapsUrl)) return vendor.mapsUrl!.trim();
  const location = vendor.location?.trim();
  if (location) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  }
  return null;
}

// ---- Fincas y lugar ----

/** ¿Es la categoría «Finca» (descubrir fincas con Google Maps)? */
export function isVenueCategory(category: string): boolean {
  return categoryKey(canonicalCategory(category)) === "finca";
}

/** Provincia y comunidad de un proveedor guardado (la comunidad se deduce de la provincia si falta). */
export function vendorPlace(vendor: Pick<Vendor, "province" | "community">): {
  province?: string;
  community?: string;
} {
  const province = vendor.province?.trim() || undefined;
  const community = vendor.community?.trim() || (province ? communityOf(province) : undefined);
  return { province, community };
}

/** Filtro por lugar: una comunidad entera o una provincia concreta. */
export type LocationFilter = { kind: "community" | "province"; value: string } | null;

/** Comunidad con la que se agrupan los proveedores sin comunidad (se traduce al mostrar). */
export const OTHER_PLACES = "Otras ubicaciones";

export interface LocationOptions {
  /** Comunidades con proveedores guardados, con sus provincias (solo las que tienen proveedores). */
  communities: { name: string; provinces: string[] }[];
}

/** Opciones del filtro, construidas SOLO con los lugares de los proveedores guardados. */
export function locationOptions(vendors: Vendor[]): LocationOptions {
  const byCommunity = new Map<string, Set<string>>();
  for (const vendor of vendors) {
    const { province, community } = vendorPlace(vendor);
    if (!province && !community) continue;
    const key = community ?? OTHER_PLACES;
    const set = byCommunity.get(key) ?? new Set<string>();
    if (province) set.add(province);
    byCommunity.set(key, set);
  }
  return {
    communities: [...byCommunity.entries()]
      .map(([name, provinces]) => ({
        name,
        provinces: [...provinces].sort((a, b) => a.localeCompare(b, "es")),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "es")),
  };
}

/** ¿Hay algún lugar por el que filtrar? */
export function hasLocations(options: LocationOptions): boolean {
  return options.communities.length > 0;
}

/** ¿El filtro sigue siendo válido con los proveedores actuales? (si no, se ignora). */
export function isFilterAvailable(filter: LocationFilter, options: LocationOptions): boolean {
  if (!filter) return false;
  return options.communities.some((c) =>
    filter.kind === "community" ? c.name === filter.value : c.provinces.includes(filter.value)
  );
}

export function filterByLocation(vendors: Vendor[], filter: LocationFilter): Vendor[] {
  if (!filter) return vendors;
  return vendors.filter((vendor) => {
    const { province, community } = vendorPlace(vendor);
    return filter.kind === "community"
      ? (community ?? OTHER_PLACES) === filter.value
      : province === filter.value;
  });
}
