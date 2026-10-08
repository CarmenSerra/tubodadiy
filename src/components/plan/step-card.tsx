"use client";

import * as React from "react";
import { ChevronDownIcon, ClockIcon, PlusIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CTA_SECONDARY, FOCUS } from "@/components/dashboard/ui";
import { StepIdeas } from "@/components/ideas/step-ideas";
import { STATUS_LABEL, StepStatusControl } from "@/components/plan/step-status";
import { useTimelineLauncher } from "@/components/timeline/timeline-launcher";
import {
  addTaskToStep,
  removeTaskFromStep,
  replaceStepTasks,
  toggleTaskInStep,
  updateStepNotes,
} from "@/lib/firebase/mutations";
import { TIMELINE_CATEGORY } from "@/lib/steps";
import type { PlanStep } from "@/lib/types";
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
  const [notes, setNotes] = React.useState(step.notes);
  const [newTask, setNewTask] = React.useState("");
  const doneCount = step.tasks.filter((t) => t.done).length;
  const bodyId = `step-body-${step.id}`;
  const muted = step.status === "completed" || step.status === "skipped";
  // El paso del cronograma tiene su propia herramienta (un diálogo).
  const timeline = useTimelineLauncher();
  const openTimeline = step.category === TIMELINE_CATEGORY ? timeline?.open : undefined;

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
      toast.error("No se han podido guardar las notas.");
    }
  }

  async function handleToggleTask(taskId: string) {
    try {
      await replaceStepTasks(planId, step.id, toggleTaskInStep(step, taskId));
    } catch {
      toast.error("No se ha podido actualizar la tarea.");
    }
  }

  async function handleRemoveTask(taskId: string) {
    try {
      await replaceStepTasks(planId, step.id, removeTaskFromStep(step, taskId));
    } catch {
      toast.error("No se ha podido eliminar la tarea.");
    }
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    const title = newTask.trim();
    if (!title) return;
    setNewTask("");
    try {
      await replaceStepTasks(planId, step.id, addTaskToStep(step, title));
    } catch {
      toast.error("No se ha podido añadir la tarea.");
    }
  }

  return (
    <li
      id={stepElementId(step.id)}
      data-recommended={recommended || undefined}
      className={cn(
        "scroll-mt-24 overflow-hidden rounded-2xl border bg-surface text-ink-strong transition-colors motion-reduce:transition-none",
        open ? "border-line-strong" : "border-line hover:border-line-strong",
        recommended && "border-l-[4px] border-l-lilac hover:border-l-lilac"
      )}
    >
      <div className="flex items-center gap-1 py-1 pl-2 pr-2 sm:pl-3 sm:pr-3">
        <StepStatusControl
          planId={planId}
          stepId={step.id}
          title={step.title}
          status={step.status}
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
            "focus-visible:ring-offset-surface"
          )}
        >
          <span className="min-w-0 flex-1">
            {(recommended || step.status === "in_progress" || step.status === "skipped") && (
              <span className="mb-1 flex flex-wrap items-center gap-1.5">
                {recommended && (
                  <span className="rounded-full bg-lilac-soft px-2 py-0.5 text-xs font-medium text-ink">
                    Siguiente
                  </span>
                )}
                {(step.status === "in_progress" || step.status === "skipped") && (
                  <span className="text-xs font-medium text-ink-muted">
                    {STATUS_LABEL[step.status]}
                  </span>
                )}
              </span>
            )}
            <span
              className={cn(
                "block font-display text-base font-semibold leading-snug sm:text-lg",
                muted ? "text-ink-muted" : "text-ink-strong",
                step.status === "skipped" && "line-through decoration-ink-muted/50"
              )}
            >
              {step.title}
            </span>
            {step.description && (
              <span className="mt-0.5 line-clamp-2 block text-sm text-ink-muted sm:line-clamp-1">
                {step.description}
              </span>
            )}
          </span>
          {step.tasks.length > 0 && (
            <span className="shrink-0 whitespace-nowrap text-sm text-ink-muted">
              {doneCount}/{step.tasks.length}
              <span className="hidden sm:inline"> tareas</span>
              <span className="sr-only sm:hidden"> tareas</span>
            </span>
          )}
          <ChevronDownIcon
            aria-hidden="true"
            className={cn(
              "size-5 shrink-0 text-ink-muted transition-transform motion-reduce:transition-none",
              open && "rotate-180"
            )}
          />
        </button>
        {openTimeline && !open && (
          <button
            type="button"
            onClick={openTimeline}
            aria-label="Abrir cronograma"
            className={cn(
              "inline-flex size-10 shrink-0 items-center justify-center gap-1.5 rounded-full text-sm font-medium text-ink-muted transition-colors hover:bg-lilac-soft hover:text-ink sm:w-auto sm:px-3",
              FOCUS,
              "focus-visible:ring-offset-surface"
            )}
          >
            <ClockIcon aria-hidden="true" className="size-4" />
            <span aria-hidden="true" className="hidden sm:inline">
              Abrir
            </span>
          </button>
        )}
      </div>

      <div id={bodyId} hidden={!open}>
        {open && (
          <div className="flex flex-col gap-5 px-4 pb-5 pt-1 sm:pl-[4.25rem] sm:pr-6">
            {openTimeline && (
              <button
                type="button"
                onClick={openTimeline}
                className={cn(CTA_SECONDARY, "self-start", "focus-visible:ring-offset-surface")}
              >
                <ClockIcon aria-hidden="true" className="size-4" />
                Abrir cronograma
              </button>
            )}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-ink-muted">Tareas</span>
              {step.tasks.length > 0 && (
                <ul className="flex flex-col">
                  {step.tasks.map((task) => (
                    <li key={task.id} className="group flex items-center gap-3 py-1.5">
                      <Checkbox
                        checked={task.done}
                        onCheckedChange={() => handleToggleTask(task.id)}
                        aria-label={task.title}
                        className="size-5 rounded-md border-lilac bg-field shadow-none focus-visible:ring-lilac data-[state=checked]:border-lilac data-[state=checked]:bg-cta data-[state=checked]:text-on-cta"
                      />
                      <span
                        className={cn(
                          "flex-1 text-sm text-ink-strong",
                          task.done && "text-ink-muted line-through"
                        )}
                      >
                        {task.title}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Eliminar tarea: ${task.title}`}
                        className="size-8 rounded-full text-ink-muted hover:bg-lilac-soft hover:text-ink focus-visible:ring-lilac"
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
                  placeholder="Añadir una tarea…"
                  aria-label="Añadir tarea"
                  className={cn(FIELD, "h-10")}
                />
                <Button
                  type="submit"
                  size="icon"
                  aria-label="Añadir tarea"
                  className="size-10 shrink-0 rounded-full bg-cta text-on-cta shadow-none hover:bg-cta hover:opacity-90 focus-visible:ring-lilac focus-visible:ring-offset-surface"
                >
                  <PlusIcon className="size-4" />
                </Button>
              </form>
              <StepIdeas
                planId={planId}
                step={step}
                className="-ml-2.5 self-start focus-visible:ring-offset-surface"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={`step-notes-${step.id}`} className="text-sm font-medium text-ink-muted">
                Notas
              </label>
              <Textarea
                id={`step-notes-${step.id}`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Apunta aquí lo que quieras recordar…"
                rows={2}
                className={cn(FIELD, "h-auto min-h-16 py-2.5")}
              />
            </div>
          </div>
        )}
      </div>
    </li>
  );
}
