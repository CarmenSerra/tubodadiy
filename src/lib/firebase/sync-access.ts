// Qué puede leer y escribir la persona conectada en el plan abierto, para las
// sincronizaciones automáticas de tareas (funciones sueltas, sin React).
//
// `<SyncAccessBridge>` (components/members) lo mantiene al día con los permisos
// reales (`usePlanAccess`). Si no hay nada registrado para ese plan (p. ej. al
// crear un plan nuevo, siendo su dueño/a), se permite todo, como antes.
//
// Así una sincronización que necesita editar «Tareas» o leer una sección sin
// permiso se salta sin lanzar lecturas ni escrituras que Firestore denegaría.

import type { PlanSection, SectionLevel } from "@/lib/permissions";

let registered: { planId: string; levels: Record<PlanSection, SectionLevel> } | null = null;

export function setSyncAccess(planId: string, levels: Record<PlanSection, SectionLevel> | null) {
  registered = levels ? { planId, levels } : null;
}

/**
 * ¿Se pueden escribir los pasos (Tareas: editar) y leer las secciones de las
 * que depende la sincronización (ver)?
 */
export function canSyncTasks(planId: string, ...reads: PlanSection[]): boolean {
  if (!registered || registered.planId !== planId) return true;
  const { levels } = registered;
  return levels.tasks === "edit" && reads.every((section) => levels[section] !== "none");
}

/** ¿Se puede leer (solo leer) esa sección? */
export function canReadSection(planId: string, section: PlanSection): boolean {
  if (!registered || registered.planId !== planId) return true;
  return registered.levels[section] !== "none";
}

/** ¿Se puede editar (y por tanto leer) esa sección? */
export function canWriteSection(planId: string, section: PlanSection): boolean {
  if (!registered || registered.planId !== planId) return true;
  return registered.levels[section] === "edit";
}
