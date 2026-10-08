import * as React from "react";

import { DestinationScene } from "@/components/honeymoon/motifs";
import type { SceneVariant } from "@/lib/honeymoon-model";
import { cn } from "@/lib/utils";

// Piezas comunes de la Luna de miel. Los colores siguen siendo tokens de rol (el tema
// tropical los redefine en globals.css); lo propio de aquí es la forma: esquinas más
// redondas, sombra suave y tarjetas ligeramente translúcidas para dejar ver el paisaje.

/** Tarjeta de la Luna de miel. */
export const HM_CARD =
  "rounded-3xl border border-line bg-surface text-ink-strong shadow-pop";

/** Enlace/botón de texto discreto dentro de una tarjeta. */
export const HM_TEXT_BUTTON =
  "inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink underline-offset-4 outline-none transition-colors hover:bg-lilac-soft focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

/** Cabecera de sección: título con icono, descripción y acciones a la derecha. */
export function SectionHeader({
  id,
  icon,
  title,
  description,
  actions,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className={cn(HM_CARD, "flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-4 sm:px-6")}>
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-lilac-mid text-ink-on-tint [&_svg]:size-5"
        >
          {icon}
        </span>
        <div className="min-w-0">
          <h2 id={id} className="font-display text-xl font-semibold text-ink sm:text-2xl">
            {title}
          </h2>
          <p className="text-sm text-ink-muted">{description}</p>
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Estado vacío amable: un dibujo, un título, una frase y una acción. */
export function EmptyState({
  scene,
  title,
  children,
  action,
}: {
  scene: SceneVariant;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const uid = React.useId().replace(/:/g, "");
  return (
    <div className={cn(HM_CARD, "flex flex-col items-center overflow-hidden px-6 pb-9 text-center")}>
      <div
        aria-hidden="true"
        className="mt-7 aspect-[4/3] w-full max-w-64 overflow-hidden rounded-2xl ring-1 ring-line sm:max-w-72"
      >
        <DestinationScene variant={scene} uid={uid} />
      </div>
      <h3 className="mt-6 font-display text-xl font-semibold text-ink">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-ink-muted">{children}</p>
      {action && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}

/** Mini estadística del banner. */
export function HeroStat({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-2 rounded-2xl bg-surface/90 p-3 ring-1 ring-line sm:flex-row sm:gap-3 sm:p-4">
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-lilac-mid text-ink-on-tint [&_svg]:size-4.5"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-medium text-ink-muted">{label}</dt>
        <dd className="break-words font-display text-lg font-semibold leading-tight text-ink">{value}</dd>
        <dd className="mt-0.5 text-xs text-ink-muted">{detail}</dd>
      </div>
    </div>
  );
}

/** Esqueleto de carga. */
export function HoneymoonSkeleton() {
  return (
    <div className="flex flex-col gap-5" role="status" aria-label="Cargando la luna de miel">
      <span className="block h-44 animate-pulse rounded-3xl bg-lilac-soft motion-reduce:animate-none" aria-hidden="true" />
      <span className="block h-14 animate-pulse rounded-2xl bg-lilac-soft motion-reduce:animate-none" aria-hidden="true" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className="block h-64 animate-pulse rounded-3xl bg-lilac-soft motion-reduce:animate-none" />
        ))}
      </div>
    </div>
  );
}
