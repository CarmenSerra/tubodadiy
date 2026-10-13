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
