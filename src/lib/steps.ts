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

export const STEP_DEFINITIONS: StepDefinition[] = [
  {
    category: "fecha_presupuesto",
    title: "Fecha y presupuesto",
    description: "Fecha objetivo, presupuesto total y desglose por categoría.",
    suggestedTasks: [
      { title: DATE_TASK_TITLE, auto: "date" },
      { title: BUDGET_TASK_TITLE, auto: "budget" },
      "Repartir el presupuesto por categorías",
    ],
  },
  {
    category: "lugar",
    title: "Lugar",
    description: "Ceremonia y banquete (pueden ser el mismo sitio o distintos).",
    suggestedTasks: [
      "Visitar posibles lugares",
      "Reservar lugar de ceremonia",
      "Reservar lugar de banquete",
    ],
  },
  {
    category: "invitados",
    title: "Lista de invitados",
    description: "Nombre, grupo/familia, confirmación, acompañante y notas dietéticas.",
    suggestedTasks: [
      "Hacer el borrador de la lista",
      "Confirmar número final de invitados",
    ],
  },
  {
    category: "proveedores",
    title: "Proveedores",
    description: "Catering, fotografía, música/DJ, flores, pastel, transporte, etc.",
    suggestedTasks: [
      "Contratar catering",
      "Contratar fotógrafo/a",
      "Contratar música/DJ",
    ],
  },
  {
    category: "vestuario",
    title: "Vestuario",
    description: "Traje/vestido de los novios, complementos y pruebas.",
    suggestedTasks: ["Elegir vestido/traje", "Reservar pruebas"],
  },
  {
    category: "papeleria",
    title: "Papelería",
    description: "Reserva la fecha, invitaciones y tarjetas de mesa.",
    suggestedTasks: ["Diseñar las tarjetas «reserva la fecha»", "Enviar invitaciones"],
  },
  {
    category: "ceremonia",
    title: "Ceremonia",
    description: "Tipo (civil, religiosa, simbólica), oficiante y estructura.",
    suggestedTasks: ["Elegir tipo de ceremonia", "Confirmar oficiante"],
  },
  {
    category: "timeline",
    title: "Cronograma del día",
    description: "Cronograma hora a hora del gran día.",
    suggestedTasks: ["Borrador del cronograma", "Compartir cronograma con proveedores"],
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
    suggestedTasks: ["Elegir destino", "Reservar vuelos y alojamiento"],
  },
  {
    category: "documentos_legales",
    title: "Documentos legales",
    description: "Expediente matrimonial y otros trámites legales.",
    suggestedTasks: ["Iniciar expediente matrimonial", "Reunir documentación"],
  },
  {
    category: "lista_regalos",
    title: "Lista de regalos",
    description: "Lista de regalos o alternativas (luna de miel, donativo, etc.).",
    suggestedTasks: ["Decidir tipo de lista de regalos", "Crear la lista"],
  },
  {
    category: "tareas_generales",
    title: "Tareas generales",
    description: "Lista libre para todo lo que no encaje en otra sección.",
    suggestedTasks: [],
  },
];
