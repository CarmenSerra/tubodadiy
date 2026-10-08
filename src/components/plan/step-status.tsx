"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FOCUS } from "@/components/dashboard/ui";
import { updateStepStatus } from "@/lib/firebase/mutations";
import type { StepStatus } from "@/lib/types";
import { toastWithUndo } from "@/lib/undo-toast";
import { cn } from "@/lib/utils";

/** Opciones del menú de estado, en el orden en que se muestran. */
export const STATUS_OPTIONS: { value: StepStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "in_progress", label: "En progreso" },
  { value: "completed", label: "Completado" },
  { value: "skipped", label: "Omitir" },
];

/** Texto del estado actual (para lectores de pantalla y la fila). */
export const STATUS_LABEL: Record<StepStatus, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  completed: "Completado",
  skipped: "Omitido",
};

/** Círculo de estado: vacío, medio lleno, con check u omitido (discontinuo). */
export function StatusGlyph({
  status,
  className,
  onDone = false,
}: {
  status: StepStatus;
  className?: string;
  /** Sobre la tarjeta violeta de «completado»: círculo claro con el check violeta. */
  onDone?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("size-6 shrink-0", className)}
      fill="none"
    >
      {status === "pending" && <circle cx="12" cy="12" r="9" strokeWidth="2" style={{ stroke: "var(--lilac)" }} />}
      {status === "in_progress" && (
        <>
          <circle cx="12" cy="12" r="9" strokeWidth="2" style={{ stroke: "var(--lilac)" }} />
          <path d="M12 6.5a5.5 5.5 0 0 1 0 11Z" style={{ fill: "var(--lilac)" }} />
        </>
      )}
      {status === "completed" && (
        <>
          <circle cx="12" cy="12" r="10" style={{ fill: onDone ? "var(--on-done)" : "var(--green-solid)" }} />
          <path
            d="m7.5 12.3 3 3 6-6.3"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ stroke: onDone ? "var(--done)" : "var(--on-solid)" }}
          />
        </>
      )}
      {status === "skipped" && (
        <>
          <circle cx="12" cy="12" r="9" strokeWidth="2" strokeDasharray="3.2 3" style={{ stroke: "var(--ink-muted)" }} />
          <path d="M8.5 12h7" strokeWidth="2" strokeLinecap="round" style={{ stroke: "var(--ink-muted)" }} />
        </>
      )}
    </svg>
  );
}

/**
 * Control de estado redondo de cada paso: un botón que abre un menú pequeño
 * (Pendiente / En progreso / Completado / Omitir). El cambio se guarda al
 * momento.
 */
export function StepStatusControl({
  planId,
  stepId,
  title,
  status,
  onDone = false,
}: {
  planId: string;
  stepId: string;
  title: string;
  status: StepStatus;
  /** El paso está en la tarjeta violeta de «completado». */
  onDone?: boolean;
}) {
  async function handleChange(next: string) {
    if (next === status) return;
    try {
      const previous = status;
      await updateStepStatus(planId, stepId, next as StepStatus);
      toastWithUndo(`Estado: ${STATUS_LABEL[next as StepStatus]}`, () =>
        updateStepStatus(planId, stepId, previous)
      );
    } catch {
      toast.error("No se ha podido actualizar el estado.");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Estado de «${title}»: ${STATUS_LABEL[status]}. Cambiar`}
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full transition-colors motion-reduce:transition-none sm:size-10",
          onDone
            ? "hover:bg-on-done/15 data-[state=open]:bg-on-done/15"
            : "hover:bg-lilac-soft data-[state=open]:bg-lilac-soft",
          FOCUS,
          onDone
            ? "focus-visible:ring-on-done focus-visible:ring-offset-done"
            : "focus-visible:ring-offset-surface"
        )}
      >
        <StatusGlyph status={status} onDone={onDone} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-44 rounded-xl border-line bg-surface p-1.5 text-ink-strong shadow-md"
      >
        <DropdownMenuRadioGroup value={status} onValueChange={handleChange}>
          {STATUS_OPTIONS.map((opt) => (
            <DropdownMenuRadioItem
              key={opt.value}
              value={opt.value}
              className="rounded-lg py-2.5 text-sm focus:bg-lilac-soft focus:text-ink sm:py-2"
            >
              {opt.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
