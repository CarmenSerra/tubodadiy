import * as React from "react";

import { CreatePlanDialog } from "@/components/plan/create-plan-dialog";
import { cn } from "@/lib/utils";

// Estilos de marca compartidos por la home (misma paleta que landing/login).

/** Tarjeta base: crema clara, borde lila suave, sin sombra. */
export const CARD = "rounded-2xl border border-[#E5DDEC] bg-[#F8F5F1] text-[#102D28] shadow-none";

/** Foco visible común a enlaces y botones de la home. */
export const FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-[#927AAC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F1EB]";

/** Hover de las piezas clicables (igual que la landing). */
export const LIFT =
  "transition-transform duration-300 ease-out hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none";

/** Píldora principal: lila con texto blanco. */
export const CTA_PRIMARY = cn(
  "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#927AAC] px-6 text-sm font-medium text-white transition-opacity hover:opacity-90",
  FOCUS
);

/** Píldora secundaria: lila claro con texto oscuro. */
export const CTA_SECONDARY = cn(
  "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#D4C0EA] px-5 text-sm font-medium text-[#38384D] transition-opacity hover:opacity-90",
  FOCUS
);

/** Enlace de texto: verde oscuro con subrayado lila (el lila solo no contrasta). */
export const LINK =
  "font-medium text-[#26413C] underline decoration-[#927AAC] decoration-2 underline-offset-4 hover:opacity-80";

/** Título de sección. */
export const SECTION_TITLE = "font-display text-xl font-semibold text-[#26413C] sm:text-2xl";

/**
 * Botón "Nuevo plan de boda" con la marca de la home. CreatePlanDialog usa el
 * <Button> por defecto como disparador y no admite estilos, así que se
 * reestiliza desde fuera con selectores sobre el único <button> del
 * wrapper (el contenido del diálogo va en un portal y no se ve afectado).
 */
export function NewPlanButton({
  variant = "primary",
  className,
}: {
  variant?: "primary" | "secondary";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex [&_button]:rounded-full [&_button]:shadow-none [&_button]:transition-opacity [&_button:hover]:opacity-90",
        variant === "primary"
          ? "[&_button]:h-11 [&_button]:bg-[#927AAC] [&_button]:px-6 [&_button]:text-white"
          : "[&_button]:h-10 [&_button]:bg-[#D4C0EA] [&_button]:px-5 [&_button]:text-[#38384D]",
        className
      )}
    >
      <CreatePlanDialog />
    </div>
  );
}

/** Bloque de carga: pulso suave que respeta prefers-reduced-motion. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("block animate-pulse rounded-full bg-[#E5DDEC] motion-reduce:animate-none", className)}
    />
  );
}

/** Círculo de icono (lila o salvia) con trazo #474755. */
export function IconCircle({
  tone,
  className,
  children,
}: {
  tone: "lilac" | "sage";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full text-[#474755] [&_svg]:size-5",
        tone === "lilac" ? "bg-[#DECDF1]" : "bg-[#D2D7CB]",
        className
      )}
    >
      {children}
    </span>
  );
}

/** Barra de avance decorativa (el valor siempre va también en texto). */
export function MiniBar({ value, tone = "lilac" }: { value: number; tone?: "lilac" | "sage" }) {
  return (
    <div aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-full bg-[#E5DDEC]">
      <div
        className={cn("h-full rounded-full", tone === "lilac" ? "bg-[#927AAC]" : "bg-[#8FAF8A]")}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
