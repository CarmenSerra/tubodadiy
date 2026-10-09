"use client";

import * as React from "react";
import { CheckIcon, LockIcon, LockOpenIcon, XIcon } from "lucide-react";

import { TabsContent } from "@/components/ui/tabs";
import { CTA_SECONDARY, FOCUS } from "@/components/dashboard/ui";
import { PhaseLock } from "@/components/plan/phase-lock";
import { StepCard } from "@/components/plan/step-card";
import type { PlanStep } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Contenido de una pestaña: aviso suave (si te adelantas a una fase ya
 * desbloqueada), mensaje de "listo" (si la fase está completa), la frase de la
 * fase y sus pasos como filas. Si la fase está bloqueada, todo eso se ve
 * difuminado e inerte, con un candado encima que la desbloquea.
 */
export function PhasePanel({
  planId,
  tabId,
  name,
  blurb,
  steps,
  complete,
  nextPhaseName,
  onGoToNext,
  softNote,
  onDismissNote,
  locked = false,
  lockable = false,
  onUnlock,
  onLock,
  recommendedId,
  openIds,
  onOpenChange,
  animateIn = false,
}: {
  planId: string;
  tabId: string;
  name: string;
  blurb: string;
  steps: PlanStep[];
  complete: boolean;
  /** Fase recomendada tras ésta (si hay), para el mensaje de "listo". */
  nextPhaseName: string | null;
  onGoToNext: () => void;
  /** Nombre de la fase recomendada sin terminar, si estás viendo una posterior. */
  softNote: string | null;
  onDismissNote: () => void;
  /** Fase posterior a la recomendada y sin desbloquear. */
  locked?: boolean;
  /** Se puede bloquear/desbloquear a mano (botón al pie del panel). */
  lockable?: boolean;
  onUnlock?: () => void;
  onLock?: () => void;
  recommendedId: string | null;
  openIds: string[];
  onOpenChange: (stepId: string, open: boolean) => void;
  /** Entra deslizándose desde la derecha (al pasar a la fase siguiente tras completar una). */
  animateIn?: boolean;
}) {
  // Al desbloquear desaparece el candado que tenía el foco: llévalo al panel.
  const panelRef = React.useRef<HTMLDivElement>(null);
  const wasLocked = React.useRef(locked);
  React.useEffect(() => {
    // Solo si el foco se perdió (desapareció el candado); si lo tiene el botón
    // del pie, se queda ahí.
    const active = document.activeElement;
    if (wasLocked.current && !locked && (!active || active === document.body)) {
      panelRef.current?.focus({ preventScroll: true });
    }
    wasLocked.current = locked;
  }, [locked]);

  const body = (
    <>
      {softNote && !locked && (
        <div
          role="note"
          className="flex items-start gap-3 rounded-xl bg-lilac-soft ring-1 ring-lilac-edge py-2.5 pl-4 pr-2 text-sm text-ink"
        >
          <p className="flex-1 py-1">
            Te recomendamos terminar «{softNote}» primero, pero puedes avanzar aquí cuando quieras.
          </p>
          <button
            type="button"
            aria-label="Cerrar aviso"
            onClick={onDismissNote}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-raised/70",
              FOCUS,
              "focus-visible:ring-offset-lilac-soft"
            )}
          >
            <XIcon className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {complete && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-sage-pale px-4 py-3 text-ink"
        >
          <CheckIcon className="size-5 shrink-0" aria-hidden="true" />
          <p className="flex-1 font-display text-base font-semibold">¡{name}, listo!</p>
          {nextPhaseName && (
            <button
              type="button"
              onClick={onGoToNext}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium underline decoration-green decoration-2 underline-offset-4 hover:bg-raised/50",
                FOCUS,
                "focus-visible:ring-offset-sage-pale"
              )}
            >
              Seguir con «{nextPhaseName}»
            </button>
          )}
        </div>
      )}

      <p className="px-1 text-sm text-ink-muted">{blurb}</p>

      <ul className="flex flex-col gap-3">
        {steps.map((step) => (
          <StepCard
            key={step.id}
            planId={planId}
            step={step}
            recommended={step.id === recommendedId}
            open={openIds.includes(step.id)}
            onOpenChange={(open) => onOpenChange(step.id, open)}
          />
        ))}
      </ul>
    </>
  );

  return (
    <TabsContent
      ref={panelRef}
      value={tabId}
      className={cn(
        "flex flex-col gap-3 rounded-xl",
        FOCUS,
        animateIn &&
          "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-12 motion-safe:duration-700"
      )}
    >
      {locked ? (
        <div className="relative">
          {/* inert: ni foco ni clics ni lectores de pantalla dentro de lo difuminado. */}
          <div className="min-h-[22rem] overflow-hidden rounded-xl">
            <div
              inert
              aria-hidden="true"
              className="flex select-none flex-col gap-3 opacity-60 blur-[6px]"
            >
              {body}
            </div>
          </div>
          <PhaseLock phaseName={name} onUnlock={() => onUnlock?.()} />
        </div>
      ) : (
        <div className="flex flex-col gap-3">{body}</div>
      )}

      {/* Fuera de lo difuminado: siempre nítido y alcanzable con teclado. */}
      {lockable && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={() => (locked ? onUnlock?.() : onLock?.())}
            className={CTA_SECONDARY}
          >
            {locked ? (
              <LockOpenIcon className="size-4" aria-hidden="true" />
            ) : (
              <LockIcon className="size-4" aria-hidden="true" />
            )}
            {locked ? "Desbloquear fase" : "Bloquear fase"}
          </button>
        </div>
      )}
    </TabsContent>
  );
}
