"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CTA_PRIMARY } from "@/components/dashboard/ui";
import { IDEA_CHIP, IdeasList, type IdeaItem } from "@/components/ideas/ideas-list";
import { IdeasPanel, type IdeasPanelContext } from "@/components/ideas/ideas-panel";
import { ideaKey, keySet, leadGroups, titlesInAllLanguages } from "@/components/ideas/ideas-text";
import { applyTaskTemplate } from "@/lib/firebase/task-templates";
import { addTaskToStep, replaceStepTasks } from "@/lib/firebase/mutations";
import { mapStep, stepsQuery } from "@/lib/firebase/plans";
import { useCollection } from "@/lib/hooks/use-collection";
import { STEP_TASK_IDEAS } from "@/lib/ideas";
import { displayStepTitle } from "@/lib/steps";
import { baseTasksCoveringIdea, indexPlanTasks } from "@/lib/task-dedupe";
import { TASK_TEMPLATES, planTemplate, templateCounts, type TaskTemplate } from "@/lib/task-templates";
import type { PlanStep, StepTask } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * «✨ Ideas» de un paso: tareas sugeridas según su categoría, que se añaden con un
 * clic, y plantillas de tareas por tipo de boda que se añaden de golpe a varias
 * secciones (sin duplicar lo que ya hay).
 */
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

  return (
    <IdeasPanel
      title={t("ideas.steps.title", { title: displayStepTitle(step.category, t, step.title) })}
      description={t("ideas.steps.description")}
      className={className}
    >
      {/* El contenido solo existe con el panel abierto: la lista de pasos se lee entonces. */}
      {(ctx) => <StepIdeasBody planId={planId} step={step} ctx={ctx} />}
    </IdeasPanel>
  );
}

function StepIdeasBody({
  planId,
  step,
  ctx,
}: {
  planId: string;
  step: PlanStep;
  ctx: IdeasPanelContext;
}) {
  const { t } = useTranslation("vendors");
  const ideas = STEP_TASK_IDEAS[step.category];
  const { data: allSteps } = useCollection(stepsQuery(planId), mapStep);

  // Dos clics seguidos antes de que Firestore devuelva la primera tarea no deben
  // pisarse: las tareas recién enviadas se recuerdan hasta que llegue la lista real.
  const pending = React.useRef<StepTask[] | null>(null);
  React.useEffect(() => {
    pending.current = null;
  }, [step.tasks]);

  const existing = React.useMemo(() => keySet(step.tasks.map((t) => t.title)), [step.tasks]);
  // Claves `auto` de todo el plan: una idea ya cubierta por una tarea base (en este paso u otro) cuenta como presente.
  const planAutos = React.useMemo(() => indexPlanTasks(allSteps).autos, [allSteps]);

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
          // La tarea puede estar guardada en cualquiera de los idiomas, o ya cubierta por una tarea base.
          present:
            titlesInAllLanguages(`${base}.title`).some((text) => existing.has(ideaKey(text))) ||
            baseTasksCoveringIdea(step.category, idea.id).some((auto) => planAutos.has(auto)),
          // Añadir una tarea a un paso completo (todas hechas) lo reabre; si no, el estado no cambia.
          onAdd: async () => {
            const current = { ...step, tasks: pending.current ?? step.tasks };
            const tasks = addTaskToStep(current, title);
            pending.current = tasks;
            await replaceStepTasks(planId, current, tasks);
          },
        };
      }),
    [ideas, existing, planAutos, planId, step, t]
  );

  return (
    <>
      <TemplatesSection planId={planId} steps={allSteps} />
      {ideas && ideas.length > 0 && (
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
    </>
  );
}

const TEMPLATE_CHIP_ON = "border-2 border-lilac bg-lilac-soft";

/** Plantillas de tareas por tipo de boda: elegir una, ver qué añadiría y añadirla de golpe. */
function TemplatesSection({ planId, steps }: { planId: string; steps: PlanStep[] }) {
  const { t } = useTranslation("plan");
  const [selected, setSelected] = React.useState<TaskTemplate | null>(null);
  const [busy, setBusy] = React.useState(false);

  const patches = React.useMemo(
    () => (selected ? planTemplate(selected, steps, t) : []),
    [selected, steps, t]
  );
  const counts = templateCounts(patches);

  if (steps.length === 0) return null;

  async function add() {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const added = await applyTaskTemplate(
        planId,
        selected,
        steps.map((s) => s.id),
        t
      );
      toast.success(t("templates.added", { count: added }), {
        description: t(`templates.${selected.id}.name`),
      });
      setSelected(null);
    } catch {
      toast.error(t("templates.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="task-templates-title" className="mb-4 border-b border-line pb-4">
      <h3 id="task-templates-title" className="font-display text-base font-semibold text-ink">
        {t("templates.title")}
      </h3>
      <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">{t("templates.description")}</p>
      <div role="group" aria-label={t("templates.title")} className="mt-3 flex flex-wrap gap-2">
        {TASK_TEMPLATES.map((template) => {
          const on = selected?.id === template.id;
          return (
            <button
              key={template.id}
              type="button"
              aria-pressed={on}
              onClick={() => setSelected(on ? null : template)}
              className={cn(IDEA_CHIP, "min-h-11 px-4 text-sm", on && TEMPLATE_CHIP_ON)}
            >
              {t(`templates.${template.id}.name`)}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-3 rounded-2xl bg-lilac-soft/50 p-3" aria-live="polite">
          <p className="text-[13px] leading-snug text-ink">{t(`templates.${selected.id}.description`)}</p>
          {counts.tasks > 0 ? (
            <>
              <p className="mt-2 text-sm font-medium text-ink-strong">
                {t("templates.summary", {
                  count: counts.tasks,
                  sections: t("templates.sections", { count: counts.sections }),
                })}
              </p>
              <ul className="mt-2 space-y-1 text-[13px] leading-snug text-ink-muted">
                {patches.flatMap((patch) => patch.added).map((task) => (
                  <li key={task.title} className="flex gap-2">
                    <span aria-hidden="true">·</span>
                    <span className="min-w-0 break-words">{task.title}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={add}
                aria-disabled={busy}
                className={cn(CTA_PRIMARY, "mt-3", busy && "opacity-70")}
              >
                {t("templates.add")}
              </button>
            </>
          ) : (
            <p className="mt-2 text-sm font-medium text-ink-strong">{t("templates.none")}</p>
          )}
        </div>
      )}
    </section>
  );
}
