"use client";

import * as React from "react";

import { IdeasList, type IdeaItem } from "@/components/ideas/ideas-list";
import { IdeasPanel } from "@/components/ideas/ideas-panel";
import { LEAD_GROUPS, ideaKey, keySet, leadGroup } from "@/components/ideas/ideas-text";
import { addTaskToStep, replaceStepTasks } from "@/lib/firebase/mutations";
import { STEP_TASK_IDEAS } from "@/lib/ideas";
import type { PlanStep, StepTask } from "@/lib/types";

/** «✨ Ideas» de un paso: tareas sugeridas según su categoría, que se añaden con un clic. */
export function StepIdeas({
  planId,
  step,
  className,
}: {
  planId: string;
  step: PlanStep;
  className?: string;
}) {
  const ideas = STEP_TASK_IDEAS[step.category];

  // Dos clics seguidos antes de que Firestore devuelva la primera tarea no deben
  // pisarse: las tareas recién enviadas se recuerdan hasta que llegue la lista real.
  const pending = React.useRef<StepTask[] | null>(null);
  React.useEffect(() => {
    pending.current = null;
  }, [step.tasks]);

  const existing = React.useMemo(() => keySet(step.tasks.map((t) => t.title)), [step.tasks]);

  const items = React.useMemo<IdeaItem[]>(
    () =>
      (ideas ?? []).map((idea) => ({
        key: ideaKey(idea.title),
        title: idea.title,
        hint: idea.hint,
        pills: idea.when ? [idea.when] : undefined,
        group: leadGroup(idea.when),
        present: existing.has(ideaKey(idea.title)),
        // El estado del paso (pendiente, en curso…) no se toca al añadir tareas.
        onAdd: async () => {
          const base = { ...step, tasks: pending.current ?? step.tasks };
          const tasks = addTaskToStep(base, idea.title);
          pending.current = tasks;
          await replaceStepTasks(planId, step.id, tasks);
        },
      })),
    [ideas, existing, planId, step]
  );

  if (!ideas || ideas.length === 0) return null;

  return (
    <IdeasPanel
      title={`Ideas para ${step.title}`}
      description="Toca + para añadir una tarea a este paso. Tú decides."
      className={className}
    >
      {(ctx) => (
        <IdeasList
          items={items}
          ctx={ctx}
          addedMessage="Tarea añadida"
          errorMessage="No se ha podido añadir la tarea."
          emptyText="Ya tienes todas estas tareas. ¡Qué organizados!"
          groups={LEAD_GROUPS}
          groupsLabel="Filtrar tareas por plazo"
        />
      )}
    </IdeasPanel>
  );
}
