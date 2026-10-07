import { ArrowRightIcon, HeartIcon, SparklesIcon } from "lucide-react";

import { CARD, CTA_PRIMARY, IconCircle } from "@/components/dashboard/ui";
import type { PhaseState } from "@/lib/phases";
import type { PlanStep } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Primer paso en marcha de la fase actual; si no hay, el primero pendiente. */
export function pickGuidedStep(phase: PhaseState | null): PlanStep | null {
  if (!phase) return null;
  return (
    phase.steps.find((s) => s.status === "in_progress") ??
    phase.steps.find((s) => s.status === "pending") ??
    null
  );
}

function nextTaskLine(step: PlanStep): string {
  const pending = step.tasks.find((t) => !t.done);
  if (pending) return `Siguiente tarea: ${pending.title}`;
  if (step.tasks.length > 0) return "Todas las tareas están hechas: ya puedes marcar la sección como completada.";
  return step.description || "Ábrela para añadir tus primeras tareas.";
}

/** Tarjeta destacada "Tu siguiente paso" (o un cierre amable si ya está todo). */
export function NextStepCard({
  phase,
  allPhasesDone,
  onOpen,
}: {
  phase: PhaseState | null;
  allPhasesDone: boolean;
  onOpen: (stepId: string) => void;
}) {
  const step = pickGuidedStep(phase);

  if (!step || !phase) {
    if (!allPhasesDone) return null;
    return (
      <section
        aria-labelledby="next-step-title"
        className={cn(CARD, "flex items-center gap-4 border-[#D4C0EA] bg-[#ECE6F4] p-5 sm:p-6")}
      >
        <IconCircle tone="sage" className="size-12">
          <HeartIcon />
        </IconCircle>
        <div>
          <h2 id="next-step-title" className="font-display text-lg font-semibold text-[#26413C]">
            Has completado todas las fases
          </h2>
          <p className="mt-0.5 text-sm text-[#586C64]">
            Qué gran trabajo. Si surge algo nuevo, tienes todo a mano en este plan.
          </p>
        </div>
      </section>
    );
  }

  const inProgress = step.status === "in_progress";

  return (
    <section
      aria-labelledby="next-step-title"
      className={cn(
        CARD,
        "flex flex-col gap-4 border-[#D4C0EA] bg-[#ECE6F4] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
      )}
    >
      <div className="flex min-w-0 items-start gap-4">
        <IconCircle tone="lilac" className="size-12 bg-white">
          <SparklesIcon />
        </IconCircle>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#586C64]">
            Tu siguiente paso · Fase {phase.index + 1}, {phase.name}
          </p>
          <h2
            id="next-step-title"
            className="mt-0.5 font-display text-xl font-semibold text-[#26413C] [overflow-wrap:anywhere]"
          >
            {step.title}
          </h2>
          <p className="mt-1 text-sm text-[#26413C] [overflow-wrap:anywhere]">{nextTaskLine(step)}</p>
        </div>
      </div>
      <button type="button" onClick={() => onOpen(step.id)} className={cn(CTA_PRIMARY, "shrink-0")}>
        {inProgress ? "Seguir con esta sección" : "Empezar esta sección"}
        <ArrowRightIcon className="size-4" aria-hidden="true" />
      </button>
    </section>
  );
}
