import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { computePhases, phaseOf, recommendedStep, type PhaseState } from "@/lib/phases";
import type { PlanStep, WeddingPlan } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { FeaturedPlanData } from "./helpers";
import { CARD, CTA_PRIMARY, CTA_SECONDARY, LINK, Skeleton } from "./ui";

/** Una sola línea con la siguiente tarea del paso (o su descripción). */
function stepLine(step: PlanStep): string {
  const pending = step.tasks.filter((t) => !t.done);
  if (step.tasks.length === 0) return step.description ?? "";
  if (pending.length === 0) return "Todas las tareas están hechas: ya puedes marcarla como completada.";
  const done = step.tasks.length - pending.length;
  return done > 0
    ? `Siguiente: ${pending[0].title} · ${done} de ${step.tasks.length} tareas hechas`
    : `Empieza por: ${pending[0].title}`;
}

/** Barra de fases: una pieza por fase, la actual a medio llenar. Decorativa. */
function PhaseLine({ phases, phase }: { phases: PhaseState[]; phase: PhaseState }) {
  return (
    <div className="mt-6 border-t border-line pt-5 sm:mt-8">
      <p className="text-sm text-ink-muted">
        <span className="font-medium text-ink">{phase.name}</span> · {phase.done} de {phase.total}{" "}
        {phase.total === 1 ? "paso" : "pasos"}
        <span className="sr-only">
          . Fase {phase.index + 1} de {phases.length}
        </span>
      </p>
      <div
        aria-hidden="true"
        className="mt-3 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${phases.length}, minmax(0, 1fr))` }}
      >
        {phases.map((p) => (
          <span key={p.id} className="h-1.5 overflow-hidden rounded-full bg-track">
            <span
              className={cn("block h-full rounded-full", p.complete ? "bg-sage" : "bg-lilac")}
              style={{
                width: p.complete ? "100%" : p.id === phase.id ? `${(p.done / Math.max(1, p.total)) * 100}%` : "0%",
              }}
            />
          </span>
        ))}
      </div>
    </div>
  );
}

function Label() {
  return (
    <h2 className="flex items-center gap-2 text-sm font-medium text-ink-muted">
      <span aria-hidden="true" className="size-2 rounded-full bg-lilac" />
      Ahora toca
    </h2>
  );
}

/** El único bloque protagonista de la home: qué hacer ahora y un botón. */
export function NowCard({ plan, data }: { plan: WeddingPlan; data: FeaturedPlanData }) {
  const planHref = `/plan/${plan.id}`;
  const waiting = data.loading && data.steps.length === 0;

  const wrap = (children: React.ReactNode) => (
    <section aria-labelledby="now-title" className={cn(CARD, "p-6 sm:p-8")}>
      {children}
    </section>
  );

  if (waiting) {
    return (
      <section className={cn(CARD, "p-6 sm:p-8")} role="status" aria-label="Cargando tu siguiente paso">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-5 h-8 w-2/3 max-w-sm" />
        <Skeleton className="mt-3 h-4 w-full max-w-md" />
        <Skeleton className="mt-6 h-11 w-36" />
      </section>
    );
  }

  const withLabel = (children: React.ReactNode) =>
    wrap(
      <>
        <div id="now-title">
          <Label />
        </div>
        {children}
      </>
    );

  if (data.error && data.steps.length === 0) {
    return withLabel(
      <p className="mt-4 text-ink">
        No hemos podido cargar tus pasos ahora mismo. Puedes verlos en{" "}
        <Link href={planHref} className={LINK}>
          el plan
        </Link>
        .
      </p>
    );
  }

  if (data.steps.length === 0) {
    return withLabel(
      <>
        <p className="mt-4 text-ink">Este plan todavía no tiene secciones.</p>
        <Link href={planHref} className={cn(CTA_PRIMARY, "mt-6")}>
          Abrir el plan
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </Link>
      </>
    );
  }

  const { phases } = computePhases(data.steps);
  const step = recommendedStep(data.steps);

  if (!step) {
    const anyOpen = data.steps.some((s) => s.status === "pending" || s.status === "in_progress");
    return withLabel(
      <>
        <p className="mt-4 font-display text-2xl font-semibold text-ink sm:text-3xl">
          {anyOpen ? "Lo principal está hecho" : "¡Todo listo!"}
        </p>
        <p className="mt-2 text-ink-muted">
          {anyOpen
            ? "Solo te queda tu lista libre de tareas generales, cuando quieras."
            : "Has completado todas las secciones del plan."}
        </p>
        <Link href={planHref} className={cn(CTA_SECONDARY, "mt-6")}>
          Ver el plan
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </Link>
      </>
    );
  }

  const started = step.status === "in_progress" || step.tasks.some((t) => t.done);
  const phaseId = phaseOf(step.category)?.id;
  const phase = phases.find((p) => p.id === phaseId) ?? null;
  const line = stepLine(step);

  return withLabel(
    <>
      <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
        <div className="min-w-0">
          <h3 className="font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            {step.title}
          </h3>
          {line && <p className="mt-2 text-ink-muted [overflow-wrap:anywhere]">{line}</p>}
        </div>
        <Link href={`${planHref}#step-${step.id}`} className={cn(CTA_PRIMARY, "w-full shrink-0 sm:w-auto")}>
          {started ? "Continuar" : "Empezar"}
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </Link>
      </div>
      {phase && <PhaseLine phases={phases} phase={phase} />}
    </>
  );
}
