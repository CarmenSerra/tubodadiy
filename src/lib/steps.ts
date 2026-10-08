import type { StepTaskAuto } from "@/lib/types";

/** Tarea sugerida: un título o, si se marca sola desde el plan, título + `auto`. */
export type SuggestedTask = string | { title: string; auto: StepTaskAuto };

export interface StepDefinition {
  category: string;
  title: string;
  description: string;
  suggestedTasks: SuggestedTask[];
}

export const DATE_TASK_TITLE = "Elegir una fecha objetivo";
export const BUDGET_TASK_TITLE = "Definir el presupuesto total";
export const TIMELINE_CATEGORY = "timeline";
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
    title: "Vestuario",
    description: "Traje/vestido de los novios, complementos y pruebas.",
    suggestedTasks: [
      "Elegir vestido/traje",
      { title: "Reservar pruebas", auto: "outfit-fitting" },
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
      { title: "Confirmar oficiante", auto: "vendor-officiant" },
    ],
  },
  {
    category: TIMELINE_CATEGORY,
    title: "Cronograma del día",
    description: "Cronograma hora a hora del gran día.",
    suggestedTasks: [
      { title: TIMELINE_DRAFT_TASK_TITLE, auto: "timeline-draft" },
      { title: TIMELINE_SHARE_TASK_TITLE, auto: "timeline-share" },
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
    description: "Recibir el regalo en dinero: cuenta bancaria o Bizum, y el mensaje para invitados.",
    suggestedTasks: [
      { title: "Decidir cómo recibir el regalo", auto: "gift-decide" },
      { title: "Añadir los datos para el regalo", auto: "gift-data" },
    ],
  },
  {
    category: "tareas_generales",
    title: "Tareas generales",
    description: "Lista libre para todo lo que no encaje en otra sección.",
    suggestedTasks: [],
  },
];

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
