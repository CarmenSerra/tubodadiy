import type { StepTaskAuto } from "@/lib/types";

/**
 * Tarea sugerida: un título o, si se marca sola desde el plan, título + `auto`.
 * `late: true` = se añadió después de la primera versión del checklist: los planes
 * ya creados la reciben una sola vez (ver `LATE_TASKS` y `firebase/base-steps.ts`).
 */
export type SuggestedTask = string | { title: string; auto: StepTaskAuto; late?: true };

export interface StepDefinition {
  category: string;
  title: string;
  description: string;
  suggestedTasks: SuggestedTask[];
  /** `true` = paso nuevo posterior a la primera versión: los planes ya creados lo reciben una sola vez. */
  late?: true;
}

export const DATE_TASK_TITLE = "Elegir una fecha objetivo";
export const BUDGET_TASK_TITLE = "Definir el presupuesto total";
export const TIMELINE_CATEGORY = "timeline";
export const BANQUET_CATEGORY = "banquete";
export const AFTER_WEDDING_CATEGORY = "despues_boda";
export const TIMELINE_DRAFT_TASK_TITLE = "Borrador del cronograma";
export const TIMELINE_SHARE_TASK_TITLE = "Compartir cronograma con proveedores";

export const STEP_DEFINITIONS: StepDefinition[] = [
  {
    category: "fecha_presupuesto",
    title: "Fecha y presupuesto",
    description: "Fecha objetivo, presupuesto total y desglose por categoría.",
    suggestedTasks: [
      { title: DATE_TASK_TITLE, auto: "date" },
      { title: BUDGET_TASK_TITLE, auto: "budget" },
      { title: "Repartir el presupuesto por categorías", auto: "budget-split" },
    ],
  },
  {
    category: "lugar",
    title: "Lugar",
    description: "Ceremonia y banquete (pueden ser el mismo sitio o distintos).",
    suggestedTasks: [
      { title: "Visitar posibles lugares", auto: "venue-visit" },
      { title: "Reservar lugar de ceremonia", auto: "venue-ceremony" },
      { title: "Reservar lugar de banquete", auto: "venue-banquet" },
    ],
  },
  {
    category: "invitados",
    title: "Lista de invitados",
    description: "Nombre, grupo/familia, confirmación, acompañante y notas dietéticas.",
    suggestedTasks: [
      { title: "Hacer el borrador de la lista", auto: "guests-draft" },
      { title: "Confirmar número final de invitados", auto: "guests-final" },
    ],
  },
  {
    category: "proveedores",
    title: "Proveedores",
    description: "Catering, fotografía, música/DJ, flores, pastel, transporte, etc.",
    suggestedTasks: [
      { title: "Contratar catering", auto: "vendor-catering" },
      { title: "Contratar fotógrafo/a", auto: "vendor-photo" },
      { title: "Contratar música/DJ", auto: "vendor-music" },
    ],
  },
  {
    category: "vestuario",
    title: "Vestuario y estilo",
    description: "Traje/vestido, complementos, pruebas, belleza, alianzas y decoración.",
    suggestedTasks: [
      "Elegir vestido/traje",
      { title: "Reservar pruebas", auto: "outfit-fitting" },
      { title: "Reservar peluquería y maquillaje", auto: "style-beauty", late: true },
      { title: "Elegir las alianzas", auto: "style-rings", late: true },
      { title: "Definir decoración y flores", auto: "style-decor", late: true },
    ],
  },
  {
    category: "papeleria",
    title: "Papelería",
    description: "Reserva la fecha, invitaciones y tarjetas de mesa.",
    suggestedTasks: [
      { title: "Diseñar las tarjetas «reserva la fecha»", auto: "stationery-save-date" },
      { title: "Enviar invitaciones", auto: "invitations-send" },
    ],
  },
  {
    category: "ceremonia",
    title: "Ceremonia",
    description: "Tipo (civil, religiosa, simbólica), oficiante y estructura.",
    suggestedTasks: [
      { title: "Elegir tipo de ceremonia", auto: "ceremony-type" },
      { title: "Confirmar oficiante", auto: "officiant-confirmed" },
      { title: "Elegir lecturas y música", auto: "ceremony-readings-music", late: true },
      { title: "Designar testigos", auto: "ceremony-witnesses", late: true },
    ],
  },
  {
    category: BANQUET_CATEGORY,
    title: "Banquete",
    description: "Plan de mesas y menú con alérgenos y dietas.",
    late: true,
    suggestedTasks: [
      { title: "Hacer el plan de mesas", auto: "banquet-seating", late: true },
      { title: "Cerrar el menú y los alérgenos", auto: "banquet-menu", late: true },
    ],
  },
  {
    category: TIMELINE_CATEGORY,
    title: "Cronograma del día",
    description: "Cronograma hora a hora, contactos, fotos clave y playlist del gran día.",
    suggestedTasks: [
      { title: TIMELINE_DRAFT_TASK_TITLE, auto: "timeline-draft" },
      { title: TIMELINE_SHARE_TASK_TITLE, auto: "timeline-share" },
      { title: "Reunir los contactos del día B", auto: "dayof-contacts", late: true },
      { title: "Hacer la lista de fotos clave", auto: "dayof-shots", late: true },
      { title: "Preparar la playlist", auto: "dayof-playlist", late: true },
    ],
  },
  {
    category: "alojamiento_transporte",
    title: "Alojamiento y transporte de invitados",
    description: "Opciones de alojamiento y transporte para los invitados.",
    suggestedTasks: ["Buscar alojamientos cercanos", "Organizar transporte"],
  },
  {
    category: "luna_de_miel",
    title: "Luna de miel",
    description: "Destino, fechas y reservas del viaje de novios.",
    suggestedTasks: [
      { title: "Elegir destino", auto: "honeymoon-destination" },
      { title: "Reservar vuelos y alojamiento", auto: "honeymoon-book" },
    ],
  },
  {
    category: "documentos_legales",
    title: "Documentos legales",
    description: "Expediente matrimonial y otros trámites legales.",
    suggestedTasks: [
      { title: "Iniciar expediente matrimonial", auto: "legal-start" },
      { title: "Reunir documentación", auto: "legal-docs" },
    ],
  },
  {
    category: "lista_regalos",
    title: "Regalo",
    description: "Elegir cómo recibir el regalo (dinero o lista de cosas) y el mensaje para invitados.",
    suggestedTasks: [
      { title: "Decidir cómo recibir el regalo", auto: "gift-decide" },
      { title: "Añadir los datos para el regalo", auto: "gift-data" },
    ],
  },
  {
    category: AFTER_WEDDING_CATEGORY,
    title: "Después de la boda",
    description: "Agradecimientos, pagos finales, devoluciones, trámites y recuerdos.",
    late: true,
    suggestedTasks: [
      { title: "Enviar los agradecimientos", auto: "after-thanks", late: true },
      { title: "Hacer los pagos finales a proveedores", auto: "after-payments", late: true },
      { title: "Devolver los alquileres (trajes, decoración)", auto: "after-returns", late: true },
      { title: "Inscribir el matrimonio y pedir el libro de familia", auto: "after-register", late: true },
      { title: "Actualizar empadronamiento, seguros, banco y Seguridad Social", auto: "after-paperwork", late: true },
      { title: "Conservar el vestido y el ramo", auto: "after-keepsakes", late: true },
      { title: "Valorar a los proveedores", auto: "after-rate-vendors", late: true },
      { title: "Recopilar las fotos de los invitados", auto: "after-photos", late: true },
    ],
  },
  {
    category: "tareas_generales",
    title: "Tareas generales",
    description: "Lista libre para todo lo que no encaje en otra sección.",
    suggestedTasks: [],
  },
];

/**
 * Pasos posteriores a la primera versión del checklist. Los planes ya creados no
 * los tienen: `ensureBaseSteps` (firebase/base-steps.ts) los crea una sola vez.
 */
export const LATE_STEPS: StepDefinition[] = STEP_DEFINITIONS.filter((def) => def.late);

/** Tarea base posterior a la primera versión (en un paso nuevo o en uno que ya existía). */
export interface LateTask {
  category: string;
  title: string;
  auto: StepTaskAuto;
}

/** Todas las tareas base «tardías» por paso, para incorporarlas a los planes ya creados. */
export const LATE_TASKS: LateTask[] = STEP_DEFINITIONS.flatMap((def) =>
  def.suggestedTasks.flatMap((task) =>
    typeof task !== "string" && task.late ? [{ category: def.category, title: task.title, auto: task.auto }] : []
  )
);

/** Definición de un paso base por su categoría (o `undefined` si es una sección propia). */
export function stepDefinitionOf(category: string): StepDefinition | undefined {
  return STEP_DEFINITIONS.find((def) => def.category === category);
}

const AUTO_BY_CATEGORY_AND_TITLE = new Map<string, StepTaskAuto>(
  STEP_DEFINITIONS.flatMap((def) =>
    def.suggestedTasks.flatMap((task) =>
      typeof task === "string" ? [] : ([[`${def.category}|${task.title}`, task.auto]] as const)
    )
  )
);

/**
 * Tareas base cuyo título ya no existe: los planes creados antes del cambio
 * las guardaron con el texto antiguo. Se leen como la tarea vigente.
 */
const LEGACY_TASKS = new Map<string, { title: string; auto: StepTaskAuto }>([
  [
    "lista_regalos|Decidir tipo de lista de regalos",
    { title: "Decidir cómo recibir el regalo", auto: "gift-decide" },
  ],
  [
    "lista_regalos|Crear la lista",
    { title: "Añadir los datos para el regalo", auto: "gift-data" },
  ],
]);

/**
 * Claves `auto` que ya no existen: los planes antiguos las guardaron en la
 * tarea y se leen como la clave vigente.
 */
const RENAMED_AUTOS: Record<string, StepTaskAuto> = {
  "vendor-officiant": "officiant-confirmed",
};

/** Clave `auto` vigente de una tarea (traduce las claves antiguas). */
export function currentAuto(auto: string | undefined): StepTaskAuto | undefined {
  if (!auto) return undefined;
  return RENAMED_AUTOS[auto] ?? (auto as StepTaskAuto);
}

/**
 * Clave `auto` de una tarea base guardada sin ella (los planes anteriores a
 * las herramientas enlazadas), según su paso y su título original.
 */
export function baseTaskAuto(category: string, title: string): StepTaskAuto | undefined {
  const key = `${category}|${title}`;
  return AUTO_BY_CATEGORY_AND_TITLE.get(key) ?? LEGACY_TASKS.get(key)?.auto;
}

/** Título vigente de una tarea base guardada con un título antiguo (o `undefined`). */
export function legacyTaskTitle(category: string, title: string): string | undefined {
  return LEGACY_TASKS.get(`${category}|${title}`)?.title;
}

// ---------------------------------------------------------------------------
// Textos mostrados (i18n)
//
// Las secciones y tareas base se GUARDAN en español dentro de cada plan
// (title, description, tasks[].title). Eso no cambia. Para mostrarlas en el
// idioma activo se usan las funciones de abajo: devuelven la traducción de
// src/locales/<lang>/steps.json si el texto guardado es el base (o uno
// legacy) y, si la persona lo editó o lo creó ella, el texto tal cual.
// Detalles y ejemplos en docs/i18n.md.
// ---------------------------------------------------------------------------

/**
 * `t` de i18next/react-i18next (`useTranslation().t` o `getServerT(...)`). Las
 * funciones indican el namespace "steps" en cada llamada, así que vale la `t`
 * de cualquier namespace.
 */
export type StepTranslate = (
  key: string,
  options: { ns: string; defaultValue: string }
) => string;

/** Claves de las tareas base que se guardan solo como texto (sin `auto`). */
const MANUAL_TASK_KEYS: Record<string, string> = {
  "vestuario|Elegir vestido/traje": "outfit-choose",
  "alojamiento_transporte|Buscar alojamientos cercanos": "lodging-search",
  "alojamiento_transporte|Organizar transporte": "transport-organize",
};

/** Títulos de tarea antiguos que SOLO se usan para mostrar (no para `auto`). */
const LEGACY_DISPLAY_TASK_KEYS: Record<string, string> = {
  "papeleria|Diseñar save the date": "stationery-save-date",
};

/** Títulos y descripciones antiguos de las secciones base (planes viejos). */
const LEGACY_STEP_TITLES: Record<string, string[]> = {
  vestuario: ["Vestuario"],
  [TIMELINE_CATEGORY]: ["Timeline del día"],
  lista_regalos: ["Lista de regalos"],
};
const LEGACY_STEP_DESCRIPTIONS: Record<string, string[]> = {
  vestuario: ["Traje/vestido de los novios, complementos y pruebas."],
  [TIMELINE_CATEGORY]: ["Cronograma hora a hora del gran día."],
  papeleria: ["Save the date, invitaciones, seating cards."],
  invitados: ["Nombre, grupo/familia, estado RSVP, acompañante y notas dietéticas."],
  tareas_generales: ["Checklist libre para todo lo que no encaje en otra sección."],
  lista_regalos: [
    "Recibir el regalo en dinero: cuenta bancaria o Bizum, y el mensaje para invitados.",
    "Lista de regalos o alternativas (luna de miel, donativo, etc.).",
  ],
};

const DEFINITION_BY_CATEGORY = new Map(STEP_DEFINITIONS.map((def) => [def.category, def]));

interface BaseTask {
  key: string;
  title: string;
  auto?: StepTaskAuto;
}

function baseTasksOf(def: StepDefinition): BaseTask[] {
  return def.suggestedTasks.map((task) =>
    typeof task === "string"
      ? { key: MANUAL_TASK_KEYS[`${def.category}|${task}`] ?? task, title: task }
      : { key: task.auto, title: task.title, auto: task.auto }
  );
}

/** Clave de traducción (dentro de `sections.<category>.tasks`) de una tarea base, o `undefined` si no lo es. */
function baseTaskKey(category: string, task: { title: string; auto?: string }): string | undefined {
  const def = DEFINITION_BY_CATEGORY.get(category);
  if (!def) return undefined;
  const tasks = baseTasksOf(def);
  const auto = currentAuto(task.auto);
  const legacyTitle = legacyTaskTitle(category, task.title);

  if (auto) {
    const entry = tasks.find((candidate) => candidate.auto === auto);
    if (entry) {
      // Con clave `auto` conocida, solo cuenta si el título sigue siendo el base o uno antiguo.
      const matches =
        task.title === entry.title ||
        legacyTitle === entry.title ||
        LEGACY_DISPLAY_TASK_KEYS[`${category}|${task.title}`] === entry.key;
      return matches ? entry.key : undefined;
    }
  }
  const byTitle = tasks.find((candidate) => candidate.title === (legacyTitle ?? task.title));
  return byTitle?.key ?? LEGACY_DISPLAY_TASK_KEYS[`${category}|${task.title}`];
}

/**
 * Título de una sección para mostrar. Si `storedTitle` (el `title` guardado en
 * el paso) es el base o uno antiguo —o no se pasa—, devuelve la traducción de
 * `steps:sections.<category>.title`; si la persona lo cambió, lo devuelve tal
 * cual. Una categoría desconocida (sección propia) devuelve `storedTitle`.
 */
export function displayStepTitle(category: string, t: StepTranslate, storedTitle?: string): string {
  const def = DEFINITION_BY_CATEGORY.get(category);
  if (!def) return storedTitle ?? category;
  const isBase =
    storedTitle === undefined ||
    storedTitle === def.title ||
    (LEGACY_STEP_TITLES[category] ?? []).includes(storedTitle);
  return isBase ? t(`sections.${category}.title`, { ns: "steps", defaultValue: def.title }) : storedTitle;
}

/** Igual que displayStepTitle, para la descripción guardada de la sección. */
export function displayStepDescription(
  category: string,
  t: StepTranslate,
  storedDescription?: string
): string {
  const def = DEFINITION_BY_CATEGORY.get(category);
  if (!def) return storedDescription ?? "";
  const isBase =
    storedDescription === undefined ||
    storedDescription === def.description ||
    (LEGACY_STEP_DESCRIPTIONS[category] ?? []).includes(storedDescription);
  return isBase
    ? t(`sections.${category}.description`, { ns: "steps", defaultValue: def.description })
    : storedDescription;
}

/**
 * Título de una tarea para mostrar. `task` es la tarea guardada
 * (`{ title, auto? }`). Si es una tarea base sin editar (título base o
 * antiguo, con o sin `auto`), devuelve `steps:sections.<category>.tasks.<key>`
 * traducido (la clave es el `auto` de la tarea o, si no tiene, un slug fijo);
 * si la persona la escribió o la renombró, devuelve `task.title` tal cual.
 */
export function displayTaskTitle(
  category: string,
  task: { title: string; auto?: string },
  t: StepTranslate
): string {
  const key = baseTaskKey(category, task);
  if (!key) return task.title;
  const base = baseTasksOf(DEFINITION_BY_CATEGORY.get(category)!).find((entry) => entry.key === key);
  return t(`sections.${category}.tasks.${key}`, { ns: "steps", defaultValue: base?.title ?? task.title });
}
