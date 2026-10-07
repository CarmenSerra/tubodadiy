"use client";

import * as React from "react";
import { CalendarHeartIcon, ListChecksIcon, PartyPopperIcon, WalletIcon, XIcon } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { CARD, FOCUS, IconCircle } from "@/components/dashboard/ui";
import { NextStepCard } from "@/components/plan/next-step-card";
import { PhaseSection, StepAccordion, phaseSectionId } from "@/components/plan/phase-section";
import { PhaseStepper } from "@/components/plan/phase-stepper";
import { StepCardSkeleton } from "@/components/plan/plan-shell";
import { stepElementId } from "@/components/plan/step-card";
import { useRevealedPhases } from "@/components/plan/use-revealed-phases";
import { EditPlanDialog } from "@/components/plan/edit-plan-dialog";
import { usePlanContext } from "@/lib/context/plan-context";
import { computePhases, type PhaseId } from "@/lib/phases";
import { useCollection } from "@/lib/hooks/use-collection";
import { stepsQuery, mapStep } from "@/lib/firebase/plans";
import { cn, formatCurrency, formatDate, daysUntil } from "@/lib/utils";

function Stat({
  icon,
  tone,
  label,
  children,
}: {
  icon: React.ReactNode;
  tone: "lilac" | "sage";
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3.5">
      <IconCircle tone={tone}>{icon}</IconCircle>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[#586C64]">{label}</p>
        {children}
      </div>
    </div>
  );
}

const VALUE = "font-display text-xl font-semibold leading-tight text-[#26413C]";

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

export default function PlanOverviewPage() {
  const { planId, plan } = usePlanContext();
  const { data: steps, loading } = useCollection(stepsQuery(planId), mapStep);

  const completed = steps.filter((s) => s.status === "completed").length;
  const skipped = steps.filter((s) => s.status === "skipped").length;
  const applicable = steps.length - skipped;
  const progress = applicable > 0 ? Math.round((completed / applicable) * 100) : 0;
  const days = plan ? daysUntil(plan.weddingDate) : null;

  const { phases, general, current } = computePhases(steps);
  const { revealed, setRevealed } = useRevealedPhases(planId);

  // Secciones abiertas (compartido entre todos los acordeones de la página).
  const [openItems, setOpenItems] = React.useState<string[]>([]);
  function handleOpenItemsChange(groupIds: string[], next: string[]) {
    setOpenItems((prev) => [...prev.filter((id) => !groupIds.includes(id)), ...next]);
  }

  // Fases completadas plegadas (solo las que ya llegan completas al cargar:
  // una fase que acabas de terminar sigue desplegada) y celebración al
  // completar una fase mientras estás aquí. Se ajusta durante el render, sin
  // efectos, comparando con las fases completas de la vez anterior.
  const completeKey = phases.filter((p) => p.complete).map((p) => p.id).join(",");
  const [seenKey, setSeenKey] = React.useState<string | null>(null);
  const [collapsed, setCollapsed] = React.useState<PhaseId[]>([]);
  const [celebrating, setCelebrating] = React.useState<PhaseId | null>(null);
  if (!loading && steps.length > 0 && seenKey !== completeKey) {
    const now = completeKey ? (completeKey.split(",") as PhaseId[]) : [];
    if (seenKey === null) {
      setCollapsed(now);
    } else {
      const before = seenKey ? seenKey.split(",") : [];
      const newly = now.filter((id) => !before.includes(id));
      if (newly.length > 0) setCelebrating(newly[newly.length - 1]);
    }
    setSeenKey(completeKey);
  }
  const celebratedPhase = phases.find((p) => p.id === celebrating && p.complete) ?? null;
  const celebratedNext = celebratedPhase ? (phases[celebratedPhase.index + 1] ?? null) : null;

  function jumpToPhase(id: PhaseId) {
    document
      .getElementById(phaseSectionId(id))
      ?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  }

  function openStep(stepId: string) {
    setOpenItems((prev) => (prev.includes(stepId) ? prev : [...prev, stepId]));
    // Espera a que el acordeón se pinte abierto y lleva allí la vista y el foco.
    requestAnimationFrame(() => {
      const el = document.getElementById(stepElementId(stepId));
      el?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
      el?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {plan && (
        <section aria-label="Resumen del plan" className={`${CARD} p-5 sm:p-6`}>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)_auto] lg:items-center lg:gap-8">
            <Stat icon={<CalendarHeartIcon />} tone="lilac" label="Fecha">
              <p className={VALUE}>{formatDate(plan.weddingDate)}</p>
              {days !== null && days >= 0 && (
                <p className="mt-1.5 inline-flex rounded-full bg-[#ECE6F4] px-2.5 py-0.5 text-xs font-medium text-[#26413C]">
                  Quedan {days} días
                </p>
              )}
            </Stat>
            <Stat icon={<WalletIcon />} tone="sage" label="Presupuesto">
              <p className={VALUE}>{formatCurrency(plan.budgetTotal)}</p>
            </Stat>
            <Stat
              icon={<ListChecksIcon />}
              tone="lilac"
              label={`Progreso · ${completed}/${applicable} secciones`}
            >
              <p className={VALUE}>{progress}%</p>
              <Progress
                value={progress}
                aria-label="Progreso de las secciones"
                className="mt-2 h-2 bg-[#ECE6F4] [&_[data-slot=progress-indicator]]:bg-[#927AAC]"
              />
            </Stat>
            <div className="sm:col-span-2 lg:col-span-1 lg:justify-self-end">
              <EditPlanDialog plan={plan} />
            </div>
          </div>
        </section>
      )}

      {loading ? (
        <div className="flex flex-col gap-3" role="status" aria-label="Cargando secciones">
          {[0, 1, 2, 3].map((i) => (
            <StepCardSkeleton key={i} />
          ))}
        </div>
      ) : phases.length === 0 && general.length === 0 ? (
        <p className={`${CARD} p-5 text-sm text-[#586C64] sm:p-6`}>
          Este plan todavía no tiene secciones.
        </p>
      ) : (
        <>
          {phases.length > 0 && (
            <>
              <PhaseStepper phases={phases} current={current} onJump={jumpToPhase} />

              {celebratedPhase && (
                <div
                  role="status"
                  className="flex items-start gap-4 rounded-2xl border border-[#8FAF8A] bg-[#D2D7CB] p-5 text-[#26413C] sm:items-center sm:p-6"
                >
                  <IconCircle tone="sage" className="bg-white">
                    <PartyPopperIcon />
                  </IconCircle>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-semibold">¡Fase completada!</p>
                    <p className="text-sm">
                      {celebratedNext
                        ? `Has terminado «${celebratedPhase.name}». Se abre «${celebratedNext.name}»: sigue a tu ritmo.`
                        : `Has terminado «${celebratedPhase.name}». ¡Ya tienes todo el plan completo!`}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Cerrar aviso"
                    onClick={() => setCelebrating(null)}
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-[#26413C] hover:bg-white/60",
                      FOCUS
                    )}
                  >
                    <XIcon className="size-4" aria-hidden="true" />
                  </button>
                </div>
              )}

              <NextStepCard phase={current} allPhasesDone={!current} onOpen={openStep} />
            </>
          )}

          {phases.map((phase) => (
            <PhaseSection
              key={phase.id}
              planId={planId}
              phase={phase}
              previous={phases[phase.index - 1] ?? null}
              revealed={revealed.has(phase.id)}
              collapsed={collapsed.includes(phase.id)}
              openItems={openItems}
              onOpenItemsChange={handleOpenItemsChange}
              onReveal={() => setRevealed(phase.id, true)}
              onHide={() => setRevealed(phase.id, false)}
              onToggleCollapsed={() =>
                setCollapsed((prev) =>
                  prev.includes(phase.id) ? prev.filter((id) => id !== phase.id) : [...prev, phase.id]
                )
              }
            />
          ))}

          {general.length > 0 && (
            <section aria-labelledby="always-heading" className="flex flex-col gap-3">
              <div>
                <h2
                  id="always-heading"
                  className="font-display text-lg font-semibold text-[#26413C] sm:text-xl"
                >
                  Siempre a mano
                </h2>
                <p className="mt-0.5 text-sm text-[#586C64]">
                  Tu lista libre para todo lo que no encaje en otro sitio. Disponible desde el primer día.
                </p>
              </div>
              <StepAccordion
                planId={planId}
                steps={general}
                openItems={openItems}
                onOpenItemsChange={handleOpenItemsChange}
              />
            </section>
          )}
        </>
      )}
    </div>
  );
}
