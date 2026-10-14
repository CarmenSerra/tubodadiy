import type { InvitationTemplateId } from "@/components/invitation/invitation-model";

/**
 * Catálogo de fuentes del modo «Desde cero» (sin dependencias de next/font: sirve en
 * cliente y servidor). La carga real está en `custom-font-loader.ts`, que define las
 * variables CSS `cssVar` en <html>. Las fuentes se agrupan por el estilo de plantilla
 * al que pertenecen; cada grupo trae las que usa esa plantilla y 1-2 parecidas.
 */
export interface CustomFont {
  /** Se guarda en el diseño (`titleFont` / `bodyFont`). Solo [a-z0-9-]. */
  id: string;
  /** Nombre de la familia tal como se muestra (nombre propio: no se traduce). */
  label: string;
  /** Grupo principal (el estilo en cuyo cuadrado aparece sin ser compartida). */
  group: InvitationTemplateId;
  /** Variable CSS definida en <html>. */
  cssVar: string;
  /** Familias de reserva mientras carga. */
  fallback: string;
  /** Ajuste de tamaño al usarla de TÍTULO (1 = normal): las manuscritas se ven más pequeñas. */
  titleScale?: number;
  /** Se usa en mayúsculas (rotulador «Hilo»). */
  upper?: boolean;
  /** Peso de los títulos (por defecto 400). */
  titleWeight?: number;
}

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const SCRIPT = "'Segoe Script', cursive";

export const CUSTOM_FONTS: CustomFont[] = [
  // Botánico
  { id: "birthstone", label: "Birthstone", group: "botanico", cssVar: "--font-script", fallback: SCRIPT, titleScale: 1.18 },
  { id: "great-vibes", label: "Great Vibes", group: "botanico", cssVar: "--font-cc-great-vibes", fallback: SCRIPT, titleScale: 1.02 },
  { id: "newsreader", label: "Newsreader", group: "elegante", cssVar: "--font-display", fallback: SERIF, titleWeight: 400 },
  { id: "dm-sans", label: "DM Sans", group: "minimal", cssVar: "--font-body", fallback: SANS },
  // Minimal
  { id: "jost", label: "Jost", group: "minimal", cssVar: "--font-cc-jost", fallback: SANS, titleWeight: 300 },
  { id: "manrope", label: "Manrope", group: "minimal", cssVar: "--font-cc-manrope", fallback: SANS, titleWeight: 300 },
  // Elegante
  { id: "cormorant-garamond", label: "Cormorant Garamond", group: "elegante", cssVar: "--font-cc-cormorant", fallback: SERIF, titleScale: 1.1, titleWeight: 500 },
  { id: "playfair-display", label: "Playfair Display", group: "elegante", cssVar: "--font-cc-playfair", fallback: SERIF, titleScale: 0.94 },
  // Doodle
  { id: "fraunces", label: "Fraunces", group: "doodle", cssVar: "--font-cc-fraunces", fallback: SERIF, titleScale: 0.94, titleWeight: 400 },
  { id: "gaegu", label: "Gaegu", group: "doodle", cssVar: "--font-cc-gaegu", fallback: SCRIPT, titleScale: 1.12, titleWeight: 700 },
  // Hilo
  { id: "delicious-handrawn", label: "Delicious Handrawn", group: "hilo", cssVar: "--font-hand", fallback: SCRIPT, titleScale: 1.08, upper: true },
  { id: "caveat", label: "Caveat", group: "hilo", cssVar: "--font-cc-caveat", fallback: SCRIPT, titleScale: 1.2, titleWeight: 600 },
  { id: "patrick-hand", label: "Patrick Hand", group: "hilo", cssVar: "--font-cc-patrick-hand", fallback: SCRIPT, titleScale: 1.02 },
  // Retro
  { id: "caprasimo", label: "Caprasimo", group: "retro", cssVar: "--font-chunky", fallback: SERIF, titleScale: 0.84 },
  { id: "young-serif", label: "Young Serif", group: "retro", cssVar: "--font-cc-young-serif", fallback: SERIF, titleScale: 0.9 },
  { id: "dm-serif-display", label: "DM Serif Display", group: "retro", cssVar: "--font-cc-dm-serif-display", fallback: SERIF, titleScale: 0.96 },
  // Azulejo
  { id: "lora", label: "Lora", group: "azulejo", cssVar: "--font-cc-lora", fallback: SERIF, titleScale: 0.92 },
  { id: "libre-baskerville", label: "Libre Baskerville", group: "azulejo", cssVar: "--font-cc-libre-baskerville", fallback: SERIF, titleScale: 0.82 },
];

/** Fuentes por defecto (coinciden con `defaultCustomDesign()` del modelo). */
export const DEFAULT_TITLE_FONT = "cormorant-garamond";
export const DEFAULT_BODY_FONT = "lora";

/**
 * Cuadrados del selector: una por estilo de plantilla, con las fuentes que esa
 * plantilla usa más 1-2 parecidas. Una fuente puede aparecer en varios cuadrados
 * (Newsreader y DM Sans las usan varias plantillas).
 */
export const FONT_GROUPS: { group: InvitationTemplateId; fonts: CustomFont[] }[] = (
  [
    ["botanico", ["birthstone", "newsreader", "dm-sans", "great-vibes", "cormorant-garamond"]],
    ["minimal", ["dm-sans", "newsreader", "jost", "manrope"]],
    ["elegante", ["newsreader", "cormorant-garamond", "playfair-display"]],
    ["doodle", ["newsreader", "dm-sans", "fraunces", "gaegu"]],
    ["hilo", ["delicious-handrawn", "caveat", "patrick-hand"]],
    ["retro", ["caprasimo", "young-serif", "dm-serif-display"]],
    ["azulejo", ["newsreader", "lora", "libre-baskerville"]],
  ] as [InvitationTemplateId, string[]][]
).map(([group, ids]) => ({ group, fonts: ids.map((id) => CUSTOM_FONTS.find((f) => f.id === id)!) }));

const BY_ID = new Map(CUSTOM_FONTS.map((f) => [f.id, f]));

/** La fuente con este id, o la que corresponda por defecto si no existe. */
export function customFontOf(id: string | undefined, fallbackId: string = DEFAULT_BODY_FONT): CustomFont {
  return (id ? BY_ID.get(id) : undefined) ?? BY_ID.get(fallbackId)!;
}

/** Valor de `font-family` (con reserva) de una fuente; id desconocido → la fuente por defecto del texto. */
export function fontFamilyOf(id: string | undefined, fallbackId: string = DEFAULT_BODY_FONT): string {
  const font = customFontOf(id, fallbackId);
  return `var(${font.cssVar}), ${font.fallback}`;
}
