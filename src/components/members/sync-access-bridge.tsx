"use client";

import * as React from "react";

import { usePlanContext } from "@/lib/context/plan-context";
import { setSyncAccess } from "@/lib/firebase/sync-access";
import { usePlanAccess } from "@/lib/hooks/use-plan-permission";

/**
 * Comunica los permisos de la persona a las sincronizaciones automáticas de
 * tareas (`lib/firebase/sync-access.ts`). No pinta nada. Va antes del contenido
 * de la página para que ya esté registrado cuando este arranque.
 */
export function SyncAccessBridge() {
  const { planId } = usePlanContext();
  const { levels } = usePlanAccess();

  React.useLayoutEffect(() => {
    setSyncAccess(planId, levels);
    return () => setSyncAccess(planId, null);
  }, [planId, levels]);

  return null;
}
