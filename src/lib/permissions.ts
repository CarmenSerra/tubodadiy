// Roles y permisos por sección del plan. Módulo puro (sin React ni Firebase):
// lo usan el cliente (hook, UI del equipo) y el servidor (aceptar invitación).
//
// Las MISMAS reglas viven en `firestore.rules` (`levelAllows`): si cambias los
// predeterminados de aquí, cámbialos allí también.
//
// Formato guardado en `weddingPlans/{id}/members/{uid}.permissions`:
//   lista de textos `"<sección>:view"` o `"<sección>:edit"` (editar implica ver).
//   Lista presente = manda tal cual (lo que no está, no se puede ver ni editar).
//   Ausente = predeterminado del rol (planner: todo; familia: ver todo salvo presupuesto).
// owner y partner (la pareja) siempre pueden todo; sus `permissions` se ignoran.

import type { PlanRole } from "@/lib/types";

/** Secciones sobre las que la pareja decide qué ve y edita cada persona. */
export const PLAN_SECTIONS = [
  "guests",
  "budget",
  "vendors",
  "banquet",
  "style",
  "dayof",
  "ceremony",
  "honeymoon",
  "invitation",
  "tasks",
] as const;
export type PlanSection = (typeof PLAN_SECTIONS)[number];

export type SectionLevel = "none" | "view" | "edit";

/** Qué cuelga de cada sección (para saber qué cubre un permiso). */
export const SECTION_ROUTE: Record<PlanSection, string> = {
  guests: "guests",
  budget: "budget",
  vendors: "vendors",
  banquet: "banquete",
  style: "estilo",
  dayof: "dia-b",
  ceremony: "ceremonia",
  honeymoon: "honeymoon",
  invitation: "invitation",
  // «Tareas» es el Resumen del plan (ruta base) y la agenda de citas.
  tasks: "",
};

/** Roles que se pueden elegir al invitar (la pareja del dueño es «partner»). */
export const ASSIGNABLE_ROLES: PlanRole[] = ["partner", "planner", "family"];

/** Roles cuyo acceso la pareja puede ajustar sección a sección. */
export function hasAdjustableAccess(role: PlanRole): boolean {
  return role === "planner" || role === "family";
}

/** La pareja (dueño/a y pareja) gestiona el equipo y los permisos. */
export function isCoupleRole(role: PlanRole | null | undefined): boolean {
  return role === "owner" || role === "partner";
}

/** Secciones que la familia no ve salvo que la pareja lo permita. */
const FAMILY_HIDDEN_BY_DEFAULT: readonly PlanSection[] = ["budget"];

function isSection(value: string): value is PlanSection {
  return (PLAN_SECTIONS as readonly string[]).includes(value);
}

/** Nivel de cada sección según el rol, sin `permissions` propios. */
export function defaultLevels(role: PlanRole): Record<PlanSection, SectionLevel> {
  const levels = {} as Record<PlanSection, SectionLevel>;
  for (const section of PLAN_SECTIONS) {
    if (role === "family") {
      levels[section] = FAMILY_HIDDEN_BY_DEFAULT.includes(section) ? "none" : "view";
    } else {
      levels[section] = "edit"; // owner, partner y planner
    }
  }
  return levels;
}

/** Niveles → lista guardada (`["guests:edit", "vendors:view", …]`). */
export function encodePermissions(levels: Record<PlanSection, SectionLevel>): string[] {
  const out: string[] = [];
  for (const section of PLAN_SECTIONS) {
    if (levels[section] === "edit") out.push(`${section}:edit`);
    else if (levels[section] === "view") out.push(`${section}:view`);
  }
  return out;
}

/** Lista guardada de predeterminados de un rol (para escribirla en el doc del miembro). */
export function defaultPermissions(role: PlanRole): string[] {
  return encodePermissions(defaultLevels(role));
}

/** Niveles efectivos de un miembro. `permissions` ausente = predeterminado del rol. */
export function resolveLevels(
  role: PlanRole,
  permissions: readonly string[] | undefined | null
): Record<PlanSection, SectionLevel> {
  if (isCoupleRole(role)) {
    return Object.fromEntries(PLAN_SECTIONS.map((s) => [s, "edit"])) as Record<PlanSection, SectionLevel>;
  }
  if (!Array.isArray(permissions)) return defaultLevels(role);
  const levels = Object.fromEntries(PLAN_SECTIONS.map((s) => [s, "none"])) as Record<PlanSection, SectionLevel>;
  for (const entry of permissions) {
    if (typeof entry !== "string") continue;
    const [section, level] = entry.split(":");
    if (!isSection(section)) continue;
    if (level === "edit") levels[section] = "edit";
    else if (level === "view" && levels[section] === "none") levels[section] = "view";
  }
  return levels;
}

export function levelOf(
  role: PlanRole,
  permissions: readonly string[] | undefined | null,
  section: PlanSection
): SectionLevel {
  return resolveLevels(role, permissions)[section];
}

/** Lista segura para guardar: solo entradas válidas, sin repetidos, editar implica ver. */
export function sanitizePermissions(permissions: readonly unknown[]): string[] {
  const levels = resolveLevels("family", permissions.filter((p): p is string => typeof p === "string"));
  return encodePermissions(levels);
}
