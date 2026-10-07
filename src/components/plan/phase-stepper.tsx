import { CheckIcon, LockIcon } from "lucide-react";

import { CARD, FOCUS } from "@/components/dashboard/ui";
import type { PhaseState } from "@/lib/phases";
import { cn } from "@/lib/utils";

/**
 * Indicador calmado de las fases. Cada fase es un botón que lleva a su
 * sección: guiar no es encerrar, se puede saltar a cualquier fase.
 */
export function PhaseStepper({
  phases,
  current,
  onJump,
}: {
  phases: PhaseState[];
  current: PhaseState | null;
  onJump: (phaseId: PhaseState["id"]) => void;
}) {
  const allDone = phases.length > 0 && !current;
  const doneSteps = phases.reduce((n, p) => n + p.done, 0);
  const totalSteps = phases.reduce((n, p) => n + p.total, 0);

  return (
    <section aria-label="Tus fases" className={cn(CARD, "p-5 sm:p-6")}>
      <ol className="grid grid-cols-4 gap-2 sm:gap-4">
        {phases.map((phase) => {
          const isCurrent = phase.current;
          const state = phase.complete ? "completada" : phase.unlocked ? "abierta" : "cerrada por ahora";
          return (
            <li key={phase.id} aria-current={isCurrent ? "step" : undefined} className="min-w-0">
              <button
                type="button"
                onClick={() => onJump(phase.id)}
                className={cn(
                  "group flex w-full flex-col items-start gap-2 rounded-xl text-left",
                  FOCUS
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-1.5 w-full rounded-full transition-colors",
                    phase.complete ? "bg-[#8FAF8A]" : isCurrent ? "bg-[#927AAC]" : "bg-[#D4C0EA]"
                  )}
                />
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      phase.complete && "bg-[#8FAF8A] text-[#102D28]",
                      isCurrent && "bg-[#927AAC] text-white",
                      !phase.complete && !isCurrent && "border border-[#D4C0EA] text-[#586C64]"
                    )}
                  >
                    {phase.complete ? (
                      <CheckIcon className="size-3.5" />
                    ) : phase.unlocked ? (
                      phase.index + 1
                    ) : (
                      <LockIcon className="size-3" />
                    )}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 text-xs leading-tight sm:text-sm",
                      isCurrent ? "font-semibold text-[#26413C]" : "font-medium text-[#586C64]"
                    )}
                  >
                    {phase.name}
                    <span className="sr-only">
                      , fase {phase.index + 1}, {state}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-sm text-[#586C64]">
        {current ? (
          <>
            <span className="font-medium text-[#26413C]">
              Fase {current.index + 1} de {phases.length}
            </span>{" "}
            · {current.done} de {current.total} {current.total === 1 ? "paso" : "pasos"}
          </>
        ) : allDone ? (
          <>
            <span className="font-medium text-[#26413C]">Todas las fases completadas</span> ·{" "}
            {doneSteps} de {totalSteps} pasos
          </>
        ) : null}
      </p>
    </section>
  );
}
