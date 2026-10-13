import { canonicalCategory, categoryKey } from "@/components/vendors/vendor-model";

// Ideas curadas para el botón "✨ Ideas" de cada sección: sugerencias realistas
// para bodas en España que se añaden con un clic. Aquí solo van los datos que no
// son texto (ids, plazos, porcentajes, duraciones); los textos (título, consejo,
// plazo) están en los locales:
//   - tareas por paso ............ vendors:ideas.steps.<paso>.<id>.{title,hint,when}
//   - tipos de proveedor ......... vendors:ideas.vendors.<slug>.{hint,when}
//   - momentos del cronograma .... vendors:ideas.moments.<id>.{title,hint}
//   - partidas de presupuesto .... budget:ideas.items.<slug>.{hint,concepts.<n>}
//   - invitados .................. guests:ideas.{groups.<id>,tips.<n>}
// Los valores guardados (categoría de proveedor o de partida) siguen siendo los nombres
// en español de siempre; solo se traduce al mostrar.

// ─── Tipos ────────────────────────────────────────────────────────────────

/** Tramo de plazo para filtrar las tareas sugeridas (según el plazo orientativo de la idea). */
export type LeadGroup = "early" | "mid" | "late" | "after" | "other";

/** Tarea sugerida de un paso: `id` identifica sus textos; `lead` es su tramo de plazo. */
export interface TaskIdea {
  id: string;
  lead: LeadGroup;
}

/** Partida de presupuesto típica; `share` es un % orientativo del total. */
export interface BudgetIdea {
  /** Clave de traducción (budget:categories.<slug>, budget:ideas.items.<slug>). */
  slug: string;
  /** Nombre guardado de la categoría (español). */
  category: string;
  share: number;
  /** Cuántos conceptos típicos hay en budget:ideas.items.<slug>.concepts. */
  concepts: number;
  /** ¿Hay un consejo en budget:ideas.items.<slug>.hint? */
  hasHint: boolean;
}

/** Tipo de proveedor; `category` reutiliza los nombres guardados de la pestaña Proveedores. */
export interface VendorIdea {
  category: string;
  /** Clave de traducción (vendors:categories.<slug>, vendors:ideas.vendors.<slug>). */
  slug: string;
  essential: boolean;
  /** ¿Hay plazo de reserva en vendors:ideas.vendors.<slug>.when? */
  hasWhen: boolean;
}

/** Momento del cronograma; `typicalOffsetMin` es relativo al inicio de la ceremonia. */
export interface MomentIdea {
  id: string;
  durationMin: number;
  typicalOffsetMin?: number;
}

export interface GuestIdeas {
  /** Ids de guests:ideas.groups.<id>. */
  groups: string[];
  /** Cuántos consejos hay en guests:ideas.tips.<n>. */
  tips: number;
}

// ─── Tareas por paso ──────────────────────────────────────────────────────
// Sin repetir las tareas por defecto de steps.ts; orden aproximadamente cronológico.

export const STEP_TASK_IDEAS: Record<string, TaskIdea[]> = {
  fecha_presupuesto: [
    { id: "hablar-que-importa-mas", lead: "early" },
    { id: "preguntar-con-cuanta-ayuda", lead: "early" },
    { id: "abrir-una-cuenta-conjunta", lead: "early" },
    { id: "comparar-temporada-alta-baja", lead: "early" },
    { id: "consultar-fechas-con-familiares", lead: "early" },
    { id: "calcular-coste-por-invitado", lead: "early" },
    { id: "apuntar-los-sobres-regalos", lead: "early" },
    { id: "reservar-colchon-del-5", lead: "early" },
    { id: "revisar-presupuesto-con-contratado", lead: "other" },
    { id: "pactar-quien-paga-cada", lead: "mid" },
  ],
  invitados: [
    { id: "definir-cuantos-invitados-quereis", lead: "early" },
    { id: "acordar-los-criterios-invitacion", lead: "early" },
    { id: "repartir-cupos-entre-vosotros", lead: "early" },
    { id: "separar-lista-lista", lead: "early" },
    { id: "recoger-direcciones-telefonos-todos", lead: "mid" },
    { id: "preguntar-por-alergias-intolerancias", lead: "mid" },
    { id: "decidir-invita-ninos-que", lead: "early" },
    { id: "confirmar-asistentes-por-llamada", lead: "late" },
    { id: "pedir-confirmacion-menu-cada", lead: "late" },
    { id: "asignar-cada-invitado-una", lead: "late" },
    { id: "preparar-plano-mesas-con", lead: "late" },
    { id: "avisar-los-invitados-bajas", lead: "late" },
  ],
  lugar: [
    { id: "hacer-una-lista-corta", lead: "early" },
    { id: "preguntar-fechas-libres-precio", lead: "early" },
    { id: "comprobar-espacio-incluye-catering", lead: "early" },
    { id: "preguntar-por-horario-maximo", lead: "other" },
    { id: "ver-plan-llueve", lead: "other" },
    { id: "confirmar-accesos-parking-accesibilidad", lead: "other" },
    { id: "preguntar-que-mobiliario-decoracion", lead: "other" },
    { id: "pedir-contrato-revisar-politica", lead: "other" },
    { id: "preguntar-por-hora-acceso", lead: "mid" },
    { id: "repasar-con-espacio-distribucion", lead: "mid" },
    { id: "pedir-lista-proveedores-recomendados", lead: "other" },
    { id: "hacer-una-ultima-visita", lead: "late" },
  ],
  proveedores: [
    { id: "hacer-una-lista-proveedores", lead: "early" },
    { id: "pedir-presupuesto-3-fotografos", lead: "early" },
    { id: "ver-albumes-completos-bodas", lead: "early" },
    { id: "reservar-peluqueria-maquillaje", lead: "mid" },
    { id: "elegir-florista-definir-estilo", lead: "mid" },
    { id: "encargar-tarta-nupcial", lead: "mid" },
    { id: "probar-menu-con-catering", lead: "mid" },
    { id: "preguntar-por-recena-barra", lead: "mid" },
    { id: "contratar-animacion-cuidadores-para", lead: "mid" },
    { id: "firmar-todos-los-contratos", lead: "other" },
    { id: "anotar-fechas-pago-senales", lead: "other" },
    { id: "dar-cada-proveedor-cronograma", lead: "late" },
    { id: "confirmar-por-telefono-con", lead: "late" },
    { id: "preparar-sobres-con-pago", lead: "late" },
  ],
  ceremonia: [
    { id: "decidir-ceremonia-mismo-sitio", lead: "early" },
    { id: "preguntar-por-horarios-disponibilidad", lead: "early" },
    { id: "elegir-las-personas-que", lead: "mid" },
    { id: "elegir-lecturas-poemas-textos", lead: "mid" },
    { id: "escribir-los-votos", lead: "late" },
    { id: "elegir-musica-entrada-firma", lead: "mid" },
    { id: "preparar-ensayo-ceremonia", lead: "late" },
    { id: "decidir-como-colocar-familia", lead: "late" },
    { id: "comprar-encargar-ramo-las", lead: "mid" },
    { id: "preparar-cojin-caja-para", lead: "late" },
    { id: "imprimir-programa-misal-ceremonia", lead: "late" },
    { id: "preparar-arroz-petalos-confeti", lead: "late" },
  ],
  documentos_legales: [
    { id: "pedir-cita-registro-civil", lead: "mid" },
    { id: "pedir-certificado-literal-nacimiento", lead: "mid" },
    { id: "obtener-certificado-empadronamiento", lead: "mid" },
    { id: "conseguir-certificado-estado-civil", lead: "mid" },
    { id: "preparar-copias-del-dni", lead: "mid" },
    { id: "elegir-los-testigos-del", lead: "mid" },
    { id: "pedir-partida-bautismo-reciente", lead: "mid" },
    { id: "hacer-expediente-parroquial", lead: "mid" },
    { id: "apuntarse-cursillo-prematrimonial", lead: "mid" },
    { id: "confirmar-con-parroquia-oficiante", lead: "mid" },
    { id: "preguntar-por-posibles-tramites", lead: "mid" },
    { id: "decidir-regimen-economico-matrimonial", lead: "late" },
    { id: "anotar-fechas-horas-todas", lead: "other" },
    { id: "pedir-libro-familia-tras", lead: "after" },
    { id: "cambiar-domicilio-titulares-contratos", lead: "after" },
  ],
  vestuario: [
    { id: "guardar-fotos-inspiracion-looks", lead: "early" },
    { id: "fijar-presupuesto-vestuario", lead: "early" },
    { id: "pedir-cita-varios-talleres", lead: "early" },
    { id: "elegir-zapatos-comprobar-que", lead: "mid" },
    { id: "elegir-velo-tocado-complementos", lead: "mid" },
    { id: "elegir-ropa-interior-para", lead: "mid" },
    { id: "elegir-camisa-corbata-pajarita", lead: "mid" },
    { id: "decidir-vestuario-pajes-damas", lead: "mid" },
    { id: "hacer-prueba-final-los", lead: "late" },
    { id: "preparar-kit-emergencia-para", lead: "late" },
    { id: "encargar-quien-cuidara-del", lead: "late" },
    { id: "planificar-limpieza-conservacion-posterior", lead: "after" },
  ],
  papeleria: [
    { id: "definir-estilo-visual-boda", lead: "early" },
    { id: "pedir-presupuesto-3-imprentas", lead: "mid" },
    { id: "redactar-texto-invitacion", lead: "mid" },
    { id: "crear-una-web-codigo", lead: "mid" },
    { id: "imprimir-una-prueba-antes", lead: "mid" },
    { id: "encargar-sobres-sellos-lacre", lead: "mid" },
    { id: "disenar-menu-seating-los", lead: "late" },
    { id: "preparar-cartel-bienvenida", lead: "late" },
    { id: "encargar-las-tarjetas-agradecimiento", lead: "late" },
    { id: "preparar-libro-firmas-dedicatorias", lead: "late" },
    { id: "fijar-fecha-limite-para", lead: "mid" },
  ],
  alojamiento_transporte: [
    { id: "hacer-una-lista-invitados", lead: "mid" },
    { id: "pedir-bloqueo-habitaciones-hoteles", lead: "mid" },
    { id: "reservar-alojamiento-para-familia", lead: "mid" },
    { id: "reservar-suite-habitacion-los", lead: "mid" },
    { id: "contratar-autobuses-microbuses-para", lead: "mid" },
    { id: "reservar-coche-los-novios", lead: "mid" },
    { id: "dar-los-invitados-una", lead: "late" },
    { id: "hacer-una-lista-taxis", lead: "late" },
    { id: "preparar-una-bolsa-bienvenida", lead: "late" },
    { id: "confirmar-horarios-del-autobus", lead: "late" },
    { id: "designar-una-persona-contacto", lead: "late" },
  ],
  lista_regalos: [
    { id: "decidir-preferis-recibir-dinero", lead: "mid" },
    { id: "decidir-quereis-cuenta-bancaria", lead: "mid" },
    { id: "repasar-que-falta-casa", lead: "mid" },
    { id: "incluir-cosas-distinto-precio", lead: "mid" },
    { id: "anadir-enlace-precio-aproximado", lead: "mid" },
    { id: "marcar-las-cosas-mas", lead: "mid" },
    { id: "marcando-lista-que-teneis", lead: "other" },
    { id: "pedir-los-invitados-que", lead: "mid" },
    { id: "guardar-los-tickets-los", lead: "other" },
    { id: "elegir-una-cuenta-que", lead: "mid" },
    { id: "decidir-para-que-quereis", lead: "mid" },
    { id: "redactar-mensaje-breve-carinoso", lead: "mid" },
    { id: "revisar-iban-bizum-antes", lead: "mid" },
    { id: "decidir-donde-veran-los", lead: "mid" },
    { id: "preparar-una-respuesta-para", lead: "late" },
    { id: "decidir-como-recoger-los", lead: "late" },
    { id: "anotar-quien-regalado-cuanto", lead: "other" },
    { id: "enviar-mensajes-agradecimiento-personalizados", lead: "after" },
  ],
  timeline: [
    { id: "repasar-cronograma-con-padrinos", lead: "late" },
    { id: "dejar-margen-entre-los", lead: "other" },
    { id: "acordar-con-fotografo-las", lead: "late" },
    { id: "calcular-horas-peluqueria-maquillaje", lead: "late" },
    { id: "avisar-los-invitados-hora", lead: "late" },
    { id: "planificar-las-comidas-los", lead: "late" },
    { id: "pasar-cronograma-catering-finca", lead: "late" },
    { id: "asignar-responsable-del-dia", lead: "late" },
    { id: "imprimir-copias-del-cronograma", lead: "late" },
    { id: "preparar-lista-musica-para", lead: "late" },
  ],
  luna_de_miel: [
    { id: "decidir-cuanto-presupuesto-dedicais", lead: "early" },
    { id: "elegir-epoca-del-ano", lead: "mid" },
    { id: "decidir-que-tipo-viaje", lead: "mid" },
    { id: "comprobar-visados-vacunas-requisitos", lead: "mid" },
    { id: "contratar-seguro-viaje", lead: "other" },
    { id: "valorar-viaje-novios-posterior", lead: "mid" },
    { id: "avisar-hotel-que-viaje", lead: "late" },
    { id: "reservar-las-actividades-restaurantes", lead: "late" },
    { id: "planificar-traslado-desde-boda", lead: "late" },
    { id: "hacer-las-maletas-semana", lead: "late" },
    { id: "dejar-alguien-encargado-casa", lead: "late" },
  ],
  tareas_generales: [
    { id: "elegir-una-persona-confianza", lead: "late" },
    { id: "hacer-una-cuenta-atras", lead: "early" },
    { id: "comprar-las-alianzas", lead: "mid" },
    { id: "preparar-los-detalles-para", lead: "late" },
    { id: "planificar-los-discursos-quien", lead: "late" },
    { id: "preparar-video-sorpresa-una", lead: "late" },
    { id: "cuidar-vosotros-citas-descanso", lead: "other" },
    { id: "contratar-seguro-bodas", lead: "mid" },
    { id: "preparar-una-bolsa-emergencia", lead: "late" },
    { id: "preparar-una-caja-regalo", lead: "late" },
    { id: "planificar-quien-recoge-decoracion", lead: "late" },
    { id: "preparar-noche-bodas-manana", lead: "late" },
  ],
};

// ─── Presupuesto ──────────────────────────────────────────────────────────
// Reparto orientativo para una boda media en España; suma 100 %.

export const BUDGET_CATEGORY_IDEAS: BudgetIdea[] = [
  { slug: "banquet", category: "Banquete y catering", share: 30, concepts: 6, hasHint: true },
  { slug: "venueSpace", category: "Finca o espacio", share: 14, concepts: 5, hasHint: true },
  { slug: "photoVideo", category: "Fotografía y vídeo", share: 8, concepts: 5, hasHint: true },
  { slug: "musicDance", category: "Música y baile", share: 6, concepts: 5, hasHint: true },
  { slug: "brideAttire", category: "Vestuario de la novia", share: 5, concepts: 5, hasHint: false },
  { slug: "groomAttire", category: "Vestuario del novio", share: 3, concepts: 5, hasHint: false },
  { slug: "flowersDecor", category: "Flores y decoración", share: 7, concepts: 5, hasHint: false },
  { slug: "stationery", category: "Papelería", share: 3, concepts: 5, hasHint: false },
  { slug: "rings", category: "Alianzas", share: 2, concepts: 4, hasHint: false },
  { slug: "beauty", category: "Belleza", share: 2, concepts: 5, hasHint: true },
  { slug: "transport", category: "Transporte", share: 2, concepts: 4, hasHint: false },
  { slug: "guestGifts", category: "Detalles para invitados", share: 3, concepts: 5, hasHint: false },
  { slug: "honeymoon", category: "Luna de miel", share: 8, concepts: 5, hasHint: true },
  { slug: "ceremony", category: "Ceremonia y trámites", share: 2, concepts: 5, hasHint: false },
  { slug: "contingency", category: "Imprevistos", share: 5, concepts: 4, hasHint: true },
];

/** Redondea a múltiplos de 10 € (el equilibrio se aplica a la partida mayor). */
function roundTo10(value: number): number {
  return Math.round(value / 10) * 10;
}

/**
 * Reparte `total` según los % orientativos, redondeando cada partida a 10 €.
 * El ajuste de redondeo se aplica a la partida mayor para que la suma
 * coincida con el total redondeado a 10 €.
 */
export function suggestBudget(total: number): { category: string; amount: number }[] {
  if (!Number.isFinite(total) || total <= 0) return [];
  const rows = BUDGET_CATEGORY_IDEAS.map((idea) => ({
    category: idea.category,
    amount: roundTo10((total * idea.share) / 100),
  }));
  const diff = roundTo10(total) - rows.reduce((sum, row) => sum + row.amount, 0);
  if (diff !== 0) {
    let largest = rows[0];
    for (const row of rows) if (row.amount > largest.amount) largest = row;
    largest.amount = Math.max(0, largest.amount + diff);
  }
  return rows;
}

// ─── Proveedores ──────────────────────────────────────────────────────────
// Los nombres de `category` coinciden con los de la pestaña Proveedores
// (Finca, Catering, Fotógrafo, Vídeo, Música, Flores, Pastel, Transporte,
// Decoración); el resto son categorías personalizadas.

export const VENDOR_TYPE_IDEAS: VendorIdea[] = [
  { category: "Finca", slug: "venue", essential: true, hasWhen: true },
  { category: "Catering", slug: "catering", essential: true, hasWhen: true },
  { category: "Fotógrafo", slug: "photographer", essential: true, hasWhen: true },
  { category: "Vídeo", slug: "video", essential: false, hasWhen: true },
  { category: "Música", slug: "music", essential: true, hasWhen: true },
  { category: "Música para la ceremonia", slug: "ceremonyMusic", essential: false, hasWhen: true },
  { category: "Flores", slug: "flowers", essential: false, hasWhen: true },
  { category: "Decoración", slug: "decor", essential: false, hasWhen: true },
  { category: "Pastel", slug: "cake", essential: false, hasWhen: true },
  { category: "Peluquería y maquillaje", slug: "hairMakeup", essential: false, hasWhen: true },
  { category: "Vestido", slug: "dress", essential: true, hasWhen: true },
  { category: "Traje", slug: "suit", essential: true, hasWhen: true },
  { category: "Alianzas", slug: "rings", essential: true, hasWhen: true },
  { category: "Transporte", slug: "transport", essential: false, hasWhen: true },
  { category: "Animación infantil", slug: "kidsEntertainment", essential: false, hasWhen: true },
  { category: "Fotomatón", slug: "photoBooth", essential: false, hasWhen: true },
  { category: "Wedding planner", slug: "weddingPlanner", essential: false, hasWhen: true },
  { category: "Invitaciones", slug: "invitations", essential: false, hasWhen: true },
];

/** Normaliza igual que la pestaña Proveedores (sin tildes ni mayúsculas, con alias). */
function vendorKey(category: string): string {
  return categoryKey(canonicalCategory(category));
}

/** Tipos de proveedor que aún no tenéis en vuestra lista. */
export function missingVendorTypes(existingCategories: string[]): VendorIdea[] {
  const have = new Set(existingCategories.map(vendorKey));
  return VENDOR_TYPE_IDEAS.filter((idea) => !have.has(vendorKey(idea.category)));
}

// ─── Cronograma ───────────────────────────────────────────────────────────
// `typicalOffsetMin` es relativo al inicio de la ceremonia (0 = empieza).

export const TIMELINE_MOMENT_IDEAS: MomentIdea[] = [
  { id: "preparativos-vestirse", durationMin: 150, typicalOffsetMin: -210 },
  { id: "fotos-pareja-antes", durationMin: 30, typicalOffsetMin: -60 },
  { id: "llegada-invitados", durationMin: 30, typicalOffsetMin: -30 },
  { id: "entrada-del-novio", durationMin: 5, typicalOffsetMin: -5 },
  { id: "entrada-novia", durationMin: 5, typicalOffsetMin: 0 },
  { id: "lecturas", durationMin: 10, typicalOffsetMin: 10 },
  { id: "lectura-votos", durationMin: 10, typicalOffsetMin: 20 },
  { id: "intercambio-alianzas", durationMin: 5, typicalOffsetMin: 30 },
  { id: "firma-del-acta", durationMin: 10, typicalOffsetMin: 35 },
  { id: "salida-con-arroz", durationMin: 10, typicalOffsetMin: 45 },
  { id: "fotos-familia", durationMin: 30, typicalOffsetMin: 55 },
  { id: "coctel-bienvenida", durationMin: 90, typicalOffsetMin: 60 },
  { id: "fotos-pareja", durationMin: 30, typicalOffsetMin: 75 },
  { id: "entrada-banquete", durationMin: 10, typicalOffsetMin: 150 },
  { id: "banquete-discursos", durationMin: 120, typicalOffsetMin: 160 },
  { id: "video-sorpresa", durationMin: 5, typicalOffsetMin: 220 },
  { id: "corte-tarta", durationMin: 15, typicalOffsetMin: 280 },
  { id: "entrega-detalles", durationMin: 15, typicalOffsetMin: 290 },
  { id: "lanzamiento-del-ramo", durationMin: 10, typicalOffsetMin: 300 },
  { id: "primer-baile", durationMin: 5, typicalOffsetMin: 310 },
  { id: "apertura-barra-libre", durationMin: 180, typicalOffsetMin: 320 },
  { id: "recena", durationMin: 30, typicalOffsetMin: 480 },
  { id: "fin-fiesta", durationMin: 15, typicalOffsetMin: 560 },
  { id: "autobus-vuelta", durationMin: 30, typicalOffsetMin: 570 },
];

// ─── Invitados ────────────────────────────────────────────────────────────

export const GUEST_IDEAS: GuestIdeas = {
  groups: ["familia-novia", "familia-del-novio", "padres-abuelos", "tios-primos", "amigos-infancia", "amigos-del-cole", "amigos-universidad", "amigos-pareja", "trabajo", "vecinos-amigos-familia", "ninos"],
  tips: 5,
};
