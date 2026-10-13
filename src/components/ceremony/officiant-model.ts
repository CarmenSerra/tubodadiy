import type { OfficiantKind, PlanOfficiant } from "@/lib/types";

/**
 * Tipos de oficiante. Lo guardado en el plan es `value`; el texto se traduce al
 * mostrarlo con `ceremony:officiant.kinds.<value>`.
 */
export const OFFICIANT_KIND_OPTIONS: { value: OfficiantKind }[] = [
  { value: "juez" },
  { value: "sacerdote" },
  { value: "celebrante" },
  { value: "allegado" },
  { value: "otro" },
];

/** Ficha sin el enlace al gasto (lo gestiona `saveOfficiant`). */
export type OfficiantDraft = Omit<PlanOfficiant, "budgetItemId">;

export const EMPTY_OFFICIANT: OfficiantDraft = {
  name: "",
  kind: null,
  phone: "",
  email: "",
  confirmed: false,
  fee: null,
  feeInBudget: false,
  notes: "",
};

/** `true` si la ficha no tiene nada escrito ni marcado. */
export function isOfficiantEmpty(o: OfficiantDraft): boolean {
  return (
    !o.name.trim() &&
    !o.kind &&
    !o.phone.trim() &&
    !o.email.trim() &&
    !o.confirmed &&
    o.fee === null &&
    !o.notes.trim()
  );
}

/**
 * Lo único obligatorio de la ficha es el nombre: sin él no hay a quién llamar
 * ni a quién confirmar. El resto (tipo, contacto, honorarios, notas) es
 * opcional. Es lo que decide si se puede guardar.
 */
export function hasOfficiantName(o: Pick<OfficiantDraft, "name">): boolean {
  return o.name.trim().length > 0;
}

/** Ficha con algo escrito o marcado pero sin nombre: no se puede guardar. */
export function isOfficiantMissingName(o: OfficiantDraft): boolean {
  return !hasOfficiantName(o) && !isOfficiantEmpty(o);
}
