export interface StepDefinition {
  category: string;
  title: string;
  description: string;
  suggestedTasks: string[];
}

export const STEP_DEFINITIONS: StepDefinition[] = [
  {
    category: "fecha_presupuesto",
    title: "Fecha y presupuesto",
    description: "Fecha objetivo, presupuesto total y desglose por categoría.",
    suggestedTasks: [
      "Elegir una fecha objetivo",
      "Definir el presupuesto total",
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
    description: "Nombre, grupo/familia, estado RSVP, acompañante y notas dietéticas.",
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
    description: "Save the date, invitaciones, seating cards.",
    suggestedTasks: ["Diseñar save the date", "Enviar invitaciones"],
  },
  {
    category: "ceremonia",
    title: "Ceremonia",
    description: "Tipo (civil, religiosa, simbólica), oficiante y estructura.",
    suggestedTasks: ["Elegir tipo de ceremonia", "Confirmar oficiante"],
  },
  {
    category: "timeline",
    title: "Timeline del día",
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
    description: "Checklist libre para todo lo que no encaje en otra sección.",
    suggestedTasks: [],
  },
];
