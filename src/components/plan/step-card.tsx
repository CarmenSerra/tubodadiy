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
    <AccordionItem value={step.id} className="rounded-lg border px-4">
      <AccordionTrigger>
        <div className="flex flex-1 flex-wrap items-center justify-between gap-2 pr-2">
          <div>
            <p className="font-medium">{step.title}</p>
            {step.description && (
              <p className="text-xs font-normal text-muted-foreground">{step.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {step.tasks.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {doneCount}/{step.tasks.length} tareas
              </span>
            )}
            <StepStatusBadge status={step.status} />
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 sm:w-56">
            <span className="text-xs font-medium text-muted-foreground">Estado</span>
            <Select value={step.status} onValueChange={(v) => handleStatusChange(v as StepStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">Tareas</span>
            {step.tasks.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin tareas todavía.</p>
            )}
            <ul className="flex flex-col gap-2">
              {step.tasks.map((task) => (
                <li key={task.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={task.done}
                    onCheckedChange={() => handleToggleTask(task.id)}
                  />
                  <span className={cn("flex-1 text-sm", task.done && "text-muted-foreground line-through")}>
                    {task.title}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => handleRemoveTask(task.id)}
                  >
                    <TrashIcon className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
            <form onSubmit={handleAddTask} className="flex gap-2">
              <Input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Añadir tarea"
                className="h-8 text-sm"
              />
              <Button type="submit" variant="outline" size="icon" className="size-8 shrink-0">
                <PlusIcon className="size-4" />
              </Button>
            </form>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Notas</span>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Apunta aquí cualquier detalle sobre esta sección..."
              rows={3}
            />
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
