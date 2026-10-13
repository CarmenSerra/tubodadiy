"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";

import { IdeasList, type IdeaItem } from "@/components/ideas/ideas-list";
import { IdeasPanel } from "@/components/ideas/ideas-panel";
import { ideaKey, keySet, leadGroups, titlesInAllLanguages } from "@/components/ideas/ideas-text";
import { addTaskToStep, replaceStepTasks } from "@/lib/firebase/mutations";
import { STEP_TASK_IDEAS } from "@/lib/ideas";
import { displayStepTitle } from "@/lib/steps";
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
  const { t } = useTranslation("vendors");
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
      (ideas ?? []).map((idea) => {
        const base = `ideas.steps.${step.category}.${idea.id}`;
        const title = t(`${base}.title`);
        const hint = t(`${base}.hint`, { defaultValue: "" });
        const when = t(`${base}.when`, { defaultValue: "" });
        return {
          key: idea.id,
          title,
          hint: hint || undefined,
          pills: when ? [when] : undefined,
          group: idea.lead,
          // La tarea puede estar guardada en cualquiera de los idiomas.
          present: titlesInAllLanguages(`${base}.title`).some((text) => existing.has(ideaKey(text))),
          // Añadir una tarea a un paso completo (todas hechas) lo reabre; si no, el estado no cambia.
          onAdd: async () => {
            const current = { ...step, tasks: pending.current ?? step.tasks };
            const tasks = addTaskToStep(current, title);
            pending.current = tasks;
            await replaceStepTasks(planId, current, tasks);
          },
        };
      }),
    [ideas, existing, planId, step, t]
  );

  if (!ideas || ideas.length === 0) return null;

  return (
    <IdeasPanel
      title={t("ideas.steps.title", { title: displayStepTitle(step.category, t, step.title) })}
      description={t("ideas.steps.description")}
      className={className}
    >
      {(ctx) => (
        <IdeasList
          items={items}
          ctx={ctx}
          addedMessage={t("ideas.steps.added")}
          errorMessage={t("ideas.steps.error")}
          emptyText={t("ideas.steps.empty")}
          groups={leadGroups(t)}
          groupsLabel={t("ideas.steps.filter")}
        />
      )}
    </IdeasPanel>
  );
}
