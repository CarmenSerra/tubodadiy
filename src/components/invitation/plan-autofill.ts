import { type InvitationContent, type InvitationPlace, cleanUrl } from "@/components/invitation/invitation-model";
import { categoryKey } from "@/components/vendors/vendor-model";
import { formatClock } from "@/components/timeline/timeline-model";
import type { SaveTheDateDesign } from "@/lib/firebase/designs";
import type { TimelineItem, Vendor, VendorStatus, WeddingPlan } from "@/lib/types";

/**
 * Datos que la pareja ya ha escrito en otras partes del plan y que el editor de
 * la invitación puede reutilizar: fecha y título del plan, el diseño «Reserva la
 * fecha», los proveedores de «Finca» y el cronograma del día.
 */
export interface PlanSources {
  plan: Pick<WeddingPlan, "title" | "weddingDate"> | null;
  saveTheDate: Pick<SaveTheDateDesign, "name1" | "name2" | "date"> | null;
  vendors: Vendor[];
  timeline: TimelineItem[];
}

/** Campos de la invitación que se pueden rellenar desde el plan (clave plana). */
export type FillKey =
  | "names"
  | "date"
  | "ceremony.name"
  | "ceremony.address"
  | "ceremony.mapUrl"
  | "ceremony.time"
  | "banquet.name"
  | "banquet.address"
  | "banquet.mapUrl"
  | "banquet.time";

export type PlanFill = Partial<Record<FillKey, string>>;

export function getField(content: InvitationContent, key: FillKey): string {
  if (key === "names" || key === "date") return content[key];
  const [place, field] = key.split(".") as ["ceremony" | "banquet", keyof InvitationPlace];
  return content[place][field];
}

export function setField(content: InvitationContent, key: FillKey, value: string): InvitationContent {
  if (key === "names" || key === "date") return { ...content, [key]: value };
  const [place, field] = key.split(".") as ["ceremony" | "banquet", keyof InvitationPlace];
  return { ...content, [place]: { ...content[place], [field]: value } };
}

const normalize = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();

// ---- Nombres ----

/** «Ana & Luis» a partir de «Reserva la fecha» o, si no, del título del plan cuando parece de nombres. */
export function coupleNames(
  plan: PlanSources["plan"],
  saveTheDate: PlanSources["saveTheDate"]
): string {
  const a = saveTheDate?.name1.trim() ?? "";
  const b = saveTheDate?.name2.trim() ?? "";
  if (a && b) return `${a} & ${b}`;

  const title = (plan?.title ?? "").trim().replace(/^boda\s+(de|del)\s+/i, "");
  // Un título como «Nuestra boda» no son nombres: hace falta un «y», «&» o «+» entre dos.
  const parts = title.split(/\s+(?:y|e|&|\+)\s+/i).map((p) => p.trim());
  if (parts.length === 2 && parts.every((p) => p && p.split(/\s+/).length <= 3)) {
    return `${parts[0]} & ${parts[1]}`;
  }
  return a || b;
}

// ---- Lugares (proveedores de «Finca») ----

const STATUS_RANK: Record<VendorStatus, number> = { chosen: 0, favorite: 1, visited: 2, exploring: 3 };
const VENUE_KEYS = new Set(["finca", "fincas"]);

/** Opciones de la categoría «Finca», la más avanzada primero (elegida → favorita → visitada → explorando). */
export function venueVendors(vendors: Vendor[]): Vendor[] {
  return vendors
    .filter((v) => VENUE_KEYS.has(categoryKey(v.category)) && v.name.trim())
    .map((v, i) => ({ v, i }))
    .sort((a, b) => STATUS_RANK[a.v.status] - STATUS_RANK[b.v.status] || a.i - b.i)
    .map(({ v }) => v);
}

const mentions = (v: Vendor, re: RegExp) => re.test(normalize(`${v.name} ${v.notes}`));
const CEREMONY_WORDS = /ceremoni|iglesia|parroquia|ermita|ayuntamiento|juzgado/;
const BANQUET_WORDS = /banquete|celebracion|comida|convite/;

function placeFromVendor(v: Vendor | undefined): Partial<InvitationPlace> {
  if (!v) return {};
  return { name: v.name.trim(), address: (v.location ?? "").trim(), mapUrl: cleanUrl(v.mapsUrl ?? "") };
}

// ---- Horas (cronograma) ----

function sameDay(item: TimelineItem): boolean {
  return item.startMin >= 0 && item.startMin < 1440;
}

function pickItem(items: TimelineItem[], tests: RegExp[], exclude?: RegExp): TimelineItem | undefined {
  const pool = items.filter((i) => sameDay(i) && !(exclude && exclude.test(normalize(i.title))));
  for (const re of tests) {
    const found = pool.find((i) => re.test(normalize(i.title)));
    if (found) return found;
  }
  return undefined;
}

/** Momento del cronograma que marca la ceremonia (el que se llama «Ceremonia», no «Llegada a la ceremonia»). */
export function ceremonyItem(timeline: TimelineItem[]): TimelineItem | undefined {
  return pickItem(timeline, [/^ceremonia\b/, /\bceremonia\b/, /\bboda (civil|religiosa)\b/], /llegada|ensayo|fotos/);
}

/** Momento que marca el banquete; si no hay, el cóctel (cuando empieza la celebración). */
export function banquetItem(timeline: TimelineItem[]): TimelineItem | undefined {
  return pickItem(
    timeline,
    [/^banquete\b/, /^(comida|cena|almuerzo|convite)\b/, /\b(banquete|comida|cena|almuerzo)\b/, /\b(coctel|cocktail|aperitivo)\b/],
    /entrada|llegada|fin\b/
  );
}

// ---- Todo junto ----

/** Lo que el plan ya sabe de la invitación; solo incluye campos con valor. */
export function derivePlanFill({ plan, saveTheDate, vendors, timeline }: PlanSources): PlanFill {
  const fill: PlanFill = {};
  const put = (key: FillKey, value: string | undefined) => {
    const v = (value ?? "").trim();
    if (v) fill[key] = v;
  };

  put("names", coupleNames(plan, saveTheDate));
  put("date", plan?.weddingDate ?? saveTheDate?.date ?? "");

  const venues = venueVendors(vendors);
  const top = venues.filter((v) => v.status === venues[0]?.status);
  const ceremonyVendor = top.find((v) => mentions(v, CEREMONY_WORDS)) ?? top[0];
  const banquetVendor =
    top.find((v) => v !== ceremonyVendor && mentions(v, BANQUET_WORDS)) ??
    top.find((v) => !mentions(v, CEREMONY_WORDS)) ??
    top[0];

  const ceremonyAt = ceremonyItem(timeline);
  const banquetAt = banquetItem(timeline);

  for (const [place, vendor, item] of [
    ["ceremony", ceremonyVendor, ceremonyAt],
    ["banquet", banquetVendor, banquetAt],
  ] as const) {
    const from = placeFromVendor(vendor);
    // Sin proveedor, el lugar que se apuntó en el cronograma sirve como nombre.
    put(`${place}.name`, from.name || item?.location);
    put(`${place}.address`, from.address);
    put(`${place}.mapUrl`, from.mapUrl);
    if (item) put(`${place}.time`, formatClock(item.startMin));
  }
  return fill;
}

/** Etiquetas para el aviso «Rellenado con…». */
export const FILL_GROUP_LABEL: Record<FillKey, string> = {
  names: "nombres",
  date: "fecha",
  "ceremony.name": "lugar",
  "ceremony.address": "dirección",
  "ceremony.mapUrl": "mapa",
  "ceremony.time": "hora",
  "banquet.name": "lugar",
  "banquet.address": "dirección",
  "banquet.mapUrl": "mapa",
  "banquet.time": "hora",
};

export interface FillResult {
  content: InvitationContent;
  /** Valores que ha puesto el plan (clave → valor), para saber qué sigue siendo «del plan». */
  filled: PlanFill;
  /** Cuántos campos han cambiado. */
  changed: number;
}

/**
 * Aplica `fill` sin pisar nada de lo escrito a mano: solo rellena campos vacíos
 * y actualiza los que siguen valiendo lo que el plan puso antes (`previous`).
 */
export function applyPlanFill(content: InvitationContent, fill: PlanFill, previous: PlanFill = {}): FillResult {
  let next = content;
  const filled: PlanFill = { ...previous };
  let changed = 0;
  for (const key of Object.keys(fill) as FillKey[]) {
    const wanted = fill[key];
    if (!wanted) continue;
    const current = getField(next, key);
    const untouched = current === "" || (previous[key] !== undefined && current === previous[key]);
    if (!untouched || current === wanted) continue;
    next = setField(next, key, wanted);
    filled[key] = wanted;
    changed += 1;
  }
  return { content: next, filled, changed };
}
