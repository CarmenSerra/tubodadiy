"use client";

import * as React from "react";

import { EVENT_TYPES, buildCalendarEvents, type CalendarEvent, type EventType } from "@/components/calendar/calendar-model";
import { appointmentsCollection, mapAppointment } from "@/lib/firebase/appointments";
import { budgetItemsQuery, mapBudgetItem, mapStep, stepsQuery } from "@/lib/firebase/plans";
import { useCollection } from "@/lib/hooks/use-collection";
import { usePlanAccess } from "@/lib/hooks/use-plan-permission";
import { useLanguage } from "@/lib/i18n/provider";
import type { WeddingPlan } from "@/lib/types";

export interface CalendarData {
  events: CalendarEvent[];
  /** Tipos de evento que esta persona puede ver (el resto ni se lee ni se filtra). */
  types: readonly EventType[];
  loading: boolean;
  /** Algún listado no se pudo leer (sin permiso, sin conexión…). */
  failed: boolean;
}

/**
 * Citas, tareas con fecha, plazos de pago y día de la boda de un plan, ya juntos y ordenados.
 * Solo lee lo que la persona puede ver: citas y tareas piden «Tareas»; los pagos, «Presupuesto».
 */
export function useCalendarEvents(planId: string, plan: WeddingPlan | null): CalendarData {
  const { lang } = useLanguage();
  const { levels, loading: accessLoading } = usePlanAccess();
  const canTasks = levels.tasks !== "none";
  const canBudget = levels.budget !== "none";
  const steps = useCollection(canTasks ? stepsQuery(planId) : null, mapStep);
  const appointments = useCollection(canTasks ? appointmentsCollection(planId) : null, mapAppointment);
  const budget = useCollection(canBudget ? budgetItemsQuery(planId) : null, mapBudgetItem);
  const types = React.useMemo(
    () =>
      EVENT_TYPES.filter(
        (type) => (type === "payment" ? canBudget : type === "wedding" ? true : canTasks)
      ),
    [canTasks, canBudget]
  );

  const events = React.useMemo(
    () =>
      buildCalendarEvents({
        planId,
        planTitle: plan?.title ?? "",
        weddingDate: plan?.weddingDate ?? null,
        steps: steps.data,
        appointments: appointments.data,
        budgetItems: budget.data,
        lang,
      }),
    [planId, plan?.title, plan?.weddingDate, steps.data, appointments.data, budget.data, lang]
  );

  return {
    events,
    types,
    loading: accessLoading || steps.loading || appointments.loading || budget.loading,
    failed: Boolean(steps.error || appointments.error || budget.error),
  };
}
