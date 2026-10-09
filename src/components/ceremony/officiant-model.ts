import type { OfficiantKind, PlanOfficiant } from "@/lib/types";

export const OFFICIANT_KIND_OPTIONS: { value: OfficiantKind; label: string }[] = [
  { value: "juez", label: "Juez/a o concejal/a" },
  { value: "sacerdote", label: "Sacerdote o párroco" },
  { value: "celebrante", label: "Oficiante civil o celebrante" },
  { value: "allegado", label: "Amigo/a o familiar" },
  { value: "otro", label: "Otro" },
];

export function officiantKindLabel(kind: OfficiantKind | null | undefined): string | null {
  return OFFICIANT_KIND_OPTIONS.find((o) => o.value === kind)?.label ?? null;
}

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
