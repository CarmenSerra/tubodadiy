import type { CeremonyType } from "@/lib/types";

/** Casillas que activan papeles adicionales. Se guardan en `legalDocsDone` con este prefijo. */
export type LegalSituation = "foreign" | "previous";

export const SITUATION_PREFIX = "situacion:";
export const situationId = (s: LegalSituation) => `${SITUATION_PREFIX}${s}`;

export const SITUATIONS: { id: LegalSituation; label: string; hint: string }[] = [
  {
    id: "foreign",
    label: "Alguna de las dos personas es extranjera o tiene documentos de otro país",
    hint: "Añade los papeles apostillados, traducidos y el certificado de capacidad matrimonial.",
  },
  {
    id: "previous",
    label: "Alguna de las dos personas ha estado casada antes",
    hint: "Añade el certificado del matrimonio anterior con el divorcio, la nulidad o el fallecimiento.",
  },
];

export interface LegalDoc {
  id: string;
  title: string;
  hint: string;
  /** Si no es obligatorio no cuenta para dar «Reunir documentación» por hecha. */
  optional?: boolean;
}

export interface LegalGroup {
  id: string;
  title: string;
  docs: LegalDoc[];
}

const CIVIL_FILE: LegalGroup = {
  id: "civil",
  title: "Expediente matrimonial civil",
  docs: [
    {
      id: "cita",
      title: "Pedir cita en el Registro Civil o en una notaría",
      hint: "Es el primer paso. Se hace en el Registro Civil del domicilio de cualquiera de los dos, o ante notario.",
    },
    {
      id: "dni",
      title: "DNI, NIE o pasaporte en vigor de las dos personas",
      hint: "Comprueba que no caducan antes de la boda.",
    },
    {
      id: "nacimiento",
      title: "Certificado literal de nacimiento",
      hint: "Se pide online en la sede electrónica del Ministerio de Justicia o en el Registro Civil. Suele exigirse reciente.",
    },
    {
      id: "empadronamiento",
      title: "Certificado de empadronamiento",
      hint: "Lo da el ayuntamiento (a menudo online). Sirve para saber qué Registro Civil os corresponde.",
    },
    {
      id: "declaracion",
      title: "Declaración jurada de estado civil",
      hint: "Cada persona declara su estado civil y que no hay impedimento para casarse. Normalmente se firma al iniciar el expediente.",
    },
    {
      id: "testigos",
      title: "Datos de dos testigos mayores de edad",
      hint: "Nombre, apellidos y DNI. Pregunta si tienen que acudir al expediente o solo a la boda.",
    },
    {
      id: "resolucion",
      title: "Resolución favorable del expediente",
      hint: "Es el papel que os permite casaros. Tiene un plazo de validez limitado: confirma el vuestro antes de fijar la fecha.",
    },
  ],
};

const RELIGIOUS_FILE: LegalGroup = {
  id: "religiosa",
  title: "Papeles de la ceremonia religiosa",
  docs: [
    {
      id: "parroquia",
      title: "Hablar con la parroquia o comunidad y fijar fecha",
      hint: "Es el primer paso: ellos os dirán qué piden y con cuánta antelación.",
    },
    {
      id: "dni",
      title: "DNI, NIE o pasaporte en vigor de las dos personas",
      hint: "Comprueba que no caducan antes de la boda.",
    },
    {
      id: "nacimiento",
      title: "Certificado literal de nacimiento",
      hint: "Se pide online en la sede electrónica del Ministerio de Justicia o en el Registro Civil. Suele exigirse reciente.",
    },
    {
      id: "bautismo",
      title: "Partida de bautismo reciente",
      hint: "En la parroquia donde se bautizó cada persona. Se pide con anotaciones y suele exigirse de hace pocos meses.",
    },
    {
      id: "confirmacion",
      title: "Partida de confirmación",
      hint: "Solo si la pide vuestra parroquia.",
      optional: true,
    },
    {
      id: "cursillo",
      title: "Cursillo prematrimonial",
      hint: "Charlas que organizan parroquias y diócesis. Las plazas se llenan: apúntate con tiempo y guarda el certificado de asistencia.",
    },
    {
      id: "expediente-parroquial",
      title: "Expediente matrimonial en la parroquia",
      hint: "Entrevista con quien oficia y firma de los documentos. La parroquia lo tramita con el obispado.",
    },
    {
      id: "empadronamiento",
      title: "Certificado de empadronamiento",
      hint: "Algunas parroquias lo piden para fijar a cuál corresponde casaros.",
      optional: true,
    },
    {
      id: "testigos",
      title: "Datos de dos testigos",
      hint: "Nombre, apellidos y DNI.",
    },
    {
      id: "inscripcion",
      title: "Inscripción en el Registro Civil tras la boda",
      hint: "Es lo que da efectos civiles. Pregunta a la parroquia si lo tramita ella y cuándo tendréis el certificado.",
      optional: true,
    },
  ],
};

const FOREIGN_GROUP: LegalGroup = {
  id: "foreign",
  title: "Si hay documentos de otro país",
  docs: [
    {
      id: "ext-capacidad",
      title: "Certificado de capacidad matrimonial o de estado civil del país de origen",
      hint: "Lo emite la autoridad o el consulado del país. Pregunta qué admite tu Registro Civil.",
    },
    {
      id: "ext-apostilla",
      title: "Documentos extranjeros apostillados o legalizados",
      hint: "La apostilla de La Haya los hace válidos en España. Se tramita en el país que los emite.",
    },
    {
      id: "ext-traduccion",
      title: "Traducción jurada de los documentos que no estén en castellano",
      hint: "La debe hacer un traductor o traductora jurada. Cuenta con unos días de plazo.",
    },
    {
      id: "ext-residencia",
      title: "Documento de residencia en España (NIE o certificado de registro)",
      hint: "Solo si vivís en España y no tenéis DNI.",
      optional: true,
    },
  ],
};

const PREVIOUS_GROUP: LegalGroup = {
  id: "previous",
  title: "Si hubo un matrimonio anterior",
  docs: [
    {
      id: "matrimonio-anterior",
      title: "Certificado literal del matrimonio anterior con la anotación de divorcio, nulidad o fallecimiento",
      hint: "Se pide en el Registro Civil donde se inscribió. Si el divorcio es de otro país, hará falta su documento apostillado y traducido.",
    },
    {
      id: "sentencia",
      title: "Sentencia o convenio de divorcio, o certificado de defunción",
      hint: "Si lo piden, además del certificado anterior.",
      optional: true,
    },
  ],
};

/** Aviso sobre cómo se ha elegido la lista, según el tipo de ceremonia. */
export function legalIntro(type: CeremonyType): string {
  if (type === "simbolica") {
    return "La ceremonia simbólica no tiene validez legal por sí sola, así que esta lista es la de la boda civil: es la que os da validez ante la ley.";
  }
  if (type === "religiosa") {
    return "Esta lista es la de una ceremonia católica. Si es de otra confesión, pregunta a vuestra comunidad qué pide y si necesitáis tramitar antes el certificado de capacidad matrimonial en el Registro Civil.";
  }
  return "Esta es la lista de una boda civil en España. Cada Registro Civil o notaría puede pedir algo más o algo menos.";
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
