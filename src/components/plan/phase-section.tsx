import { CheckIcon, ChevronDownIcon, LockIcon } from "lucide-react";

import { Accordion } from "@/components/ui/accordion";
import { FOCUS, LINK } from "@/components/dashboard/ui";
import { LockedPhase } from "@/components/plan/locked-phase";
import { StepCard } from "@/components/plan/step-card";
import type { PhaseState } from "@/lib/phases";
import type { PlanStep } from "@/lib/types";
import { cn } from "@/lib/utils";

export const phaseSectionId = (phaseId: string) => `phase-${phaseId}`;

function Pill({
  tone,
  children,
}: {
  tone: "lilac" | "sage" | "outline";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "lilac" && "bg-[#DECDF1] text-[#26413C]",
        tone === "sage" && "bg-[#D2D7CB] text-[#26413C]",
        tone === "outline" && "border border-[#D4C0EA] text-[#586C64]"
      )}
    >
      {children}
    </span>
  );
}

/** Lista de pasos de un grupo, con su propio acordeón sobre el estado compartido de la página. */
export function StepAccordion({
  planId,
  steps,
  openItems,
  onOpenItemsChange,
}: {
  planId: string;
  steps: PlanStep[];
  openItems: string[];
  onOpenItemsChange: (groupIds: string[], next: string[]) => void;
}) {
  if (steps.length === 0) return null;
  const ids = steps.map((s) => s.id);
  return (
    <Accordion
      type="multiple"
      value={openItems}
      onValueChange={(next) => onOpenItemsChange(ids, next)}
      className="flex flex-col gap-3"
    >
      {steps.map((step) => (
        <StepCard key={step.id} planId={planId} step={step} />
      ))}
    </Accordion>
  );
}

/**
 * Una fase del plan: encabezado (h2) y, según su estado, los pasos de
 * siempre, una vista previa difuminada (fase cerrada) o los pasos con una
 * nota amable (fase cerrada pero destapada a propósito).
 */
export function PhaseSection({
  planId,
  phase,
  previous,
  revealed,
  collapsed,
  openItems,
  onOpenItemsChange,
  onReveal,
  onHide,
  onToggleCollapsed,
}: {
  planId: string;
  phase: PhaseState;
  previous: PhaseState | null;
  revealed: boolean;
  collapsed: boolean;
  openItems: string[];
  onOpenItemsChange: (groupIds: string[], next: string[]) => void;
  onReveal: () => void;
  onHide: () => void;
  onToggleCollapsed: () => void;
}) {
  const headingId = `phase-heading-${phase.id}`;
  const bodyId = `phase-body-${phase.id}`;
  const locked = !phase.unlocked;
  const peeking = locked && revealed;
  const shownSteps = locked && !revealed ? phase.visibleSteps : phase.steps;
  const showPreview = locked && !revealed && phase.previewSteps.length > 0;
  const collapsible = phase.complete;

  return (
    <section
      id={phaseSectionId(phase.id)}
      aria-labelledby={headingId}
      className="flex scroll-mt-24 flex-col gap-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2
            id={headingId}
            className="font-display text-lg font-semibold text-[#26413C] sm:text-xl"
          >
            Fase {phase.index + 1} · {phase.name}
          </h2>
          <p className="mt-0.5 text-sm text-[#586C64]">{phase.blurb}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#586C64]">
            {phase.done} de {phase.total} {phase.total === 1 ? "paso" : "pasos"}
          </span>
          {phase.complete ? (
            <Pill tone="sage">
              <CheckIcon className="size-3" aria-hidden="true" />
              Completada
            </Pill>
          ) : phase.current ? (
            <Pill tone="lilac">Ahora</Pill>
          ) : locked ? (
            <Pill tone="outline">
              <LockIcon className="size-3" aria-hidden="true" />
              {peeking ? "Echando un vistazo" : "Cerrada por ahora"}
            </Pill>
          ) : null}
          {collapsible && (
            <button
              type="button"
              aria-expanded={!collapsed}
              aria-controls={bodyId}
              onClick={onToggleCollapsed}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-medium text-[#26413C] hover:bg-[#ECE6F4]",
                FOCUS
              )}
            >
              {collapsed ? "Ver pasos" : "Ocultar pasos"}
              <ChevronDownIcon
                className={cn("size-4 transition-transform motion-reduce:transition-none", !collapsed && "rotate-180")}
                aria-hidden="true"
              />
            </button>
          )}
        </div>
      </div>

      <div id={bodyId} hidden={collapsible && collapsed} className="flex flex-col gap-3">
        {peeking && !phase.complete && (
          <p className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl bg-[#ECE6F4] px-4 py-3 text-sm text-[#26413C]">
            <span>
              Te estás adelantando — no pasa nada. Trabaja aquí cuando te apetezca
              {previous ? `; se abrirá sola al terminar «${previous.name}».` : "."}
            </span>
            <button type="button" onClick={onHide} className={cn(LINK, FOCUS, "rounded text-sm")}>
              Volver a ocultar
            </button>
          </p>
        )}

        <StepAccordion
          planId={planId}
          steps={shownSteps}
          openItems={openItems}
          onOpenItemsChange={onOpenItemsChange}
        />

        {showPreview && (
          <LockedPhase
            previousName={previous?.name ?? "la fase anterior"}
            steps={phase.previewSteps}
            onReveal={onReveal}
          />
        )}
      </div>
    </section>
  );
}
