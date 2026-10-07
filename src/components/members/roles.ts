import type { PlanRole } from "@/lib/types";

export const ROLE_LABEL: Record<PlanRole, string> = {
  owner: "Dueño/a",
  partner: "Pareja",
  planner: "Wedding planner",
};

/** Roles que se pueden asignar al invitar (el dueño no se invita). */
export const INVITE_ROLE_OPTIONS: { value: PlanRole; label: string; description: string }[] = [
  { value: "partner", label: "Pareja", description: "Co-dueño del plan, con acceso total." },
  { value: "planner", label: "Wedding planner", description: "Colabora con acceso total." },
];
