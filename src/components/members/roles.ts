import type { TFunction } from "i18next";

import type { PlanRole } from "@/lib/types";

/** Roles que se pueden asignar al invitar (el dueño no se invita). */
export const INVITE_ROLES: PlanRole[] = ["partner", "planner"];

/** Nombre del rol en el idioma activo (`dashboard:roles.<rol>`). `t` de cualquier namespace. */
export function roleLabel(role: PlanRole, t: TFunction): string {
  return t(`roles.${role}.label`, { ns: "dashboard" });
}

/** Una línea que explica qué puede hacer el rol al invitar (`dashboard:roles.<rol>.description`). */
export function roleDescription(role: PlanRole, t: TFunction): string {
  return t(`roles.${role}.description`, { ns: "dashboard" });
}
