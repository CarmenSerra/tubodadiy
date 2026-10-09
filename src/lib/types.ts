export type PlanRole = "owner" | "partner" | "planner";
export type MemberStatus = "pending" | "accepted";

export interface PlanMember {
  userId: string;
  role: PlanRole;
  status: MemberStatus;
  invitedEmail: string;
  /**
   * Reserved for future fine-grained access (e.g. read-only guests limited to
   * RSVP). Not enforced in the MVP — every member currently has full access.
   */
  permissions?: string[];
}

export interface WeddingPlan {
  id: string;
  ownerId: string;
  title: string;
  weddingDate: string | null;
  budgetTotal: number;
  memberIds: string[];
  /** Fases posteriores a la recomendada que el equipo ya ha desbloqueado. */
  unlockedPhaseIds: string[];
  /**
   * Fases que el equipo ha vuelto a bloquear a mano. Gana a `unlockedPhaseIds`
   * y al progreso: así se puede re-bloquear una fase abierta por tener avances.
   */
  lockedPhaseIds: string[];
  /** Tipo de ceremonia elegido (sirve para la checklist de documentos legales). */
  ceremonyType: CeremonyType | null;
  /** Ids de documentos legales ya reunidos (ver checklist por tipo de ceremonia). */
  legalDocsDone: string[];
  /** Ficha del oficiante de la ceremonia (no es un proveedor). */
  officiant: PlanOfficiant | null;
  /** Cómo recibir el regalo (dinero o lista de cosas); se puede mostrar en la invitación pública. */
  gift: PlanGift | null;
  createdAt: number | null;
}

export type CeremonyType = "civil" | "religiosa" | "simbolica";

/** Quién oficia: juez/a o concejal/a, sacerdote/párroco, celebrante, allegado/a u otro. */
export type OfficiantKind = "juez" | "sacerdote" | "celebrante" | "allegado" | "otro";

/** Ficha del oficiante, guardada en el documento del plan (`officiant`). */
export interface PlanOfficiant {
  name: string;
  kind: OfficiantKind | null;
  phone: string;
  email: string;
  confirmed: boolean;
  /** Honorarios en euros (opcional). */
  fee: number | null;
  /** Si los honorarios están reflejados como gasto pendiente en el presupuesto. */
  feeInBudget: boolean;
  /** Id del gasto del presupuesto enlazado (categoría «Ceremonia»), si lo hay. */
  budgetItemId: string | null;
  notes: string;
}

/** Cómo quiere la pareja recibir el regalo: dinero (IBAN/Bizum) o una lista de cosas. */
export type GiftMode = "money" | "list";

export interface PlanGift {
  /** Los regalos guardados antes de existir la lista no lo tienen: se leen como dinero. */
  mode: GiftMode;
  iban: string;
  bizum: string;
  /** Mensaje para los invitados cuando el regalo es en dinero. */
  message: string;
  /** Mensaje para los invitados cuando el regalo es una lista (cada modo tiene el suyo). */
  listMessage: string;
  showOnInvitation: boolean;
}

export type StepStatus = "pending" | "in_progress" | "completed" | "skipped";

/**
 * Clave de una tarea base que tiene una herramienta propia en la app (lleva
 * una flecha para ir a ella) y, casi siempre, se marca sola:
 *  - "date" / "budget": hay fecha de boda / presupuesto total (en los dos sentidos);
 *  - "timeline-draft" / "timeline-share": se crea el primer momento del
 *    cronograma / se copia o imprime;
 *  - "budget-split": hay gastos en 2 o más categorías;
 *  - "guests-draft": hay al menos un invitado;
 *  - "guests-final": hay invitados y ninguno está pendiente de respuesta;
 *  - "vendor-catering" / "vendor-photo" / "vendor-music": hay un proveedor
 *    elegido de esa categoría;
 *  - "officiant-confirmed": la ficha del oficiante está marcada como confirmada
 *    (en los dos sentidos). Los planes antiguos la guardaron como
 *    "vendor-officiant"; se leen con la clave vigente;
 *  - "venue-ceremony" / "venue-banquet": solo enlace a «Finca». Ceremonia y
 *    banquete comparten categoría, así que no se pueden distinguir y no se
 *    marcan solas;
 *  - "ceremony-type": el plan tiene tipo de ceremonia (en los dos sentidos);
 *  - "legal-start": solo enlace a la guía de documentos legales;
 *  - "legal-docs": están marcados todos los documentos que aplican (en los
 *    dos sentidos);
 *  - "venue-visit" / "outfit-fitting": solo enlace a la agenda de citas
 *    (abre «Nueva cita» de lugar / vestuario);
 *  - "stationery-save-date": solo enlace al diseñador «Reserva la fecha»;
 *  - "invitations-send": solo enlace al editor de invitación (Invitados);
 *  - "honeymoon-destination" / "honeymoon-book": solo enlace a la Luna de miel;
 *  - "gift-decide": la pareja ha elegido cómo recibir el regalo (en los dos sentidos);
 *  - "gift-data": el regalo tiene IBAN o Bizum, o la lista tiene alguna cosa (en los dos sentidos).
 * Las que se marcan por datos de otras herramientas nunca se desmarcan solas;
 * las del plan ("date", "budget", "ceremony-type", "officiant-confirmed",
 * "legal-docs", "gift-decide", "gift-data")
 * siguen al dato en los dos sentidos.
 */
export type StepTaskAuto =
  | "date"
  | "budget"
  | "budget-split"
  | "timeline-draft"
  | "timeline-share"
  | "guests-draft"
  | "guests-final"
  | "vendor-catering"
  | "vendor-photo"
  | "vendor-music"
  | "officiant-confirmed"
  | "venue-ceremony"
  | "venue-banquet"
  | "venue-visit"
  | "outfit-fitting"
  | "stationery-save-date"
  | "invitations-send"
  | "honeymoon-destination"
  | "honeymoon-book"
  | "ceremony-type"
  | "legal-start"
  | "legal-docs"
  | "gift-decide"
  | "gift-data";

export interface StepTask {
  id: string;
  title: string;
  done: boolean;
  auto?: StepTaskAuto;
  dueDate?: string | null;
  notes?: string;
}

export interface PlanStep {
  id: string;
  category: string;
  title: string;
  description?: string;
  status: StepStatus;
  sortOrder: number;
  notes: string;
  tasks: StepTask[];
}

export type RsvpStatus = "pending" | "confirmed" | "declined";

export interface Guest {
  id: string;
  name: string;
  groupName: string;
  rsvpStatus: RsvpStatus;
  plusOne: boolean;
  /** Nombre del acompañante (solo tiene sentido si `plusOne`). */
  plusOneName: string;
  dietaryNotes: string;
  notes: string;
  createdAt: number | null;
}

/** Flujo de decisión de una opción: explorando → visitada → favorita → elegida. */
export type VendorStatus = "exploring" | "visited" | "favorite" | "chosen";

export interface Vendor {
  id: string;
  category: string;
  name: string;
  contactEmail: string;
  contactPhone: string;
  cost: number | null;
  status: VendorStatus;
  notes: string;
  /** URL (http/https) de una foto de la opción. */
  photoUrl?: string;
  /** Dirección o ubicación en texto libre. */
  location?: string;
  /** Enlace (http/https) a Google Maps. */
  mapsUrl?: string;
  createdAt: number | null;
}

/** «Pagado»: ya gastado. «Pendiente»: previsto, aún sin pagar. */
export type BudgetItemState = "paid" | "pending";

/**
 * Un gasto: un único importe y un estado. Los documentos antiguos guardaban
 * `estimatedCost` / `actualCost` / `paid`; `mapBudgetItem` los traduce al leer.
 */
export interface BudgetItem {
  id: string;
  category: string;
  concept: string;
  amount: number;
  state: BudgetItemState;
  /** Fecha límite de pago (yyyy-MM-dd), solo útil mientras esté pendiente. */
  dueDate: string | null;
  createdAt: number | null;
}

export type InviteStatus = "pending" | "accepted" | "revoked";

export interface PlanInvite {
  token: string;
  planId: string;
  planTitle: string;
  email: string;
  role: PlanRole;
  status: InviteStatus;
  invitedByUid: string;
  createdAt: number | null;
}

/**
 * Un momento del cronograma del día. Las horas se guardan como minutos desde
 * las 00:00 del día de la boda; pueden pasar de 1440 (madrugada del día
 * siguiente, p. ej. 1560 = 02:00 del día después).
 */
export interface TimelineItem {
  id: string;
  title: string;
  startMin: number;
  /** Duración en minutos; 0 para un momento puntual. */
  durationMin: number;
  location: string;
  responsible: string;
  notes: string;
  /** Momento clave: se marca con un punto destacado en el cronograma. */
  highlight: boolean;
  createdAt: number | null;
}
