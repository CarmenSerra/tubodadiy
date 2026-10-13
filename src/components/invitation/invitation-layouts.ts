/**
 * Composiciones de la tarjeta: cómo se colocan la fecha, la hora, el lugar y los
 * nombres dentro de la invitación. Es solo datos (sin React), así que lo usan el
 * modelo, la tarjeta, el selector del editor y el lienzo de «Reserva la fecha».
 * El nombre de cada una sale de `invitation:layouts.<id>`.
 */

export const LAYOUT_IDS = [
  "classic",
  "bigDate",
  "calendar",
  "sidebar",
  "editorial",
  "medallion",
  "block",
  "vertical",
] as const;
export type InvitationLayout = (typeof LAYOUT_IDS)[number];

export const DEFAULT_LAYOUT: InvitationLayout = "classic";

export function isLayout(value: unknown): value is InvitationLayout {
  return typeof value === "string" && (LAYOUT_IDS as readonly string[]).includes(value);
}

/** Composición guardada, saneada: la clásica si falta o no se conoce. */
export function cleanLayout(value: unknown): InvitationLayout {
  return isLayout(value) ? value : DEFAULT_LAYOUT;
}

/**
 * Composiciones que «Reserva la fecha» también sabe dibujar en su lienzo. Las
 * demás (columna lateral y bloque minimal, que dependen de texto alineado a la
 * izquierda y de la hora) solo cambian la invitación; ahí «Reserva la fecha»
 * conserva la clásica.
 */
export const STATIONERY_LAYOUTS: readonly InvitationLayout[] = [
  "classic",
  "bigDate",
  "calendar",
  "editorial",
  "medallion",
  "vertical",
];

export function layoutInStationery(layout: InvitationLayout): InvitationLayout {
  return STATIONERY_LAYOUTS.includes(layout) ? layout : DEFAULT_LAYOUT;
}
