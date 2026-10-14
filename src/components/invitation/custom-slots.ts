import {
  CUSTOM_SLOTS,
  CUSTOM_TEXT_BLOCKS,
  type CustomSlotId,
  type CustomSlotItem,
  type CustomTextBlock,
} from "@/components/invitation/invitation-model";
import { DOODLE_NAMES, type DoodleName } from "@/components/invitation/doodles";

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

/** Lee y valida un elemento arrastrado (JSON); `null` si no es de los nuestros. */
export function parseDraggedItem(raw: string): CustomSlotItem | null {
  try {
    const value = JSON.parse(raw) as { kind?: unknown; block?: unknown; name?: unknown };
    if (value.kind === "text" && CUSTOM_TEXT_BLOCKS.includes(value.block as CustomTextBlock)) {
      return { kind: "text", block: value.block as CustomTextBlock };
    }
    if (value.kind === "doodle" && DOODLE_NAMES.includes(value.name as DoodleName)) {
      return { kind: "doodle", name: value.name as DoodleName };
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
