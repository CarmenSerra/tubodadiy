import {
  CUSTOM_MAX_SPAN,
  CUSTOM_ROWS,
  CUSTOM_SLOTS,
  CUSTOM_TEXT_BLOCKS,
  cleanCustomSpans,
  type CustomDesign,
  type CustomSlotId,
  type CustomSlotItem,
  type CustomTextBlock,
} from "@/components/invitation/invitation-model";
import { isBlankDoodleName } from "@/components/invitation/blank-doodles/art";

/** Tipos de `dataTransfer` del arrastre: el elemento (JSON de `CustomSlotItem`) y el hueco de origen. */
export const DND_ITEM = "application/x-tubo-item";
export const DND_SLOT = "application/x-tubo-slot";

export type CustomSlots = Partial<Record<CustomSlotId, CustomSlotItem>>;

export const isCornerSlot = (slot: CustomSlotId) => slot.startsWith("corner");

/** Las esquinas solo admiten doodles; las filas, texto o doodle. */
export function canPlace(slot: CustomSlotId, item: CustomSlotItem): boolean {
  return !(item.kind === "text" && isCornerSlot(slot));
}

export function sameItem(a: CustomSlotItem | null | undefined, b: CustomSlotItem | null | undefined): boolean {
  if (!a || !b || a.kind !== b.kind) return false;
  return a.kind === "text" ? a.block === (b as typeof a).block : a.name === (b as typeof a).name;
}

/** Bloques de texto ya colocados. */
export function usedTextBlocks(slots: CustomSlots): Set<CustomTextBlock> {
  const used = new Set<CustomTextBlock>();
  for (const slot of CUSTOM_SLOTS) {
    const item = slots[slot];
    if (item?.kind === "text") used.add(item.block);
  }
  return used;
}

/**
 * Resultado de colocar `item` en `slot` (sin tocar `slots`). Con `item === null` quita lo
 * que hubiera en `slot`. Con `from` es un traslado entre huecos: el elemento de `slot`, si lo
 * hay, pasa a `from` (intercambio); si el intercambio no es válido (texto en una esquina) no
 * cambia nada. Sin `from`, un bloque de texto que ya estaba en otro hueco se mueve aquí.
 */
export function applyPlacement(
  slots: CustomSlots,
  slot: CustomSlotId,
  item: CustomSlotItem | null,
  from?: CustomSlotId
): CustomSlots {
  const next: CustomSlots = { ...slots };
  if (item === null) {
    delete next[slot];
    return next;
  }
  if (!canPlace(slot, item)) return slots;
  if (from && from !== slot) {
    const displaced = next[slot];
    if (displaced && !canPlace(from, displaced)) return slots;
    if (displaced) next[from] = displaced;
    else delete next[from];
  } else if (item.kind === "text") {
    for (const key of CUSTOM_SLOTS) {
      const other = next[key];
      if (key !== slot && other?.kind === "text" && other.block === item.block) delete next[key];
    }
  }
  next[slot] = item;
  return next;
}

// ---------------------------------------------------------------------------
// Ampliar zona (spans)
// ---------------------------------------------------------------------------

export type CustomSpans = NonNullable<CustomDesign["spans"]>;

/** Filas que ocupa el hueco de `slot` (1 si no tiene span o no es una fila). */
export const spanOf = (spans: CustomDesign["spans"], slot: CustomSlotId): number => spans?.[slot] ?? 1;

/** Filas cubiertas por el span de otra fila (no aceptan drop ni se dibujan como hueco). */
export function coveredSlots(slots: CustomSlots, spans: CustomDesign["spans"]): Set<CustomSlotId> {
  const covered = new Set<CustomSlotId>();
  CUSTOM_ROWS.forEach((row, index) => {
    if (!slots[row]) return;
    for (let i = 1; i < spanOf(spans, row); i += 1) {
      const below = CUSTOM_ROWS[index + i];
      if (below) covered.add(below);
    }
  });
  return covered;
}

/** Máximo de filas que puede ocupar el elemento de `slot` ahora mismo: 1 + filas libres de debajo (tope 3). */
export function maxSpanFor(slots: CustomSlots, slot: CustomSlotId): number {
  const index = CUSTOM_ROWS.findIndex((row) => row === slot);
  if (index < 0) return 1;
  let span = 1;
  while (span < CUSTOM_MAX_SPAN && index + span < CUSTOM_ROWS.length && !slots[CUSTOM_ROWS[index + span]]) span += 1;
  return span;
}

/** Cambia las filas que ocupa el elemento de `slot` (1 = sin ampliar); se recorta a lo que cabe. */
export function setSpan(design: CustomDesign, slot: CustomSlotId, span: number): CustomDesign {
  if (!design.slots[slot]) return design;
  const wanted = Math.max(1, Math.min(Math.round(span), maxSpanFor(design.slots, slot)));
  if (wanted === spanOf(design.spans, slot)) return design;
  const spans: Record<string, unknown> = { ...design.spans };
  if (wanted > 1) spans[slot] = wanted;
  else delete spans[slot];
  return withSpans(design, design.slots, spans);
}

/** `design` con los huecos y los spans dados (estos, saneados); sin la clave `spans` si no queda ninguno. */
function withSpans(design: CustomDesign, slots: CustomSlots, spans: Record<string, unknown>): CustomDesign {
  const { spans: _old, ...rest } = design;
  void _old;
  const clean = cleanCustomSpans(slots, spans);
  return { ...rest, slots, ...(clean ? { spans: clean } : {}) };
}

/**
 * Coloca, quita o traslada un elemento (ver `applyPlacement`) y deja coherentes los spans: al quitar
 * un elemento su span desaparece; al trasladarlo lo lleva consigo si cabe (recortado si no) y el
 * que se desplaza al origen vuelve a ocupar una sola fila. Las filas cubiertas por un span no
 * aceptan nada. Devuelve el mismo `design` si no cambia nada.
 */
export function placeInDesign(design: CustomDesign, slot: CustomSlotId, item: CustomSlotItem | null, from?: CustomSlotId): CustomDesign {
  if (coveredSlots(design.slots, design.spans).has(slot)) return design;
  const slots = applyPlacement(design.slots, slot, item, from);
  if (slots === design.slots) return design;
  const spans: Record<string, unknown> = { ...design.spans };
  if (item === null) {
    delete spans[slot];
  } else if (from && from !== slot) {
    const moved = spans[from];
    delete spans[from];
    delete spans[slot];
    if (moved) spans[slot] = moved;
  }
  return withSpans(design, slots, spans);
}

/** Lee y valida un elemento arrastrado (JSON); `null` si no es de los nuestros. */
export function parseDraggedItem(raw: string): CustomSlotItem | null {
  try {
    const value = JSON.parse(raw) as { kind?: unknown; block?: unknown; name?: unknown };
    if (value.kind === "text" && CUSTOM_TEXT_BLOCKS.includes(value.block as CustomTextBlock)) {
      return { kind: "text", block: value.block as CustomTextBlock };
    }
    if (value.kind === "doodle" && isBlankDoodleName(value.name)) {
      return { kind: "doodle", name: value.name };
    }
  } catch {
    // no es JSON: se ignora
  }
  return null;
}

export function parseDraggedSlot(raw: string): CustomSlotId | undefined {
  return CUSTOM_SLOTS.find((slot) => slot === raw);
}

/**
 * El elemento que se está arrastrando ahora mismo, si lo arrastra uno de nuestros componentes
 * (durante `dragover` el navegador no deja leer los datos). Sirve para marcar los huecos no válidos.
 */
let activeDrag: CustomSlotItem | null = null;
export const getActiveDrag = () => activeDrag;
export const setActiveDrag = (item: CustomSlotItem | null) => {
  activeDrag = item;
};
