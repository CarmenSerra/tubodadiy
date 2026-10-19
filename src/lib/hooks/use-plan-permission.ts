"use client";

import * as React from "react";

import { usePlanContext } from "@/lib/context/plan-context";
import { memberDocRef } from "@/lib/firebase/members";
import { mapMember } from "@/lib/firebase/plans";
import { useAuth } from "@/lib/hooks/use-auth";
import { useDoc } from "@/lib/hooks/use-doc";
import { resolveLevels, type PlanSection, type SectionLevel } from "@/lib/permissions";
import type { PlanRole, WeddingPlan } from "@/lib/types";

export interface PlanAccess {
  /** Rol de la persona en este plan; null mientras carga o si no es miembro. */
  role: PlanRole | null;
  /** Nivel de cada sección (mismas reglas que `firestore.rules`). */
  levels: Record<PlanSection, SectionLevel>;
  /** Dueño/a o pareja: gestionan el equipo y los permisos. */
  isCouple: boolean;
  /** Puede tocar los datos generales del plan (título y fecha): pareja, planner o miembro antiguo. */
  isCore: boolean;
  loading: boolean;
}

const NO_ACCESS = resolveLevels("family", []);
const FULL_ACCESS = resolveLevels("owner", undefined);

/**
 * Rol y nivel de acceso por sección de la persona conectada en el plan actual.
 * Debe usarse dentro de `<PlanProvider>`. Refleja a `firestore.rules`: dueño =
 * todo; miembro sin doc propio (anterior a los roles) = todo; el resto, según
 * rol y `permissions` de su doc en `members`.
 */
export function usePlanAccess(): PlanAccess {
  const { planId, plan, loading } = usePlanContext();
  return useAccessForPlan(planId, plan, loading);
}

/**
 * Lo mismo para un plan concreto fuera de `<PlanProvider>` (p. ej. la home, que
 * muestra el plan destacado). `plan` null = aún sin cargar o sin acceso.
 */
export function useAccessForPlan(
  planId: string,
  plan: WeddingPlan | null,
  planLoading: boolean
): PlanAccess {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const isOwner = Boolean(plan && uid && plan.ownerId === uid);
  const isMember = Boolean(plan && uid && plan.memberIds.includes(uid));

  const ref = React.useMemo(
    () => (planId && uid && isMember && !isOwner ? memberDocRef(planId, uid) : null),
    [planId, uid, isMember, isOwner]
  );
  const { data: member, loading: memberLoading } = useDoc(ref, mapMember);

  return React.useMemo<PlanAccess>(() => {
    if (planLoading) return { role: null, levels: NO_ACCESS, isCouple: false, isCore: false, loading: true };
    if (!plan || !isMember) return { role: null, levels: NO_ACCESS, isCouple: false, isCore: false, loading: false };
    if (isOwner) return { role: "owner", levels: FULL_ACCESS, isCouple: true, isCore: true, loading: false };
    if (memberLoading) return { role: null, levels: NO_ACCESS, isCouple: false, isCore: false, loading: true };
    // Miembro anterior a los roles (sin doc propio): conserva el acceso total.
    if (!member) return { role: null, levels: FULL_ACCESS, isCouple: false, isCore: true, loading: false };
    return {
      role: member.role,
      levels: resolveLevels(member.role, member.permissions),
      isCouple: member.role === "partner",
      isCore: member.role === "partner" || member.role === "planner",
      loading: false,
    };
  }, [planLoading, plan, isMember, isOwner, memberLoading, member]);
}

export interface PlanPermission {
  level: SectionLevel;
  canView: boolean;
  canEdit: boolean;
  loading: boolean;
}

/**
 * Qué puede hacer la persona conectada en una sección. Mientras carga, nada
 * (`loading: true`), así no parpadean botones que luego desaparecen.
 *
 *   const { canEdit } = usePlanPermission("guests");
 *   {canEdit && <button>Añadir invitado</button>}
 */
export function usePlanPermission(section: PlanSection): PlanPermission {
  const { levels, loading } = usePlanAccess();
  const level = levels[section];
  return { level, canView: level !== "none", canEdit: level === "edit", loading };
}
