import type { CeremonyType } from "@/lib/types";

/** Casillas que activan papeles adicionales. Se guardan en `legalDocsDone` con este prefijo. */
export type LegalSituation = "foreign" | "previous";

export const SITUATION_PREFIX = "situacion:";
export const situationId = (s: LegalSituation) => `${SITUATION_PREFIX}${s}`;

/** Los textos salen de `tools:planTools.legal.situations.<id>.label|hint`. */
export const SITUATIONS: { id: LegalSituation }[] = [{ id: "foreign" }, { id: "previous" }];

/** Textos en `tools:planTools.legal.docs.<grupo>.<id>.title|hint`. */
export interface LegalDoc {
  id: string;
  /** Si no es obligatorio no cuenta para dar «Reunir documentación» por hecha. */
  optional?: boolean;
}

/** Título en `tools:planTools.legal.groups.<id>`. */
export interface LegalGroup {
  id: string;
  docs: LegalDoc[];
}

const CIVIL_FILE: LegalGroup = {
  id: "civil",
  docs: [
    {
      id: "cita",
    },
    {
      id: "dni",
    },
    {
      id: "nacimiento",
    },
    {
      id: "empadronamiento",
    },
    {
      id: "declaracion",
    },
    {
      id: "testigos",
    },
    {
      id: "resolucion",
    },
  ],
};

const RELIGIOUS_FILE: LegalGroup = {
  id: "religiosa",
  docs: [
    {
      id: "parroquia",
    },
    {
      id: "dni",
    },
    {
      id: "nacimiento",
    },
    {
      id: "bautismo",
    },
    {
      id: "confirmacion",
      optional: true,
    },
    {
      id: "cursillo",
    },
    {
      id: "expediente-parroquial",
    },
    {
      id: "empadronamiento",
      optional: true,
    },
    {
      id: "testigos",
    },
    {
      id: "inscripcion",
      optional: true,
    },
  ],
};

const FOREIGN_GROUP: LegalGroup = {
  id: "foreign",
  docs: [
    {
      id: "ext-capacidad",
    },
    {
      id: "ext-apostilla",
    },
    {
      id: "ext-traduccion",
    },
    {
      id: "ext-residencia",
      optional: true,
    },
  ],
};

const PREVIOUS_GROUP: LegalGroup = {
  id: "previous",
  docs: [
    {
      id: "matrimonio-anterior",
    },
    {
      id: "sentencia",
      optional: true,
    },
  ],
};

/** Aviso sobre cómo se ha elegido la lista (`tools:planTools.legal.intro.<clave>`), según el tipo de ceremonia. */
export function legalIntroKey(type: CeremonyType): "symbolic" | "religious" | "civil" {
  if (type === "simbolica") return "symbolic";
  if (type === "religiosa") return "religious";
  return "civil";
}

/** Grupos de papeles que aplican a una ceremonia y a las situaciones marcadas. */
export function legalGroups(type: CeremonyType, done: string[]): LegalGroup[] {
  // Los papeles comunes (dni, nacimiento…) comparten id entre civil y religiosa:
  // si cambias el tipo de ceremonia, lo ya marcado se mantiene.
  const groups = [type === "religiosa" ? RELIGIOUS_FILE : CIVIL_FILE];
  if (done.includes(situationId("foreign"))) groups.push(FOREIGN_GROUP);
  if (done.includes(situationId("previous"))) groups.push(PREVIOUS_GROUP);
  return groups;
}

/** Papeles obligatorios que aplican (los opcionales no cuentan). */
export function requiredLegalDocIds(type: CeremonyType | null, done: string[]): string[] {
  if (!type) return [];
  return legalGroups(type, done).flatMap((g) => g.docs.filter((d) => !d.optional).map((d) => d.id));
}

/** `true` cuando hay tipo de ceremonia y están marcados todos los papeles obligatorios. */
export function legalDocsComplete(type: CeremonyType | null, done: string[]): boolean {
  const required = requiredLegalDocIds(type, done);
  return required.length > 0 && required.every((id) => done.includes(id));
}
