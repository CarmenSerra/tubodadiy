import * as React from "react";
import { CheckIcon } from "lucide-react";

import {
  Dot,
  Envelope,
  Eucalyptus,
  Floret,
  Heart,
  Rings,
  WelcomeDisc,
  WelcomePebble,
  WelcomeWave,
} from "@/components/brand/welcome-decorations";
import { CTA_PRIMARY, FOCUS } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";

// Piezas visuales del flujo "Nuevo plan": calmado, una pregunta por pantalla,
// opciones grandes y marca lila/salvia sobre crema.

/** Campo de texto grande (más alto que los del resto de la app, pensado para móvil). */
export const WIZ_FIELD =
  "h-12 rounded-xl border-line-strong bg-field px-4 text-base text-ink-strong shadow-none placeholder:text-ink-placeholder focus-visible:border-lilac focus-visible:ring-lilac focus-visible:ring-offset-0";
export const WIZ_LABEL = "text-sm font-medium leading-none text-ink";
export const WIZ_HELP = "text-sm text-ink-muted";
export const WIZ_ERROR = "text-sm font-medium text-danger";
export const WIZ_CTA = cn(CTA_PRIMARY, "h-12 px-8 text-base disabled:pointer-events-none disabled:opacity-50");
/** Botón de texto (Atrás, Saltar): discreto, con fondo lila suave al pasar el ratón. */
export const WIZ_QUIET = cn(
  FOCUS,
  "inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none"
);

/**
 * Fondo decorativo fijo bajo la cabecera de la app (57 px): blobs suaves y,
 * en pantallas anchas, alianzas, sobre y eucalipto a los lados. Siempre
 * detrás del contenido y sin capturar clics.
 */
export function FlowDecorations() {
  return (
    <div
      aria-hidden="true"
      className="rings-on-page pointer-events-none fixed inset-x-0 bottom-0 top-[57px] z-0 overflow-hidden"
    >
      <WelcomePebble className="-left-12 -top-12 h-24 w-28 sm:-left-14 sm:-top-12 sm:h-36 sm:w-44" />
      <WelcomeDisc className="-right-10 -top-10 size-24 sm:-right-12 sm:-top-12 sm:size-32" />
      <WelcomeWave className="inset-x-0 bottom-0 h-8 w-full sm:h-16" />

      <Rings className="left-[4%] top-[38%] hidden w-[11%] min-w-20 -rotate-6 lg:block" />
      <Floret className="left-[14%] top-[16%] hidden size-12 rotate-12 lg:block" />
      <Floret className="left-[10%] bottom-[22%] hidden size-9 -rotate-12 lg:block" />
      <Heart className="left-[3%] top-[26%] hidden size-3.5 lg:block" />
      <Dot className="left-[19%] top-[58%] hidden size-2 lg:block" />

      <Envelope className="right-[4%] top-[34%] hidden w-[11%] min-w-20 rotate-6 lg:block" />
      <Eucalyptus className="bottom-[8%] right-[2%] hidden h-48 w-auto xl:block" />
      <Floret className="right-[16%] top-[14%] hidden size-10 -rotate-6 lg:block" />
      <Heart className="right-[18%] top-[60%] hidden size-3.5 lg:block" />
      <Dot className="right-[5%] top-[24%] hidden size-2 lg:block" />
    </div>
  );
}

/** Puntos de avance: el actual se alarga. Solo visual (el texto va en un sr-only aparte). */
export function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div aria-hidden="true" className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-2 rounded-full transition-all duration-300 motion-reduce:transition-none",
            i === current ? "w-6 bg-lilac" : i < current ? "w-2 bg-lilac-bright" : "w-2 bg-btn-soft"
          )}
        />
      ))}
    </div>
  );
}

interface OptionCardProps {
  type: "radio" | "checkbox";
  name: string;
  value: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** Más grande y con el icono arriba (las dos tarjetas de "cómo queréis empezar"). */
  size?: "default" | "large";
  className?: string;
  /** Contenido extra bajo la tarjeta, dentro de su marco (campos que aparecen al marcarla). */
  children?: React.ReactNode;
}

/**
 * Opción grande y tocable. Es un `<input type="radio|checkbox">` nativo
 * (oculto visualmente) dentro de su `<label>`: el teclado, el lector de
 * pantalla y las flechas de los radios funcionan sin código extra.
 */
export function OptionCard({
  type,
  name,
  value,
  checked,
  onChange,
  title,
  description,
  icon: Icon,
  size = "default",
  className,
  children,
}: OptionCardProps) {
  const large = size === "large";
  return (
    <div
      className={cn(
        "rounded-2xl border-2 transition-colors motion-reduce:transition-none",
        checked
          ? "border-lilac bg-lilac-soft"
          : "border-line bg-surface hover:border-line-strong hover:bg-raised",
        "has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-lilac has-[input:focus-visible]:ring-offset-2 has-[input:focus-visible]:ring-offset-page",
        className
      )}
    >
      <label className={cn("flex cursor-pointer items-center gap-3.5", large ? "p-5 sm:p-6" : "p-3.5 sm:p-4")}>
        <input
          type={type}
          name={name}
          value={value}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        {Icon && (
          <span
            aria-hidden="true"
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full bg-lilac-mid text-ink-on-tint",
              large ? "size-12 [&_svg]:size-6" : "size-10 [&_svg]:size-5"
            )}
          >
            <Icon />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className={cn("block font-display font-semibold text-ink", large ? "text-xl" : "text-base")}>
            {title}
          </span>
          {description && <span className="mt-0.5 block text-sm text-ink-muted">{description}</span>}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "flex size-6 shrink-0 items-center justify-center border-2",
            type === "radio" ? "rounded-full" : "rounded-md",
            checked ? "border-lilac bg-cta text-on-cta" : "border-lilac-bright bg-raised"
          )}
        >
          {checked && <CheckIcon className="size-3.5" strokeWidth={3} />}
        </span>
      </label>
      {children}
    </div>
  );
}
