"use client";

import * as React from "react";
import { PlusIcon, TrashIcon } from "lucide-react";
import { toast } from "sonner";

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StepStatusBadge } from "@/components/plan/step-status-badge";
import {
  addTaskToStep,
  removeTaskFromStep,
  replaceStepTasks,
  toggleTaskInStep,
  updateStepNotes,
  updateStepStatus,
} from "@/lib/firebase/mutations";
import type { PlanStep, StepStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { value: StepStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "in_progress", label: "En progreso" },
  { value: "completed", label: "Completado" },
  { value: "skipped", label: "Omitido" },
];

// Campos de texto de marca: blancos, borde lila y foco #927AAC.
const FIELD =
  "h-10 rounded-xl border-[#D4C0EA] bg-white text-sm text-[#102D28] shadow-none placeholder:text-[#677775] focus-visible:ring-[#927AAC] focus-visible:ring-offset-0";

export function StepCard({ planId, step }: { planId: string; step: PlanStep }) {
  const [notes, setNotes] = React.useState(step.notes);
  const [newTask, setNewTask] = React.useState("");
  const doneCount = step.tasks.filter((t) => t.done).length;

  React.useEffect(() => {
    // Keep the editable textarea in sync with real-time updates from other
    // collaborators editing the same step concurrently.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotes(step.notes);
  }, [step.notes]);

  async function handleStatusChange(status: StepStatus) {
    try {
      await updateStepStatus(planId, step.id, status);
    } catch {
      toast.error("No se ha podido actualizar el estado.");
    }
  }

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
    <AccordionItem
      value={step.id}
      className={cn(
        // `last:border-b` revierte el `last:border-b-0` del AccordionItem base.
        "rounded-2xl border border-[#E5DDEC] bg-[#F8F5F1] px-5 text-[#102D28] shadow-none last:border-b sm:px-6",
        "transition-colors hover:border-[#D4C0EA] data-[state=open]:border-[#D4C0EA]"
      )}
    >
      <AccordionTrigger
        className={cn(
          "items-center rounded-xl py-5 hover:no-underline",
          "focus-visible:ring-[#927AAC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F8F5F1]",
          "[&>svg]:size-5 [&>svg]:translate-y-0 [&>svg]:text-[#586C64]"
        )}
      >
        <div className="flex flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-2 pr-2">
          <div className="min-w-0">
            <p className="font-display text-base font-semibold text-[#102D28] sm:text-lg">
              {step.title}
            </p>
            {step.description && (
              <p className="mt-0.5 text-sm font-normal text-[#586C64]">{step.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {step.tasks.length > 0 && (
              <span className="text-sm font-normal text-[#586C64]">
                {doneCount}/{step.tasks.length} tareas
              </span>
            )}
            <StepStatusBadge status={step.status} />
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-6">
        <div className="flex flex-col gap-5 border-t border-[#E5DDEC] pt-5">
          <div className="flex flex-col gap-1.5 sm:w-60">
            <span className="text-sm font-medium text-[#586C64]">Estado</span>
            <Select value={step.status} onValueChange={(v) => handleStatusChange(v as StepStatus)}>
              <SelectTrigger className="h-10 rounded-xl border-[#D4C0EA] bg-white text-[#102D28] shadow-none focus:ring-[#927AAC]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-[#E5DDEC] bg-[#F8F5F1] text-[#102D28] shadow-md">
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="rounded-lg focus:bg-[#ECE6F4] focus:text-[#26413C]"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2.5">
            <span className="text-sm font-medium text-[#586C64]">Tareas</span>
            {step.tasks.length === 0 && (
              <p className="text-sm text-[#586C64]">Sin tareas todavía.</p>
            )}
            <ul className="flex flex-col gap-1">
              {step.tasks.map((task) => (
                <li key={task.id} className="flex items-center gap-3">
                  <Checkbox
                    checked={task.done}
                    onCheckedChange={() => handleToggleTask(task.id)}
                    className="size-5 rounded-md border-[#D4C0EA] bg-white shadow-none focus-visible:ring-[#927AAC] data-[state=checked]:border-[#927AAC] data-[state=checked]:bg-[#927AAC] data-[state=checked]:text-white"
                  />
                  <span
                    className={cn(
                      "flex-1 text-sm text-[#102D28]",
                      task.done && "text-[#586C64] line-through"
                    )}
                  >
                    {task.title}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Eliminar tarea: ${task.title}`}
                    className="size-8 rounded-full text-[#586C64] hover:bg-[#ECE6F4] hover:text-[#26413C] focus-visible:ring-[#927AAC]"
                    onClick={() => handleRemoveTask(task.id)}
                  >
                    <TrashIcon className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
            <form onSubmit={handleAddTask} className="mt-1 flex gap-2">
              <Input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Añadir tarea"
                aria-label="Añadir tarea"
                className={FIELD}
              />
              <Button
                type="submit"
                size="icon"
                aria-label="Añadir tarea"
                className="size-10 shrink-0 rounded-full bg-[#927AAC] text-white shadow-none hover:bg-[#927AAC] hover:opacity-90 focus-visible:ring-[#927AAC] focus-visible:ring-offset-[#F8F5F1]"
              >
                <PlusIcon className="size-4" />
              </Button>
            </form>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[#586C64]">Notas</span>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Apunta aquí cualquier detalle sobre esta sección..."
              rows={3}
              className={cn(FIELD, "h-auto min-h-20 py-2.5")}
            />
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
