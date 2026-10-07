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
export function StatusGlyph({ status, className }: { status: StepStatus; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("size-6 shrink-0", className)}
      fill="none"
    >
      {status === "pending" && <circle cx="12" cy="12" r="9" stroke="#927AAC" strokeWidth="2" />}
      {status === "in_progress" && (
        <>
          <circle cx="12" cy="12" r="9" stroke="#927AAC" strokeWidth="2" />
          <path d="M12 6.5a5.5 5.5 0 0 1 0 11Z" fill="#927AAC" />
        </>
      )}
      {status === "completed" && (
        <>
          <circle cx="12" cy="12" r="10" fill="#4E6A5A" />
          <path
            d="m7.5 12.3 3 3 6-6.3"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {status === "skipped" && (
        <>
          <circle cx="12" cy="12" r="9" stroke="#586C64" strokeWidth="2" strokeDasharray="3.2 3" />
          <path d="M8.5 12h7" stroke="#586C64" strokeWidth="2" strokeLinecap="round" />
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
}: {
  planId: string;
  stepId: string;
  title: string;
  status: StepStatus;
}) {
  async function handleChange(next: string) {
    if (next === status) return;
    try {
      await updateStepStatus(planId, stepId, next as StepStatus);
    } catch {
      toast.error("No se ha podido actualizar el estado.");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Estado de «${title}»: ${STATUS_LABEL[status]}. Cambiar`}
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[#ECE6F4] sm:size-10",
          "data-[state=open]:bg-[#ECE6F4]",
          FOCUS,
          "focus-visible:ring-offset-[#F8F5F1]"
        )}
      >
        <StatusGlyph status={status} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-44 rounded-xl border-[#E5DDEC] bg-[#F8F5F1] p-1.5 text-[#102D28] shadow-md"
      >
        <DropdownMenuRadioGroup value={status} onValueChange={handleChange}>
          {STATUS_OPTIONS.map((opt) => (
            <DropdownMenuRadioItem
              key={opt.value}
              value={opt.value}
              className="rounded-lg py-2.5 text-sm focus:bg-[#ECE6F4] focus:text-[#26413C] sm:py-2"
            >
              {opt.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
