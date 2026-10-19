"use client";

import { collection, doc, getDoc, getDocs, limit, query, runTransaction } from "firebase/firestore";
import * as React from "react";

import { giftDecided, giftHasPaymentData } from "@/components/plan-tools/gift-model";
import { legalDocsComplete } from "@/components/plan-tools/legal-docs-model";
import {
  AUTO_TASKS_CATEGORY,
  CEREMONY_CATEGORY,
  GIFT_CATEGORY,
  GUESTS_CATEGORY,
  LEGAL_DOCS_CATEGORY,
  VENDORS_CATEGORY,
  HONEYMOON_CATEGORY,
  OUTFIT_CATEGORY,
  STATIONERY_CATEGORY,
  VENUE_CATEGORY,
  isBudgetSet,
  isDateSet,
  isOfficiantConfirmed,
  saveTheDateReached,
  statusForTasks,
  type AutoTaskInput,
} from "@/lib/auto-tasks";
import { ensureBaseSteps, syncToolMilestones } from "@/lib/firebase/base-steps";
import { getFirebaseDb } from "@/lib/firebase/client";
import { syncAppointmentTasks } from "@/lib/firebase/appointments";
import { mapSaveTheDate, saveTheDateRef } from "@/lib/firebase/designs";
import { syncHoneymoonBookTask, syncHoneymoonDestinationTask } from "@/lib/firebase/honeymoon";
import { mapInvitation, planInvitationQuery } from "@/lib/firebase/invitation";
import { syncAutoTaskStep, syncStepQuietly, syncToolTasks } from "@/lib/firebase/mutations";
import { syncGift } from "@/lib/firebase/plan-tools";
import { TIMELINE_CATEGORY } from "@/lib/steps";
import type { PlanStep, StepStatus, StepTask, StepTaskAuto, WeddingPlan } from "@/lib/types";

/**
 * Pone al día el progreso de los pasos al abrir el plan, por si alguna
 * sincronización no llegó a terminar (se cerró o recargó la pestaña justo
 * después de guardar, o falló la red) o el paso se escribió antes de que su
 * estado siguiera a las tareas. Solo MARCA lo que ya se cumple, nunca
 * desmarca. Nunca lanza: es progreso, no datos.
 */
export async function reconcileStepProgress(planId: string, plan: WeddingPlan, steps: PlanStep[]) {
  // Pasos y tareas base nuevos que los planes antiguos aún no tienen (una sola vez, sin duplicar).
  const addedBase = await ensureBaseSteps(planId, steps);

  const byCategory = new Map(steps.map((s) => [s.category, s]));
  const pendingAutos = (category: string, autos: StepTaskAuto[]) =>
    (byCategory.get(category)?.tasks ?? []).some((t) => !t.done && t.auto && autos.includes(t.auto));

  const work: Promise<unknown>[] = [];

  // Hitos que ya se cumplen según los datos del propio plan (sin leer nada más).
  const fromPlan: [string, AutoTaskInput][] = [
    [
      AUTO_TASKS_CATEGORY,
      {
        reached: [
          ...(isDateSet(plan.weddingDate) ? (["date"] as const) : []),
          ...(isBudgetSet(plan.budgetTotal) ? (["budget"] as const) : []),
        ],
      },
    ],
    [
      CEREMONY_CATEGORY,
      {
        reached: [
          ...(plan.ceremonyType ? (["ceremony-type"] as const) : []),
          ...(isOfficiantConfirmed(plan.officiant) ? (["officiant-confirmed"] as const) : []),
        ],
      },
    ],
    [
      LEGAL_DOCS_CATEGORY,
      { reached: legalDocsComplete(plan.ceremonyType, plan.legalDocsDone) ? ["legal-docs"] : [] },
    ],
    [
      GIFT_CATEGORY,
      {
        reached: [
          ...(giftDecided(plan.gift) ? (["gift-decide"] as const) : []),
          // Con lista, «datos» depende de que haya alguna cosa: se lee más abajo.
          ...(plan.gift?.mode !== "list" && giftHasPaymentData(plan.gift) ? (["gift-data"] as const) : []),
        ],
      },
    ],
  ];
  for (const [category, input] of fromPlan) {
    const step = byCategory.get(category);
    const hasWork = step?.tasks.some((t) => !t.done && t.auto && input.reached?.includes(t.auto));
    if (hasWork) work.push(syncAutoTaskStep(planId, category, input).catch(() => {}));
  }

  // Hitos que dependen de una herramienta: solo se lee su colección si queda
  // alguna tarea pendiente que ella pueda marcar.
  if (pendingAutos(GUESTS_CATEGORY, ["guests-draft", "guests-final"])) {
    work.push(syncToolTasks(planId, "guests", [GUESTS_CATEGORY]));
  }
  const vendorAutos: StepTaskAuto[] = [
    "vendor-catering",
    "vendor-photo",
    "vendor-music",
  ];
  if (pendingAutos(VENDORS_CATEGORY, vendorAutos)) {
    work.push(syncToolTasks(planId, "vendors", [VENDORS_CATEGORY]));
  }
  if (pendingAutos(AUTO_TASKS_CATEGORY, ["budget-split"])) {
    work.push(syncToolTasks(planId, "budgetItems", [AUTO_TASKS_CATEGORY]));
  }

  if (plan.gift?.mode === "list" && pendingAutos(GIFT_CATEGORY, ["gift-data"])) {
    work.push(syncGift(planId));
  }

  // Papelería: «reserva la fecha» (hay diseño guardado con contenido) y «enviar
  // invitaciones» (la invitación está publicada).
  if (pendingAutos(STATIONERY_CATEGORY, ["stationery-save-date"])) {
    work.push(
      getDoc(saveTheDateRef(planId))
        .then((snap) => {
          const reached = snap.exists() ? saveTheDateReached(mapSaveTheDate(snap.id, snap.data())) : [];
          return reached.length > 0 ? syncStepQuietly(planId, STATIONERY_CATEGORY, { reached }) : undefined;
        })
        .catch(() => {})
    );
  }
  if (pendingAutos(STATIONERY_CATEGORY, ["invitations-send"])) {
    work.push(
      getDocs(planInvitationQuery(planId))
        .then((snap) => {
          const published = snap.docs.some((d) => mapInvitation(d.id, d.data()).published);
          return published
            ? syncStepQuietly(planId, STATIONERY_CATEGORY, { reached: ["invitations-send"] })
            : undefined;
        })
        .catch(() => {})
    );
  }

  // Agenda de citas: «Visitar posibles lugares» y «Reservar pruebas».
  if (
    pendingAutos(VENUE_CATEGORY, ["venue-visit"]) ||
    pendingAutos(OUTFIT_CATEGORY, ["outfit-fitting"])
  ) {
    work.push(syncAppointmentTasks(planId));
  }

  // Luna de miel: destino elegido y reservas de vuelo/hotel.
  if (pendingAutos(HONEYMOON_CATEGORY, ["honeymoon-destination"])) {
    work.push(syncHoneymoonDestinationTask(planId, true));
  }
  if (pendingAutos(HONEYMOON_CATEGORY, ["honeymoon-book"])) {
    work.push(syncHoneymoonBookTask(planId));
  }

  // Cronograma: ya hay algún momento (compartirlo no deja rastro en los datos).
  if (pendingAutos(TIMELINE_CATEGORY, ["timeline-draft"])) {
    work.push(
      getDocs(query(collection(getFirebaseDb(), "weddingPlans", planId, "timelineItems"), limit(1)))
        .then((snap) =>
          snap.empty
            ? undefined
            : syncStepQuietly(planId, TIMELINE_CATEGORY, { reached: ["timeline-draft"] })
        )
        .catch(() => {})
    );
  }

  // Ceremonia, Día B, Banquete, Estilo y Después de la boda: hitos según sus datos (solo lectura).
  work.push(syncToolMilestones(planId, plan, steps, addedBase));

  // Pasos con todas las tareas hechas y el estado atrasado.
  for (const step of steps) {
    if (statusForTasks(step.status, step.tasks) !== step.status) {
      work.push(healStepStatus(planId, step.id).catch(() => {}));
    }
  }

  await Promise.all(work);
}

/** Alinea el estado de un paso con sus tareas (lee el paso actual dentro de la transacción). */
async function healStepStatus(planId: string, stepId: string) {
  const db = getFirebaseDb();
  const ref = doc(db, "weddingPlans", planId, "steps", stepId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const status: StepStatus = snap.data().status ?? "pending";
    const tasks: StepTask[] = snap.data().tasks ?? [];
    const next = statusForTasks(status, tasks);
    if (next !== status) tx.update(ref, { status: next });
  });
}

/** Margen tras reconciliar para que los cambios resultantes lleguen por el listener. */
const SETTLE_MS = 1500;
/** Tope: con la red lenta o caída no se deja sin celebrar para siempre. */
const SETTLE_CAP_MS = 6000;

/**
 * Lanza `reconcileStepProgress` una vez por plan abierto, cuando ya están
 * cargados el plan y los pasos. No se repite con cada cambio en vivo: si
 * alguien cambia a mano el estado de un paso, no se le lleva la contraria.
 * Devuelve `true` cuando la puesta al día ha terminado y sus efectos ya se
 * han visto: lo que cambie después es un cambio «en vivo» (la celebración de
 * fase completada solo se dispara con esos, no con lo que se repara al abrir).
 */
export function useReconcileStepProgress(
  planId: string,
  plan: WeddingPlan | null,
  steps: PlanStep[],
  loading: boolean
): boolean {
  const started = React.useRef<string | null>(null);
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const [settledFor, setSettledFor] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (loading || !plan || steps.length === 0 || started.current === planId) return;
    started.current = planId;
    timers.current.push(setTimeout(() => setSettledFor(planId), SETTLE_CAP_MS));
    void reconcileStepProgress(planId, plan, steps)
      .catch((error) => {
        console.warn("No se pudo poner al día el progreso del plan", error);
      })
      .finally(() => {
        timers.current.push(setTimeout(() => setSettledFor(planId), SETTLE_MS));
      });
  }, [planId, plan, steps, loading]);

  React.useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    []
  );

  return settledFor === planId;
}
