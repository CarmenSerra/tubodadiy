import type { Vendor, VendorStatus } from "@/lib/types";

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

/** Textos del hueco vacío de cada categoría de partida. */
export const EMPTY_COPY: Record<string, { title: string; cta: string }> = {
  Finca: { title: "Añade tu primera finca", cta: "Añadir finca" },
  Catering: { title: "Añade tu primer catering", cta: "Añadir catering" },
  Fotógrafo: { title: "Añade tu primer fotógrafo", cta: "Añadir fotógrafo" },
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

export interface VendorGroup {
  category: string;
  vendors: Vendor[];
}

export const STATUS_ORDER: VendorStatus[] = ["chosen", "favorite", "visited", "exploring"];

/** Ordena por estado (elegida, favorita, visitada, explorando); estable dentro de cada uno. */
export function sortByStatus(vendors: Vendor[]): Vendor[] {
  return [...vendors].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  );
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
    .map(([category, list]) => ({ category, vendors: sortByStatus(list) }));
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
