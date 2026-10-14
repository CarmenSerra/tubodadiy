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

export type TemplateKind = "botanico" | "minimal" | "elegante" | "doodle" | "hilo" | "retro" | "azulejo";

// ---- Paletas de serie ----

export interface PresetPalette {
  id: string;
  colors: PaletteColors;
  /**
   * Color del sobre cuando nadie lo ha elegido a mano: un rol de la propia paleta
   * (el que mejor funciona como papel de sobre) o un `#rrggbb` explícito.
   */
  envelope: ColorRole | string;
}

/** El nombre de cada una sale de `invitation:palettes.<id>`. */
export const PALETTES: PresetPalette[] = [
  { id: "burdeos-oliva", colors: { primary: "#d9a7b0", dark: "#4f1d2e", accent: "#7d8450", soft: "#f5eee0" }, envelope: "accent" },
  { id: "lavanda-salvia", colors: { primary: "#a28bc4", dark: "#2f4a43", accent: "#9db89a", soft: "#f4f0f6" }, envelope: "primary" },
  { id: "terracota-arena", colors: { primary: "#d4876a", dark: "#4b2b1f", accent: "#b9a07a", soft: "#f7ecdf" }, envelope: "primary" },
  { id: "azul-marfil", colors: { primary: "#8fa9c4", dark: "#27394d", accent: "#a9bdb0", soft: "#f7f3ea" }, envelope: "primary" },
  { id: "botella-oro", colors: { primary: "#c2a257", dark: "#1f3b2e", accent: "#4f7a5e", soft: "#f4eedd" }, envelope: "accent" },
  { id: "melocoton-salvia", colors: { primary: "#f0ab90", dark: "#3f4a3a", accent: "#9cb08f", soft: "#fbf1e6" }, envelope: "accent" },
  { id: "piedra-rosa", colors: { primary: "#e2b5bc", dark: "#3a3d45", accent: "#a3a7ae", soft: "#f3f0ee" }, envelope: "primary" },
  { id: "mediterraneo", colors: { primary: "#ebd27f", dark: "#26356b", accent: "#c9795a", soft: "#fbf8f0" }, envelope: "accent" },
  { id: "ciruela-albaricoque", colors: { primary: "#e9a98d", dark: "#43243b", accent: "#a86a8b", soft: "#f8ede6" }, envelope: "accent" },
  { id: "eucalipto-marfil", colors: { primary: "#9db5a3", dark: "#2e4238", accent: "#d8c3a0", soft: "#f4f2ea" }, envelope: "primary" },
  { id: "menta-coral", colors: { primary: "#f0a39a", dark: "#264b45", accent: "#9fd0bd", soft: "#f6f4ee" }, envelope: "primary" },
  { id: "rosa-te-cacao", colors: { primary: "#e8bfb0", dark: "#4a3328", accent: "#c79a8a", soft: "#faf1ec" }, envelope: "accent" },
];

export const DEFAULT_PALETTE: PresetPalette = PALETTES[1];

/** Colores de cada plantilla antes de existir las paletas (para miniaturas de invitaciones antiguas). */
export const LEGACY_COLORS: Record<TemplateKind, PaletteColors> = {
  botanico: { primary: "#927aac", dark: "#26413c", accent: "#a9c2a4", soft: "#f6f2ec" },
  minimal: { primary: "#8a77a6", dark: "#1f1f26", accent: "#a9c2a4", soft: "#ffffff" },
  elegante: { primary: "#d4c0ea", dark: "#2b2a3b", accent: "#8faf8a", soft: "#f4f1eb" },
  doodle: { primary: "#4f7a5e", dark: "#1f3b2e", accent: "#e9a0b0", soft: "#f4efdf" },
  hilo: { primary: "#b5454f", dark: "#7a1f2b", accent: "#c98a8a", soft: "#f6f1ee" },
  retro: { primary: "#a9cba5", dark: "#2c5e2e", accent: "#4f7a5e", soft: "#f2eddd" },
  azulejo: { primary: "#8fa9d6", dark: "#233f7a", accent: "#a9bdd8", soft: "#f6f3ea" },
};

// ---- Color del sobre ----

/** Muestras de color del sobre (van dentro del selector del círculo «Sobre»). */
export const ENVELOPE_SWATCHES = [
  "#7a7f50", // oliva
  "#9aae92", // salvia
  "#6f2a3c", // burdeos
  "#b5694a", // terracota
  "#8499b3", // azul empolvado
  "#eadfc8", // crema
  "#b99a72", // kraft
  "#d9a9a8", // rosa empolvado
  "#2f5442", // verde botella
  "#5f6b78", // pizarra
] as const;

/**
 * El oliva que se guardaba SIEMPRE como `envelopeColor` antes de que el sobre saliera
 * de la paleta. Un estilo guardado con este valor se trata como «automático».
 */
export const LEGACY_DEFAULT_ENVELOPE = "#767a4d";

/** Sobre de respaldo si no hay ni paleta ni color (no debería ocurrir). */
export const FALLBACK_ENVELOPE = "#7a7f50";

/** Saturación y luminosidad HSL (0-1). */
function hsl(hex: string): { s: number; l: number } {
  const [r, g, b] = toRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { s, l };
}

/**
 * Regla automática para paletas personalizadas: entre el color principal, el de
 * acento y el oscuro, el más saturado y de tono medio. Se descartan los casi
 * blancos y los casi negros (un sobre negro o blanco desentona); el suave (fondo)
 * nunca entra. Si ninguno vale, el principal.
 */
export function autoEnvelope(colors: PaletteColors): string {
  let best: string | null = null;
  let bestScore = -1;
  for (const role of ["accent", "primary", "dark"] as const) {
    const { s, l } = hsl(colors[role]);
    if (l < 0.2 || l > 0.82) continue;
    // 1 en l = 0,5; baja hacia los extremos. Pesa más la saturación.
    const midness = 1 - Math.abs(l - 0.5) / 0.4;
    const score = s * 0.7 + midness * 0.3;
    if (score > bestScore + 1e-6) {
      best = colors[role];
      bestScore = score;
    }
  }
  return best ?? colors.primary;
}

/** Color automático del sobre para estos colores: el definido en su paleta de serie o la regla. */
export function paletteEnvelope(colors: PaletteColors): string {
  const preset = presetFor(colors);
  if (!preset) return autoEnvelope(colors);
  return isHex(preset.envelope) ? preset.envelope : colors[preset.envelope as ColorRole];
}

/** Guardado a mano → el color; el antiguo oliva por defecto o nada → `undefined` (automático). */
export function manualEnvelope(value: unknown): string | undefined {
  const hex = normalizeHex(value);
  return hex && hex !== LEGACY_DEFAULT_ENVELOPE ? hex : undefined;
}

/**
 * Color efectivo del sobre: el elegido a mano o, si no, el de la paleta. Sin paleta
 * (invitaciones antiguas) se usan los colores de la plantilla.
 */
export function resolveEnvelope(
  palette: InvitationPalette | undefined,
  manual: string | undefined,
  template: TemplateKind = "botanico"
): string {
  return manualEnvelope(manual) ?? paletteEnvelope(palette?.colors ?? LEGACY_COLORS[template]);
}

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

/**
 * La «mesa» (el fondo liso de detrás de las tarjetas) NO depende de la paleta: es el
 * mismo color fijo para todas. En la página pública es este (claro; oscuro en la
 * plantilla elegante, que lleva texto claro fuera de la tarjeta); en el editor y en
 * «Reserva la fecha» sale del fondo de los diálogos (`--inv-app-table`, ver invitation.css).
 * Los textos que van directamente sobre la mesa deben leerse con ellos.
 */
export const PUBLIC_TABLE_LIGHT = "#fbf9f7";
export const PUBLIC_TABLE_DARK = "#1d1c28";

function lightTheme(c: PaletteColors, template: TemplateKind): InvitationTheme {
  const bg = template === "minimal" ? mix(c.soft, "#ffffff", 0.5) : c.soft;
  const paper = mix(bg, "#ffffff", 0.55);
  // Peor fondo posible: la tarjeta con una raya del color principal encima.
  const worstBg = mix(bg, c.primary, 0.4);
  const bgs = [bg, paper, worstBg, PUBLIC_TABLE_LIGHT];
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
  return { vars, isDark: false, bg, paper, ink, primary: accent, leaf, line };
}

function darkTheme(c: PaletteColors): InvitationTheme {
  // El fondo es el color oscuro de la paleta, asegurando que sea realmente oscuro.
  let bg = c.dark;
  for (let i = 1; i <= 30 && luminance(bg) > 0.05; i++) bg = mix(c.dark, "#000000", i / 30);
  const paper = mix(bg, c.primary, 0.14);
  const bgs = [bg, paper, PUBLIC_TABLE_DARK];
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
  return { vars, isDark: true, bg, paper, ink, primary: accent, leaf, line };
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
