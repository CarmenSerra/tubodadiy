"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  CalendarIcon,
  ChevronDownIcon,
  ClockIcon,
  PlusIcon,
  SlidersHorizontalIcon,
  StickyNoteIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapse } from "@/components/ui/collapse";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CTA_SECONDARY, FOCUS } from "@/components/dashboard/ui";
import { StepIdeas } from "@/components/ideas/step-ideas";
import { useAppointmentsLauncher } from "@/components/appointments/appointments-launcher";
import { usePlanToolsLauncher } from "@/components/plan-tools/plan-tools-launcher";
import { useEditPlanLauncher } from "@/components/plan/edit-plan-launcher";
import { STATUS_LABEL_KEY, StepStatusControl } from "@/components/plan/step-status";
import { manualTaskTarget, taskTarget } from "@/components/plan/task-links";
import { TaskDetailsDialog } from "@/components/plan/task-details-dialog";
import { assigneeLabel, hasTaskDetails, taskDateOrNull, taskStatus } from "@/components/plan/task-model";
import { useSaveTheDateLauncher } from "@/components/stationery/stationery-launcher";
import { useTimelineLauncher } from "@/components/timeline/timeline-launcher";
import {
  addTaskToStep,
  removeTaskFromStep,
  replaceStepTasks,
  restoreStepTasks,
  toggleTaskInStep,
  updateStepNotes,
} from "@/lib/firebase/mutations";
import {
  TIMELINE_CATEGORY,
  displayStepDescription,
  displayStepTitle,
  displayTaskTitle,
} from "@/lib/steps";
import { formatDateValue } from "@/lib/i18n/format";
import { useLanguage } from "@/lib/i18n/provider";
import { useAuth } from "@/lib/hooks/use-auth";
import type { PlanStep } from "@/lib/types";
import { toastWithUndo } from "@/lib/undo-toast";
import { cn } from "@/lib/utils";

// Campos de texto de marca: blancos, borde lila y foco #927AAC.
const FIELD =
  "rounded-xl border-line-strong bg-field text-sm text-ink-strong shadow-none placeholder:text-ink-placeholder focus-visible:ring-lilac focus-visible:ring-offset-0";

/** Id de la fila: permite saltar a ella desde otras partes de la app (#step-{id}). */
export const stepElementId = (stepId: string) => `step-${stepId}`;
/** Id del botón que despliega la fila (a donde va el foco al llegar por enlace). */
export const stepTriggerId = (stepId: string) => `step-trigger-${stepId}`;

/**
 * Un paso del plan como fila limpia: control de estado redondo, título y
 * descripción de una línea, "x/y tareas" y chevron. Desplegada muestra las
 * tareas, añadir tarea y notas.
 */
export function StepCard({
  planId,
  step,
  recommended,
  open,
  onOpenChange,
}: {
  planId: string;
  step: PlanStep;
  /** Es el paso que recomendamos hacer ahora: lleva un acento discreto. */
  recommended: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("plan");
  const { lang } = useLanguage();
  const { user } = useAuth();
  const [notes, setNotes] = React.useState(step.notes);
  // Tarea cuyo panel de detalles está abierto (por id, para seguirla si cambia en vivo).
  const [detailsId, setDetailsId] = React.useState<string | null>(null);
  const [newTask, setNewTask] = React.useState("");
  const doneCount = step.tasks.filter((task) => task.done).length;
  // Secciones y tareas base: se muestran traducidas; lo que la persona escribió o editó, tal cual.
  const stepTitle = displayStepTitle(step.category, t, step.title);
  const stepDescription = displayStepDescription(step.category, t, step.description);
  const taskTitle = (task: PlanStep["tasks"][number]) => displayTaskTitle(step.category, task, t);
  const bodyId = `step-body-${step.id}`;
  const completed = step.status === "completed";
  const muted = step.status === "skipped";
  // Texto secundario y foco: sobre el violeta de «completado» cambian de tinta.
  const soft = completed ? "text-on-done-muted" : "text-ink-muted";
  const ring = completed
    ? "focus-visible:ring-on-done focus-visible:ring-offset-done"
    : "focus-visible:ring-offset-surface";
  // El paso del cronograma tiene su propia herramienta (un diálogo).
  const timeline = useTimelineLauncher();
  const openTimeline = step.category === TIMELINE_CATEGORY ? timeline?.open : undefined;
  const editPlan = useEditPlanLauncher();
  const tools = usePlanToolsLauncher();
  const appointments = useAppointmentsLauncher();
  const saveTheDate = useSaveTheDateLauncher();

  // Flecha de una tarea base hacia su herramienta; `null` si no tiene o no se puede abrir aquí.
  function taskArrow(task: PlanStep["tasks"][number]) {
    const target = taskTarget(task.auto, planId) ?? manualTaskTarget(step.category, task.title, planId);
    if (!target) return null;
    const targetLabel = t(target.labelKey);
    const label = `${targetLabel}: ${taskTitle(task)}`;
    const className = cn(
      "size-8 shrink-0 rounded-full focus-visible:ring-lilac",
      completed
        ? "text-on-done-muted hover:bg-on-done/15 hover:text-on-done focus-visible:ring-on-done"
        : "text-ink-muted hover:bg-lilac-soft hover:text-ink"
    );
    const icon = <ArrowRightIcon aria-hidden="true" className="size-4" />;
    if (target.kind === "href") {
      return (
        <Button asChild variant="ghost" size="icon" className={className}>
          <Link href={target.href} aria-label={label} title={targetLabel}>
            {icon}
          </Link>
        </Button>
      );
    }
    let open: (() => void) | null | undefined;
    switch (target.kind) {
      case "timeline":
        open = timeline?.open;
        break;
      case "tool":
        open = tools && (() => tools.open(target.tool));
        break;
      case "agenda":
        open = appointments && (() => appointments.open({ category: target.category }));
        break;
      case "save-the-date":
        open = saveTheDate?.open;
        break;
      default:
        open = editPlan?.open;
    }
    if (!open) return null;
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={label}
        title={targetLabel}
        className={className}
        onClick={open}
      >
        {icon}
      </Button>
    );
  }

  const detailsTask = step.tasks.find((task) => task.id === detailsId);

  // Responsable, fecha, «en curso» y notas de una tarea, en una línea discreta bajo el título.
  function taskMeta(task: PlanStep["tasks"][number]) {
    if (!hasTaskDetails(task)) return null;
    const who = assigneeLabel(task, user?.uid, t("task.assignee.you"));
    const date = taskDateOrNull(task.dueDate);
    const dateText = date ? formatDateValue(date, lang, { day: "numeric", month: "short" }) : null;
    const inProgress = taskStatus(task) === "in_progress";
    const hasNotes = Boolean(task.notes?.trim());
    return (
      <span className={cn("mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs", soft)}>
        {inProgress && <span className="font-medium">{t("task.status.in_progress")}</span>}
        {who && (
          <span className="inline-flex min-w-0 items-center gap-1">
            <UserIcon aria-hidden="true" className="size-3 shrink-0" />
            <span className="sr-only">{t("task.assignee.label")}: </span>
            <span className="truncate">{who}</span>
          </span>
        )}
        {dateText && (
          <span className="inline-flex items-center gap-1">
            <CalendarIcon aria-hidden="true" className="size-3 shrink-0" />
            <span className="sr-only">{t("task.dueDate.label")}: </span>
            {dateText}
          </span>
        )}
        {hasNotes && (
          <span className="inline-flex items-center gap-1">
            <StickyNoteIcon aria-hidden="true" className="size-3 shrink-0" />
            <span className="sr-only">{t("task.meta.notes")}</span>
          </span>
        )}
      </span>
    );
  }

  React.useEffect(() => {
    // Keep the editable textarea in sync with real-time updates from other
    // collaborators editing the same step concurrently.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotes(step.notes);
  }, [step.notes]);

  async function handleNotesBlur() {
    if (notes === step.notes) return;
    try {
      await updateStepNotes(planId, step.id, notes);
    } catch {
      toast.error(t("step.errors.notes"));
    }
  }

  async function handleToggleTask(taskId: string) {
    try {
      await replaceStepTasks(planId, step, toggleTaskInStep(step, taskId));
    } catch {
      toast.error(t("step.errors.updateTask"));
    }
  }

  async function handleRemoveTask(taskId: string) {
    try {
      // Foto del paso antes de quitarla: «Deshacer» devuelve las tareas y el estado (que
      // sigue a las tareas: quitar la última pendiente completa el paso).
      const { id, tasks, status } = step;
      await replaceStepTasks(planId, step, removeTaskFromStep(step, taskId));
      toastWithUndo(t("step.taskRemoved"), () => restoreStepTasks(planId, id, tasks, status));
    } catch {
      toast.error(t("step.errors.removeTask"));
    }
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    const title = newTask.trim();
    if (!title) return;
    setNewTask("");
    try {
      await replaceStepTasks(planId, step, addTaskToStep(step, title));
    } catch {
      toast.error(t("step.errors.addTask"));
    }
  }

  return (
    <li
      id={stepElementId(step.id)}
      data-recommended={recommended || undefined}
      data-completed={completed || undefined}
      className={cn(
        "scroll-mt-24 flex overflow-hidden rounded-2xl border transition-colors motion-reduce:transition-none",
        completed
          ? "border-done bg-done text-on-done"
          : cn(
              "bg-surface text-ink-strong",
              open ? "border-line-strong" : "border-line hover:border-line-strong"
            ),
        recommended && !completed && "border-l-[4px] border-l-lilac hover:border-l-lilac"
      )}
    >
      {completed && (
        // Franja decorativa: el estado ya lo anuncia el control de estado
        // («Completado»), así que se oculta a los lectores de pantalla. Con
        // writing-mode vertical + rotate-180 se lee de abajo arriba y el 🎉
        // queda arriba, al final de la lectura. Emoji y texto forman un solo
        // grupo centrado en la altura de la tarjeta.
        <div
          aria-hidden="true"
          data-testid="completed-strip"
          className="flex w-9 shrink-0 select-none flex-col items-center justify-center gap-2 bg-done-strip py-2.5 text-on-done sm:w-10"
        >
          <span className="text-base leading-none">🎉</span>
          <span className="rotate-180 text-[0.7rem] font-bold uppercase leading-none tracking-[0.1em] [writing-mode:vertical-rl]">
            {t("step.completedStrip")}
          </span>
        </div>
      )}
      <div className={cn("min-w-0 flex-1", completed && "flex flex-col justify-center")}>
        <div className="flex items-center gap-1 py-1 pl-2 pr-2 sm:pl-3 sm:pr-3">
          <StepStatusControl
            planId={planId}
            stepId={step.id}
            title={stepTitle}
            status={step.status}
            onDone={completed}
          />
          <button
            type="button"
            id={stepTriggerId(step.id)}
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => onOpenChange(!open)}
            className={cn(
              "flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl py-2 pl-1 text-left",
              FOCUS,
              ring
            )}
          >
            <span className="min-w-0 flex-1">
              {(recommended || step.status === "in_progress" || step.status === "skipped") && (
                <span className="mb-1 flex flex-wrap items-center gap-1.5">
                  {recommended && (
                    <span className="rounded-full bg-lilac-soft px-2 py-0.5 text-xs font-medium text-ink">
                      {t("step.next")}
                    </span>
                  )}
                  {(step.status === "in_progress" || step.status === "skipped") && (
                    <span className={cn("text-xs font-medium", soft)}>
                      {t(STATUS_LABEL_KEY[step.status])}
                    </span>
                  )}
                </span>
              )}
              <span
                className={cn(
                  "block font-display text-base font-semibold leading-snug sm:text-lg",
                  completed ? "text-on-done" : muted ? "text-ink-muted" : "text-ink-strong",
                  step.status === "skipped" && "line-through decoration-ink-muted/50"
                )}
              >
                {stepTitle}
              </span>
              {stepDescription && (
                <span className={cn("mt-0.5 line-clamp-2 block text-sm sm:line-clamp-1", soft)}>
                  {stepDescription}
                </span>
              )}
            </span>
            {step.tasks.length > 0 && (
              <span className={cn("shrink-0 whitespace-nowrap text-sm", soft)}>
                {doneCount}/{step.tasks.length}
                <span className="hidden sm:inline"> {t("step.tasksWord")}</span>
                <span className="sr-only sm:hidden"> {t("step.tasksWord")}</span>
              </span>
            )}
            <ChevronDownIcon
              aria-hidden="true"
              className={cn(
                "size-5 shrink-0 transition-transform ease-(--ease-gentle) motion-reduce:transition-none",
                soft,
                open ? "rotate-180 duration-(--dur-open)" : "duration-(--dur-close)"
              )}
            />
          </button>
          {openTimeline && !open && (
            <button
              type="button"
              onClick={openTimeline}
              aria-label={t("step.openTimeline")}
              className={cn(
                "inline-flex size-10 shrink-0 items-center justify-center gap-1.5 rounded-full text-sm font-medium transition-colors motion-reduce:transition-none sm:w-auto sm:px-3",
                completed
                  ? "text-on-done hover:bg-on-done/15"
                  : "text-ink-muted hover:bg-lilac-soft hover:text-ink",
                FOCUS,
                ring
              )}
            >
              <ClockIcon aria-hidden="true" className="size-4" />
              <span aria-hidden="true" className="hidden sm:inline">
                {t("step.openShort")}
              </span>
            </button>
          )}
        </div>

        <Collapse
          id={bodyId}
          open={open}
          innerClassName="flex flex-col gap-5 px-4 pb-5 pt-1 sm:pl-[4.25rem] sm:pr-6"
        >
          {openTimeline && (
            <button
              type="button"
              onClick={openTimeline}
              className={cn(
                CTA_SECONDARY,
                "self-start",
                completed && "bg-on-done text-done",
                ring
              )}
            >
              <ClockIcon aria-hidden="true" className="size-4" />
              {t("step.openTimeline")}
            </button>
          )}
          <div className="flex flex-col gap-2">
            <span className={cn("text-sm font-medium", soft)}>{t("step.tasks")}</span>
            {step.tasks.length > 0 && (
              <ul className="flex flex-col">
                {step.tasks.map((task) => (
                  <li key={task.id} className="group flex items-center gap-3 py-1.5">
                    <Checkbox
                      checked={task.done}
                      onCheckedChange={() => handleToggleTask(task.id)}
                      aria-label={taskTitle(task)}
                      className={cn(
                        "size-5 rounded-md border-lilac bg-field shadow-none focus-visible:ring-lilac data-[state=checked]:border-lilac data-[state=checked]:bg-cta data-[state=checked]:text-on-cta",
                        completed &&
                          "border-on-done focus-visible:ring-on-done focus-visible:ring-offset-done data-[state=checked]:border-on-done data-[state=checked]:bg-on-done data-[state=checked]:text-done"
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-sm",
                          completed ? "text-on-done" : "text-ink-strong",
                          task.done && cn(soft, "line-through")
                        )}
                      >
                        {taskTitle(task)}
                      </span>
                      {taskMeta(task)}
                    </span>
                    {taskArrow(task)}
                    <button
                      type="button"
                      onClick={() => setDetailsId(task.id)}
                      aria-haspopup="dialog"
                      aria-label={t("task.detailsAria", { title: taskTitle(task) })}
                      title={t("task.details")}
                      className={cn(
                        "-my-1.5 inline-flex size-11 shrink-0 items-center justify-center gap-1.5 rounded-full text-sm font-medium transition-colors motion-reduce:transition-none sm:my-0 sm:h-8 sm:w-auto sm:px-3",
                        completed
                          ? "text-on-done-muted hover:bg-on-done/15 hover:text-on-done"
                          : "text-ink-muted hover:bg-lilac-soft hover:text-ink",
                        FOCUS,
                        ring
                      )}
                    >
                      <SlidersHorizontalIcon aria-hidden="true" className="size-4" />
                      <span aria-hidden="true" className="hidden sm:inline">
                        {t("task.details")}
                      </span>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("step.removeTask", { title: taskTitle(task) })}
                      className={cn(
                        "size-8 rounded-full focus-visible:ring-lilac",
                        completed
                          ? "text-on-done-muted hover:bg-on-done/15 hover:text-on-done focus-visible:ring-on-done"
                          : "text-ink-muted hover:bg-lilac-soft hover:text-ink"
                      )}
                      onClick={() => handleRemoveTask(task.id)}
                    >
                      <XIcon className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={handleAddTask} className="flex gap-2">
              <Input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder={t("step.addTaskPlaceholder")}
                aria-label={t("step.addTask")}
                className={cn(FIELD, "h-10")}
              />
              <Button
                type="submit"
                size="icon"
                aria-label={t("step.addTask")}
                className={cn(
                  "size-10 shrink-0 rounded-full shadow-none hover:opacity-90 focus-visible:ring-lilac focus-visible:ring-offset-surface",
                  completed
                    ? "bg-on-done text-done hover:bg-on-done focus-visible:ring-on-done focus-visible:ring-offset-done"
                    : "bg-cta text-on-cta hover:bg-cta"
                )}
              >
                <PlusIcon className="size-4" />
              </Button>
            </form>
            <StepIdeas
              planId={planId}
              step={step}
              className={cn(
                "-ml-2.5 self-start",
                completed
                  ? "text-on-done hover:bg-on-done/15 hover:text-on-done data-[state=open]:bg-on-done/15 data-[state=open]:text-on-done focus-visible:ring-on-done focus-visible:ring-offset-done"
                  : "focus-visible:ring-offset-surface"
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`step-notes-${step.id}`} className={cn("text-sm font-medium", soft)}>
              {t("step.notes")}
            </label>
            <Textarea
              id={`step-notes-${step.id}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder={t("step.notesPlaceholder")}
              rows={2}
              className={cn(FIELD, "h-auto min-h-16 py-2.5")}
            />
          </div>
        </Collapse>
      </div>
      {/* Detalles de la tarea: un solo diálogo por tarjeta (se pinta en un portal). */}
      <TaskDetailsDialog
        planId={planId}
        step={step}
        task={step.tasks.find((task) => task.id === detailsId) ?? null}
        title={detailsTask ? taskTitle(detailsTask) : ""}
        onClose={() => setDetailsId(null)}
      />
    </li>
  );
}
