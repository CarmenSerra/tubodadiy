"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Progreso del plan como barra que se llena (con el % al lado). Es un
 * role="progressbar" con aria-valuenow. La barra arranca vacía y crece hasta su
 * valor al aparecer y cada vez que cambia; con prefers-reduced-motion salta
 * directa (sin transición). Completa, el relleno pasa de lila a salvia.
 */
export function PlanProgressBar({
  value,
  label = "Progreso del plan",
  className,
}: {
  /** 0-100. */
  value: number;
  label?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  // El ancho pintado va un fotograma por detrás del valor para que la
  // transición CSS tenga de dónde partir (0 la primera vez).
  const [shown, setShown] = React.useState(0);
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(clamped));
    return () => cancelAnimationFrame(frame);
  }, [clamped]);

  const complete = clamped >= 100;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        aria-hidden="true"
        className="min-w-[2.75rem] font-display text-base font-semibold tabular-nums leading-snug text-ink"
      >
        {clamped}%
      </span>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-valuetext={`${clamped} %`}
        data-testid="plan-progress"
        className="relative h-2.5 min-w-16 flex-1 overflow-hidden rounded-full bg-track ring-1 ring-inset ring-line"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width,background-color] duration-[900ms] ease-out motion-reduce:transition-none",
            complete ? "bg-sage" : "bg-lilac"
          )}
          style={{ width: `${shown}%` }}
        />
      </div>
    </div>
  );
}
