"use client";

// Avisos del navegador (los mismos que las tareas, mismo opt-in) ampliados a
// citas, plazos de pago y el día de la boda de hoy o mañana. Una sola
// notificación al día por plan, porque `showDueNotification` ya lo garantiza.

import * as React from "react";
import { getDoc, getDocs } from "firebase/firestore";

import {
  dueNotificationText,
  dueSoon,
  buildCalendarEvents,
  type CalendarEvent,
} from "@/components/calendar/calendar-model";
import { showDueNotification, useTaskNotifyState } from "@/components/dashboard/task-notifications";
import { appointmentsCollection, mapAppointment } from "@/lib/firebase/appointments";
import { budgetItemsQuery, mapBudgetItem, mapPlan, planDocRef } from "@/lib/firebase/plans";
import { useLanguage } from "@/lib/i18n/provider";
import type { PlanStep } from "@/lib/types";

/**
 * Avisa (si la persona activó los avisos) de lo que hay hoy o mañana. Con
 * `events` ya calculados (el calendario) no lee nada más; con `null` espera.
 */
export function useAgendaNotification(planId: string, events: readonly CalendarEvent[] | null) {
  const { lang } = useLanguage();
  const state = useTaskNotifyState();
  const text = React.useMemo(() => {
    if (!events) return null;
    const due = dueSoon(events);
    return due.length > 0 ? dueNotificationText(due, lang) : null;
  }, [events, lang]);
  const title = text?.title;
  const body = text?.body;

  React.useEffect(() => {
    if (state !== "on" || !title || body === undefined) return;
    void showDueNotification(planId, title, body);
  }, [state, planId, title, body]);
}

/**
 * Versión para el Resumen: recibe las tareas (`steps`, que el Resumen ya tiene)
 * y, solo si los avisos están activados, lee una vez las citas y los pagos
 * (sin escuchas permanentes), junto con el plan, y avisa de lo de hoy o mañana.
 */
export function useAgendaNotificationFromSteps(planId: string, steps: readonly PlanStep[]) {
  const { lang } = useLanguage();
  const state = useTaskNotifyState();
  const startedFor = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (state !== "on") {
      startedFor.current = null;
      return;
    }
    if (startedFor.current === planId) return;
    startedFor.current = planId;
    void (async () => {
      try {
        const [planSnap, appointments, budget] = await Promise.all([
          getDoc(planDocRef(planId)),
          getDocs(appointmentsCollection(planId)),
          getDocs(budgetItemsQuery(planId)),
        ]);
        const plan = planSnap.exists() ? mapPlan(planSnap.id, planSnap.data()) : null;
        const events = buildCalendarEvents({
          planId,
          planTitle: plan?.title ?? "",
          weddingDate: plan?.weddingDate ?? null,
          steps,
          appointments: appointments.docs.map((d) => mapAppointment(d.id, d.data())),
          budgetItems: budget.docs.map((d) => mapBudgetItem(d.id, d.data())),
          lang,
        });
        const due = dueSoon(events);
        if (due.length === 0) return;
        const { title, body } = dueNotificationText(due, lang);
        await showDueNotification(planId, title, body);
      } catch {
        // Sin permiso o sin conexión: hoy no se avisa.
      }
    })();
  }, [state, planId, steps, lang]);
}
