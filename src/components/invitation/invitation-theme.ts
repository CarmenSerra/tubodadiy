/**
 * Colores de la invitación: paletas de 4 roles + utilidades de contraste.
 * Es código puro (sin React ni servidor): lo usan la vista pública, la vista
 * previa del editor y el propio editor.
 *
 * Roles de una paleta:
 *  - `primary`: color principal y más suave (flores, rayas, lunares, líneas).
 *  - `dark`: oscuro; es el color del texto y de los botones.
 *  - `accent`: acento (hojas y detalles de follaje).
 *  - `soft`: fondo suave de la página.
 */

export interface PaletteColors {
  primary: string;
  dark: string;
  accent: string;
  soft: string;
}

export const COLOR_ROLES = ["primary", "dark", "accent", "soft"] as const;
export type ColorRole = (typeof COLOR_ROLES)[number];

export interface InvitationPalette {
  /** Id de una paleta de serie o `custom`. */
  id: string;
  colors: PaletteColors;
}

export type TemplateKind = "botanico" | "minimal" | "elegante";

// ---- Paletas de serie ----

export interface PresetPalette {
  id: string;
  colors: PaletteColors;
}

/** El nombre de cada una sale de `invitation:palettes.<id>`. */
export const PALETTES: PresetPalette[] = [
  { id: "burdeos-oliva", colors: { primary: "#d9a7b0", dark: "#4f1d2e", accent: "#7d8450", soft: "#f5eee0" } },
  { id: "lavanda-salvia", colors: { primary: "#a28bc4", dark: "#2f4a43", accent: "#9db89a", soft: "#f4f0f6" } },
  { id: "terracota-arena", colors: { primary: "#d4876a", dark: "#4b2b1f", accent: "#b9a07a", soft: "#f7ecdf" } },
  { id: "azul-marfil", colors: { primary: "#8fa9c4", dark: "#27394d", accent: "#a9bdb0", soft: "#f7f3ea" } },
  { id: "botella-oro", colors: { primary: "#c2a257", dark: "#1f3b2e", accent: "#4f7a5e", soft: "#f4eedd" } },
  { id: "melocoton-salvia", colors: { primary: "#f0ab90", dark: "#3f4a3a", accent: "#9cb08f", soft: "#fbf1e6" } },
  { id: "piedra-rosa", colors: { primary: "#e2b5bc", dark: "#3a3d45", accent: "#a3a7ae", soft: "#f3f0ee" } },
  { id: "mediterraneo", colors: { primary: "#ebd27f", dark: "#26356b", accent: "#c9795a", soft: "#fbf8f0" } },
  { id: "ciruela-albaricoque", colors: { primary: "#e9a98d", dark: "#43243b", accent: "#a86a8b", soft: "#f8ede6" } },
  { id: "eucalipto-marfil", colors: { primary: "#9db5a3", dark: "#2e4238", accent: "#d8c3a0", soft: "#f4f2ea" } },
  { id: "menta-coral", colors: { primary: "#f0a39a", dark: "#264b45", accent: "#9fd0bd", soft: "#f6f4ee" } },
  { id: "rosa-te-cacao", colors: { primary: "#e8bfb0", dark: "#4a3328", accent: "#c79a8a", soft: "#faf1ec" } },
];

export const DEFAULT_PALETTE: PresetPalette = PALETTES[1];

/** Colores de cada plantilla antes de existir las paletas (para miniaturas de invitaciones antiguas). */
export const LEGACY_COLORS: Record<TemplateKind, PaletteColors> = {
  botanico: { primary: "#927aac", dark: "#26413c", accent: "#a9c2a4", soft: "#f6f2ec" },
  minimal: { primary: "#8a77a6", dark: "#1f1f26", accent: "#a9c2a4", soft: "#ffffff" },
  elegante: { primary: "#d4c0ea", dark: "#2b2a3b", accent: "#8faf8a", soft: "#f4f1eb" },
};

// ---- Color del sobre ----

/** Muestras de color del sobre. El nombre sale de `invitation:envelope.colors.<id>`. */
export const ENVELOPE_COLORS = [
  { id: "olive", hex: "#767a4d" },
  { id: "sage", hex: "#9aae92" },
  { id: "burgundy", hex: "#6f2a3c" },
  { id: "terracotta", hex: "#b5694a" },
  { id: "dusty-blue", hex: "#8499b3" },
  { id: "cream", hex: "#eadfc8" },
  { id: "kraft", hex: "#b99a72" },
  { id: "dusty-pink", hex: "#d9a9a8" },
  { id: "bottle-green", hex: "#2f5442" },
  { id: "slate", hex: "#5f6b78" },
] as const;

/** El sobre de la foto de referencia: verde oliva. */
export const DEFAULT_ENVELOPE = ENVELOPE_COLORS[0].hex;

// ---- Color ----

const HEX6 = /^#[0-9a-f]{6}$/;

/** `#abc` / `abc` / `#AABBCC` → `#aabbcc`, o `null` si no es un color válido. */
export function normalizeHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let v = value.trim().toLowerCase().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/.test(v)) v = v.replace(/./g, (c) => c + c);
  return /^[0-9a-f]{6}$/.test(v) ? `#${v}` : null;
}

export function isHex(value: unknown): value is string {
  return typeof value === "string" && HEX6.test(value);
}

type RGB = [number, number, number];

function toRgb(hex: string): RGB {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: RGB): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Luminancia relativa WCAG. */
export function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Mezcla: `amount` = 0 → `a`, 1 → `b`. */
export function mix(a: string, b: string, amount: number): string {
  const [ra, ga, ba] = toRgb(a);
  const [rb, gb, bb] = toRgb(b);
  return toHex([ra + (rb - ra) * amount, ga + (gb - ga) * amount, ba + (bb - ba) * amount]);
}

/**
 * Acerca `color` a negro o blanco (el que más contraste dé con `against`) hasta
 * llegar a `min` de contraste con todos los fondos indicados. Conserva el tono.
 */
export function ensureContrast(color: string, against: string | string[], min: number): string {
  const bgs = Array.isArray(against) ? against : [against];
  const worst = (c: string) => Math.min(...bgs.map((bg) => contrast(c, bg)));
  if (worst(color) >= min) return color;
  const avgLum = bgs.reduce((sum, bg) => sum + luminance(bg), 0) / bgs.length;
  const target = avgLum > 0.4 ? "#000000" : "#ffffff";
  for (let i = 1; i <= 40; i++) {
    const candidate = mix(color, target, i / 40);
    if (worst(candidate) >= min) return candidate;
  }
  return target;
}

/** ¿`dark` se lee sobre `soft` con holgura? (AA para texto normal = 4,5.) */
export const MIN_TEXT_CONTRAST = 4.5;

export function textContrast(colors: PaletteColors): number {
  return contrast(colors.dark, colors.soft);
}

/** Algún color del texto o del fondo es tan parecido que se ajustará solo. */
export function needsTextAdjustment(colors: PaletteColors): boolean {
  return textContrast(colors) < MIN_TEXT_CONTRAST;
}

export function samePalette(a: PaletteColors, b: PaletteColors): boolean {
  return COLOR_ROLES.every((r) => a[r] === b[r]);
}

/** Paleta de serie con estos colores, si la hay. */
export function presetFor(colors: PaletteColors | undefined): PresetPalette | null {
  if (!colors) return null;
  return PALETTES.find((p) => samePalette(p.colors, colors)) ?? null;
}

// ---- Tema (variables CSS + colores para los fondos) ----

export interface InvitationTheme {
  /** Variables CSS `--inv-*` para el elemento raíz. */
  vars: Record<string, string>;
  /** Oscuro (plantilla elegante): el fondo es el color oscuro. */
  isDark: boolean;
  bg: string;
  /**
   * La «mesa»: el color liso de detrás de las tarjetas (fondo de la página pública,
   * de la vista previa del editor y de «Reserva la fecha»). Sin motivos ni texturas.
   */
  table: string;
  paper: string;
  ink: string;
  /** Flores, rayas, lunares… */
  primary: string;
  /** Hojas y follaje. */
  leaf: string;
  /** Líneas finas. */
  line: string;
}

/**
 * Convierte una paleta en las variables de la invitación, garantizando que el
 * texto se lea: si los colores elegidos no dan contraste suficiente, el texto,
 * los enlaces y los botones se ajustan solos (más oscuros o más claros).
 */
export function buildTheme(colors: PaletteColors, template: TemplateKind = "botanico"): InvitationTheme {
  return template === "elegante" ? darkTheme(colors) : lightTheme(colors, template);
}

/** Gris-crema con el que se apaga el color suave de la paleta para hacer la mesa. */
const TABLE_GRAY = "#d9d5cc";

function lightTheme(c: PaletteColors, template: TemplateKind): InvitationTheme {
  const bg = template === "minimal" ? mix(c.soft, "#ffffff", 0.5) : c.soft;
  const paper = mix(bg, "#ffffff", 0.55);
  const table = mix(bg, TABLE_GRAY, 0.62);
  // Peor fondo posible: la tarjeta con una raya del color principal encima.
  const worstBg = mix(bg, c.primary, 0.4);
  const bgs = [bg, paper, worstBg, table];
  const ink = ensureContrast(c.dark, bgs, 7);
  const muted = ensureContrast(mix(ink, bg, 0.25), bgs, MIN_TEXT_CONTRAST + 0.3);
  const accent = ensureContrast(c.primary, paper, 1.8);
  const accentInk = ensureContrast(c.primary, bgs, MIN_TEXT_CONTRAST);
  const leaf = ensureContrast(c.accent, paper, 1.6);
  const leafDark = ensureContrast(mix(c.accent, ink, 0.3), paper, 2.4);
  const line = mix(c.primary, bg, 0.45);
  const btn = ensureContrast(c.dark, mix(bg, "#ffffff", 0.7), 6);
  const onBtn = pickOn(btn, [mix(bg, "#ffffff", 0.7), "#ffffff", "#000000"]);
  const field = mix(bg, "#ffffff", 0.78);
  const fieldLine = ensureContrast(mix(ink, field, 0.5), field, 3);
  const vars = {
    "--inv-bg": bg,
    "--inv-table": table,
    "--inv-paper": paper,
    "--inv-ink": ink,
    "--inv-muted": muted,
    "--inv-accent": accent,
    "--inv-accent-ink": accentInk,
    "--inv-leaf": leaf,
    "--inv-leaf-dark": leafDark,
    "--inv-line": line,
    "--inv-btn": btn,
    "--inv-on-btn": onBtn,
    "--inv-field": field,
    "--inv-field-line": fieldLine,
    "--inv-focus": accentInk,
    "--inv-danger": ensureContrast("#9f3a38", [bg, paper], MIN_TEXT_CONTRAST),
  };
  return { vars, isDark: false, bg, table, paper, ink, primary: accent, leaf, line };
}

function darkTheme(c: PaletteColors): InvitationTheme {
  // El fondo es el color oscuro de la paleta, asegurando que sea realmente oscuro.
  let bg = c.dark;
  for (let i = 1; i <= 30 && luminance(bg) > 0.05; i++) bg = mix(c.dark, "#000000", i / 30);
  const paper = mix(bg, c.primary, 0.14);
  const table = mix(bg, "#14131a", 0.5);
  const bgs = [bg, paper, table];
  const ink = ensureContrast(c.soft, bgs, 9);
  const muted = ensureContrast(mix(ink, bg, 0.2), bgs, MIN_TEXT_CONTRAST + 0.3);
  const accent = ensureContrast(c.primary, bgs, 3);
  const accentInk = ensureContrast(c.primary, bgs, MIN_TEXT_CONTRAST);
  const leaf = ensureContrast(c.accent, bgs, 3);
  const line = mix(accent, bg, 0.68);
  const field = bg;
  const fieldLine = ensureContrast(mix(accentInk, field, 0.45), field, 3);
  const onBtn = pickOn(accentInk, [bg, "#000000", "#ffffff"]);
  const vars = {
    "--inv-bg": bg,
    "--inv-table": table,
    "--inv-paper": paper,
    "--inv-ink": ink,
    "--inv-muted": muted,
    "--inv-accent": accent,
    "--inv-accent-ink": accentInk,
    "--inv-leaf": leaf,
    "--inv-leaf-dark": leaf,
    "--inv-line": line,
    "--inv-btn": accentInk,
    "--inv-on-btn": onBtn,
    "--inv-field": field,
    "--inv-field-line": fieldLine,
    "--inv-focus": accentInk,
    "--inv-danger": "#f2adaa",
  };
  return { vars, isDark: true, bg, table, paper, ink, primary: accent, leaf, line };
}

/** El primero de `options` que da contraste de texto sobre `bg`; si ninguno, el mejor. */
function pickOn(bg: string, options: string[]): string {
  const ok = options.find((o) => contrast(o, bg) >= MIN_TEXT_CONTRAST);
  if (ok) return ok;
  return contrast("#ffffff", bg) >= contrast("#000000", bg) ? "#ffffff" : "#000000";
}

/** Tema para dibujar fondos: con la paleta elegida o, si no hay, con los colores de la plantilla. */
export function themeFor(palette: InvitationPalette | undefined, template: TemplateKind): InvitationTheme {
  return buildTheme(palette?.colors ?? LEGACY_COLORS[template], template);
}
