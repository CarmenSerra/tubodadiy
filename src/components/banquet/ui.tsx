import * as React from "react";
import { useTranslation } from "react-i18next";

import { DietIcon, useDietLabel } from "@/components/diet-icons";
import type { DietId } from "@/lib/diets";
import { cn } from "@/lib/utils";

/** Tarjeta del Banquete. */
export const BQ_CARD = "rounded-2xl border border-line bg-surface text-ink-strong";

export const BQ_FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

/** Campo `<select>` nativo (táctil y de teclado) con la apariencia de los demás campos. */
export const BQ_NATIVE_SELECT = cn(
  "h-11 w-full min-w-0 rounded-xl border border-line-strong bg-field px-3 text-base text-ink-strong shadow-none sm:text-sm",
  BQ_FOCUS
);

/** Píldora de ficha alternable (alérgeno / dieta): seleccionado = borde morado 2px + fondo lavanda. */
export function togglePill(selected: boolean) {
  return cn(
    "inline-flex min-h-11 items-center gap-2 rounded-full border-2 px-3.5 text-sm font-medium text-ink transition-colors",
    BQ_FOCUS,
    selected ? "border-lilac bg-lilac-soft" : "border-line-strong bg-field hover:bg-lilac-soft"
  );
}

/** Dieta con su icono y, si se pide, un recuento («×3»). */
export function DietChip({ id, count, className }: { id: DietId; count?: number; className?: string }) {
  const label = useDietLabel()(id);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-lilac-soft px-2.5 py-1 text-xs font-medium text-ink ring-1 ring-lilac-edge",
        className
      )}
    >
      <DietIcon id={id} size={14} decorative />
      {label}
      {count !== undefined && <span className="tabular-nums text-ink-muted">×{count}</span>}
    </span>
  );
}

export function BanquetSkeleton() {
  const { t } = useTranslation("banquet");
  return (
    <div className="flex flex-col gap-5" role="status" aria-label={t("page.loading")}>
      <span className="block h-24 animate-pulse rounded-2xl bg-lilac-soft motion-reduce:animate-none" aria-hidden="true" />
      <span className="block h-12 animate-pulse rounded-2xl bg-lilac-soft motion-reduce:animate-none" aria-hidden="true" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className="block h-48 animate-pulse rounded-2xl bg-lilac-soft motion-reduce:animate-none" />
        ))}
      </div>
    </div>
  );
}
