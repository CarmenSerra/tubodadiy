import type { PlanRole } from "@/lib/types";

export const ROLE_LABEL: Record<PlanRole, string> = {
  owner: "Dueño/a",
  partner: "Pareja",
  planner: "Organizador/a de bodas",
};

/** Roles que se pueden asignar al invitar (el dueño no se invita). */
export const INVITE_ROLE_OPTIONS: { value: PlanRole; label: string; description: string }[] = [
  { value: "partner", label: "Pareja", description: "Gestiona el plan contigo, con acceso total." },
  { value: "planner", label: "Organizador/a de bodas", description: "Colabora con acceso total." },
];
