"use client";

import * as React from "react";
import Link from "next/link";
import { BellIcon, BellOffIcon, UserIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { useAgendaNotificationFromSteps } from "@/components/calendar/use-agenda-notification";
import {
  assigneeLabel,
  planTasksWithDates,
  taskReminders,
  type TaskWithDays,
} from "@/components/plan/task-model";
import { useAuth } from "@/lib/hooks/use-auth";
import { dateFormatter, parseDateOnly } from "@/lib/i18n/format";
import type { Lang } from "@/lib/i18n/config";
import { useLanguage } from "@/lib/i18n/provider";
import type { PlanSection, SectionLevel } from "@/lib/permissions";
import type { PlanStep } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  disableTaskNotifications,
  enableTaskNotifications,
  useTaskNotifyState,
} from "./task-notifications";
import { CARD, FOCUS, LINK } from "./ui";

const MAX_SHOWN = 5;

/** «Hoy», «Mañana», «En 5 días» o «Hace 3 días». */
function whenLabel(days: number, t: TFunction): string {
  if (days === 0) return t("taskReminders.today");
  if (days === 1) return t("taskReminders.tomorrow");
  return days > 0
    ? t("taskReminders.inDays", { count: days })
    : t("taskReminders.ago", { count: -days });
}

/** Número del día y mes abreviado para la insignia de la fecha. */
function dayBadge(date: string, lang: Lang): { day: string; month: string } {
  const d = parseDateOnly(date);
  if (!d) return { day: "–", month: "" };
  return { day: String(d.getDate()), month: dateFormatter(lang, { month: "short" }).format(d).replace(/\./g, "") };
}

function TaskGroup({
  id,
  title,
  hint,
  tasks,
  planId,
  tone,
  onReveal,
}: {
  id: string;
  title: string;
  hint?: string;
  tasks: TaskWithDays[];
  planId: string;
  tone: "upcoming" | "overdue";
  onReveal?: (stepId: string) => void;
}) {
  const { t } = useTranslation("dashboard");
  const { lang } = useLanguage();
  const { user } = useAuth();
  const shown = tasks.slice(0, MAX_SHOWN);
  const more = tasks.length - shown.length;
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="font-display text-lg font-semibold text-ink">
        {title}
      </h2>
      {hint && <p className="mb-3 text-sm text-ink-muted">{hint}</p>}
      <div className={cn(CARD, "p-2 sm:p-3", !hint && "mt-3")}>
        <ul>
          {shown.map((task) => {
            const badge = dayBadge(task.date, lang);
            const who = assigneeLabel(task, user?.uid, t("taskReminders.you"));
            return (
              <li key={`${task.stepId}-${task.id}`}>
                <Link
                  href={task.url}
                  onClick={(e) => {
                    if (!onReveal || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                    e.preventDefault();
                    onReveal(task.stepId);
                  }}
                  className={cn(
                    FOCUS,
                    "flex min-h-14 items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-lilac-soft motion-reduce:transition-none sm:gap-4 sm:px-3"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-lilac-mid py-1.5 text-ink-on-tint"
                  >
                    <span className="font-display text-xl font-semibold leading-none tabular-nums">{badge.day}</span>
                    <span className="mt-0.5 text-[0.7rem] font-medium uppercase tracking-wide">{badge.month}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-base font-semibold text-ink">{task.title}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-ink-muted">
                      <span className={cn(tone === "upcoming" && "font-medium text-green")}>
                        {whenLabel(task.days, t)}
                      </span>
                      {who && (
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <UserIcon aria-hidden="true" className="size-3.5 shrink-0" />
                          <span className="sr-only">{t("taskReminders.assignee")}: </span>
                          <span className="truncate">{who}</span>
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        {more > 0 && (
          <p className="px-2 pb-1 pt-2 text-sm text-ink-muted sm:px-3">
            {t("taskReminders.more", { count: more })}{" "}
            <Link href={`/plan/${planId}`} className={cn(LINK, "text-sm")}>
              {t("taskReminders.viewPlan")}
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}

/** Botón opt-in de los avisos del navegador; no se pinta si el navegador no los admite. */
function NotifyRow() {
  const { t } = useTranslation("dashboard");
  const state = useTaskNotifyState();
  if (state === "unsupported") return null;
  if (state === "blocked") {
    return <p className="text-sm text-ink-muted">{t("taskReminders.notify.blocked")}</p>;
  }
  const on = state === "on";
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <button
        type="button"
        onClick={() => (on ? disableTaskNotifications() : void enableTaskNotifications())}
        className={cn(
          FOCUS,
          "-ml-3 inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft motion-reduce:transition-none"
        )}
      >
        {on ? <BellOffIcon aria-hidden="true" className="size-4" /> : <BellIcon aria-hidden="true" className="size-4" />}
        {on ? t("taskReminders.notify.disable") : t("taskReminders.notify.enable")}
      </button>
      <span className="text-sm text-ink-muted">
        {on ? t("taskReminders.notify.onHelp") : t("taskReminders.notify.help")}
      </span>
    </div>
  );
}

/**
 * «Próximas tareas» (vencen en ≤14 días) y «Atrasadas», con responsable y
 * fecha, cada una enlazando a su tarjeta. Tono amable, sin colores de alerta.
 * `onReveal` (opcional) permite saltar a la tarjeta sin recargar cuando ya se
 * está en el Resumen; sin él es un enlace normal a `/plan/{id}#step-{id}`.
 * No pinta nada si no hay tareas por venir ni atrasadas.
 */
export function TaskReminders({
  planId,
  steps,
  levels,
  onReveal,
}: {
  planId: string;
  steps: PlanStep[];
  /** Qué puede ver la persona: los avisos solo leen citas (Tareas) y pagos (Presupuesto) si puede verlos. */
  levels: Record<PlanSection, SectionLevel>;
  onReveal?: (stepId: string) => void;
}) {
  const { t } = useTranslation("dashboard");
  const { upcoming, overdue } = React.useMemo(
    () => taskReminders(planTasksWithDates(planId, steps, { t, includeDone: false })),
    [planId, steps, t]
  );
  // Avisos del navegador (opt-in): tareas, citas, pagos y boda de hoy o mañana.
  useAgendaNotificationFromSteps(planId, steps, levels);

  if (upcoming.length === 0 && overdue.length === 0) return null;
  return (
    <div className="flex flex-col gap-6">
      {upcoming.length > 0 && (
        <TaskGroup
          id="upcoming-tasks-title"
          title={t("taskReminders.upcoming.title")}
          hint={t("taskReminders.upcoming.hint")}
          tasks={upcoming}
          planId={planId}
          tone="upcoming"
          onReveal={onReveal}
        />
      )}
      {overdue.length > 0 && (
        <TaskGroup
          id="overdue-tasks-title"
          title={t("taskReminders.overdue.title")}
          hint={t("taskReminders.overdue.hint")}
          tasks={overdue}
          planId={planId}
          tone="overdue"
          onReveal={onReveal}
        />
      )}
      <NotifyRow />
    </div>
  );
}
