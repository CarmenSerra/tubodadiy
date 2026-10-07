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
  createdAt: number | null;
}

export type StepStatus = "pending" | "in_progress" | "completed" | "skipped";

export interface StepTask {
  id: string;
  title: string;
  done: boolean;
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

export interface BudgetItem {
  id: string;
  category: string;
  concept: string;
  estimatedCost: number;
  actualCost: number | null;
  paid: boolean;
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
