import { STEP_DEFINITIONS } from "@/lib/steps";
import type { CATEGORY_OPTIONS } from "@/components/vendors/vendor-model";

// Lógica pura del flujo "Nuevo plan" (sin React ni Firebase): preguntas,
// orden de las pantallas, lectura de la lista de invitados pegada y búsqueda
// de tareas por categoría de paso.

/* ------------------------------------------------------------------ */
/* Respuestas                                                         */
/* ------------------------------------------------------------------ */

export type StartMode = "scratch" | "advanced";

/** Cosas que se pueden traer ya hechas ("Ya tenemos cosas avanzadas"). */
export type HaveKey =
  | "fecha"
  | "presupuesto"
  | "lugar"
  | "invitados"
  | "proveedores"
  | "ceremonia"
  | "vestuario"
  | "alianzas"
  | "luna";

export type CeremonyChoice = "civil" | "religiosa" | "simbolica" | "unknown";
export type VenueScope = "ceremonia" | "banquete" | "ambos";

export interface VendorAnswer {
  on: boolean;
  name: string;
  price: string;
}

export interface OnboardingAnswers {
  title: string;
  mode: StartMode | null;
  have: HaveKey[];
  /** `yyyy-MM-dd` o vacío. */
  date: string;
  /** Texto tal cual se escribió ("12.000"). */
  budget: string;
  /** "" = sin responder. */
  ceremony: CeremonyChoice | "";
  /** Invitados aproximados (solo "desde cero"). */
  guestsApprox: string;
  venueName: string;
  venueLocation: string;
  venueScope: VenueScope;
  guestsPaste: string;
  vendors: Record<string, VendorAnswer>;
  honeymoonDestination: string;
}

/** Cantidad con puntos de millar siempre ("1.000"): es-ES no agrupa las de 4 cifras por defecto. */
export function formatCount(value: number): string {
  return new Intl.NumberFormat("es-ES", { useGrouping: "always" }).format(value);
}

export const DEFAULT_PLAN_TITLE = "Nuestra boda";

export function emptyAnswers(): OnboardingAnswers {
  return {
    title: DEFAULT_PLAN_TITLE,
    mode: null,
    have: [],
    date: "",
    budget: "",
    ceremony: "",
    guestsApprox: "",
    venueName: "",
    venueLocation: "",
    venueScope: "ambos",
    guestsPaste: "",
    vendors: {},
    honeymoonDestination: "",
  };
}

/* ------------------------------------------------------------------ */
/* Opciones                                                           */
/* ------------------------------------------------------------------ */

export const HAVE_OPTIONS: { key: HaveKey; label: string; hint: string }[] = [
  { key: "fecha", label: "Fecha", hint: "Ya sabemos el día" },
  { key: "presupuesto", label: "Presupuesto", hint: "Tenemos una cifra" },
  { key: "lugar", label: "Lugar reservado", hint: "Finca, salón o iglesia" },
  { key: "invitados", label: "Lista de invitados", hint: "Una lista que pegar aquí" },
  { key: "proveedores", label: "Proveedores contratados", hint: "Catering, fotografía…" },
  { key: "ceremonia", label: "Tipo de ceremonia", hint: "Civil, religiosa…" },
  { key: "vestuario", label: "Vestido o traje", hint: "Ya lo hemos elegido" },
  { key: "alianzas", label: "Alianzas", hint: "Ya las tenemos" },
  { key: "luna", label: "Luna de miel", hint: "Destino o reserva" },
];

export const CEREMONY_OPTIONS: { value: CeremonyChoice; label: string; hint: string }[] = [
  { value: "civil", label: "Civil", hint: "Con validez legal, en un ayuntamiento o en otro lugar" },
  { value: "religiosa", label: "Religiosa", hint: "En una iglesia u otro lugar de culto" },
  { value: "simbolica", label: "Simbólica", hint: "Una ceremonia a vuestra manera, sin trámite legal" },
  { value: "unknown", label: "Aún no lo sabemos", hint: "Lo decidiremos más adelante" },
];

export const VENUE_SCOPE_OPTIONS: { value: VenueScope; label: string }[] = [
  { value: "ceremonia", label: "Ceremonia" },
  { value: "banquete", label: "Banquete" },
  { value: "ambos", label: "Ambos" },
];

type VendorCategory = (typeof CATEGORY_OPTIONS)[number] | (string & {});
const known = (category: (typeof CATEGORY_OPTIONS)[number]): VendorCategory => category;

/** Categoría con la que se guarda el lugar reservado. */
export const VENUE_CATEGORY = known("Finca");

export interface VendorType {
  key: string;
  label: string;
  /** Categoría con la que se guarda en Proveedores. */
  category: VendorCategory;
  /** Reconoce, entre las tareas del paso "proveedores", la de contratarlo. */
  task?: RegExp;
}

export const VENDOR_TYPES: VendorType[] = [
  { key: "catering", label: "Catering", category: known("Catering"), task: /catering/i },
  { key: "fotografo", label: "Fotógrafo/a", category: known("Fotógrafo"), task: /fot[oó]graf/i },
  { key: "musica", label: "Música / DJ", category: known("Música"), task: /m[uú]sica|\bdj\b/i },
  { key: "flores", label: "Flores", category: known("Flores") },
  { key: "video", label: "Vídeo", category: known("Vídeo") },
  { key: "belleza", label: "Peluquería y maquillaje", category: "Peluquería y maquillaje" },
  { key: "tarta", label: "Tarta", category: known("Pastel") },
  { key: "transporte", label: "Transporte", category: known("Transporte") },
  { key: "decoracion", label: "Decoración", category: known("Decoración") },
];

/* ------------------------------------------------------------------ */
/* Pantallas                                                          */
/* ------------------------------------------------------------------ */

export type ScreenId =
  | "name"
  | "mode"
  | "have"
  | "date"
  | "budget"
  | "venue"
  | "guests"
  | "vendors"
  | "ceremony"
  | "approx"
  | "honeymoon"
  | "summary";

/** Pantallas que se pueden saltar (todas menos nombre, modo y resumen). */
export const SKIPPABLE: ReadonlySet<ScreenId> = new Set<ScreenId>([
  "have",
  "date",
  "budget",
  "venue",
  "guests",
  "vendors",
  "ceremony",
  "approx",
  "honeymoon",
]);

const SCRATCH_SCREENS: ScreenId[] = [
  "name",
  "mode",
  "date",
  "budget",
  "ceremony",
  "approx",
  "summary",
];

/** Pantalla de detalle de cada cosa del listado, en el orden en que se piden. */
const SCREEN_BY_HAVE: Partial<Record<HaveKey, ScreenId>> = {
  fecha: "date",
  presupuesto: "budget",
  lugar: "venue",
  invitados: "guests",
  proveedores: "vendors",
  ceremonia: "ceremony",
  luna: "honeymoon",
};

/**
 * Pantallas del flujo según las respuestas. Mientras no se haya elegido cómo
 * empezar se devuelve la secuencia "desde cero" (solo sirve para contar los
 * puntos de avance).
 */
export function screensFor(answers: Pick<OnboardingAnswers, "mode" | "have">): ScreenId[] {
  if (answers.mode !== "advanced") return SCRATCH_SCREENS;
  const detail = HAVE_OPTIONS.map((o) => (answers.have.includes(o.key) ? SCREEN_BY_HAVE[o.key] : undefined)).filter(
    (s): s is ScreenId => Boolean(s)
  );
  return ["name", "mode", "have", ...detail, "summary"];
}

/* ------------------------------------------------------------------ */
/* Lista de invitados pegada                                          */
/* ------------------------------------------------------------------ */

export interface ParsedGuest {
  name: string;
  groupName: string;
}

export interface ParsedGuestList {
  guests: ParsedGuest[];
  /** Se ha ignorado una primera fila de cabecera ("Nombre; Grupo"). */
  skippedHeader: boolean;
  /** Había más de `MAX_PASTED_GUESTS` y se ha recortado. */
  truncated: boolean;
}

export const MAX_PASTED_GUESTS = 1000;
const MAX_NAME = 100;
const MAX_GROUP = 60;

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

function stripQuotes(cell: string): string {
  const trimmed = cell.trim();
  const m = /^"(.*)"$/.exec(trimmed);
  return (m ? m[1].replace(/""/g, '"') : trimmed).trim();
}

/** Separador de columnas: tabulador (Excel/Sheets), «;» o «,» si la mayoría de líneas lo usan. */
function detectSeparator(lines: string[]): string | null {
  if (lines.some((l) => l.includes("\t"))) return "\t";
  if (lines.some((l) => l.includes(";"))) return ";";
  const withComma = lines.filter((l) => l.includes(",")).length;
  return withComma > 0 && withComma / lines.length >= 0.5 ? "," : null;
}

const HEADER_NAME = new Set(["nombre", "nombres", "name", "invitado", "invitados", "nombre completo", "nombre y apellidos"]);

/**
 * Una línea por invitado: «Nombre», o «Nombre» y «Grupo» separados por
 * tabulador, «;» o «,». Admite viñetas o numeración delante, comillas de CSV
 * y una fila de cabecera.
 */
export function parseGuestList(text: string): ParsedGuestList {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const separator = detectSeparator(lines);

  let rows = lines.map((line) => {
    const cells = (separator ? line.split(separator) : [line]).map(stripQuotes);
    // Columna de numeración de una hoja de cálculo: «1 | Ana | Familia».
    if (cells.length >= 2 && /^\d+$/.test(cells[0]) && cells[1] && !/^\d+$/.test(cells[1])) cells.shift();
    cells[0] = (cells[0] ?? "").replace(/^(?:[-–•*·]|\d+[.)])\s+/, "").trim();
    return cells;
  });

  let skippedHeader = false;
  if (rows.length > 1 && HEADER_NAME.has(normalize(rows[0][0] ?? ""))) {
    rows = rows.slice(1);
    skippedHeader = true;
  }

  const guests: ParsedGuest[] = [];
  for (const cells of rows) {
    const name = (cells[0] ?? "").slice(0, MAX_NAME).trim();
    if (!name) continue;
    guests.push({ name, groupName: (cells[1] ?? "").slice(0, MAX_GROUP).trim() });
  }

  const truncated = guests.length > MAX_PASTED_GUESTS;
  return { guests: truncated ? guests.slice(0, MAX_PASTED_GUESTS) : guests, skippedHeader, truncated };
}

/* ------------------------------------------------------------------ */
/* Tareas de los pasos                                                */
/* ------------------------------------------------------------------ */

function taskTitles(category: string): string[] {
  const def = STEP_DEFINITIONS.find((d) => d.category === category);
  return (def?.suggestedTasks ?? []).map((t) => (typeof t === "string" ? t : t.title));
}

/**
 * Título (tal como está en `steps.ts`) de la tarea sugerida de un paso que
 * cumple `match`. Así nunca se copian a mano los textos de las tareas.
 */
export function findTaskTitle(category: string, match: RegExp): string | null {
  return taskTitles(category).find((title) => match.test(title)) ?? null;
}
