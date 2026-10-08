import * as React from "react";

import { cn } from "@/lib/utils";

// Piezas de marca de los diálogos y controles de Proveedores. Los componentes
// de components/ui no se tocan: todo se aplica por className (cn = tailwind-merge).

/** Contenido de diálogo: crema, esquinas redondeadas, sin sombra. */
export const DIALOG_CONTENT =
  "w-[calc(100%-2rem)] max-w-lg gap-0 rounded-2xl border-line bg-surface p-5 text-ink-strong shadow-none sm:p-7";

/** Título serif de diálogo. */
export const DIALOG_TITLE =
  "font-display text-xl font-semibold leading-tight text-ink sm:text-2xl";

/** Etiqueta de campo. */
export const FIELD_LABEL = "text-sm font-medium leading-none text-ink";

/** Campo de texto: blanco, borde lila y foco #927AAC. */
export const FIELD =
  "h-11 rounded-xl border-line-strong bg-field text-base text-ink-strong shadow-none placeholder:text-ink-placeholder focus-visible:ring-lilac focus-visible:ring-offset-0 sm:text-sm";

/** Desplegable (Select) de marca. */
export const SELECT_TRIGGER =
  "h-11 rounded-xl border-line-strong bg-field text-base text-ink-strong shadow-none focus:ring-lilac sm:text-sm";
export const SELECT_CONTENT = "rounded-xl border-line bg-surface text-ink-strong shadow-md";
export const SELECT_ITEM = "rounded-lg focus:bg-lilac-soft focus:text-ink";

/** Foco de teclado sobre fondo blanco/crema dentro de una tarjeta. */
export const ROW_FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-white";

/** Texto de error de campo (sin rojo: el rojo es solo para confirmar borrados). */
export const FIELD_ERROR = "text-sm font-medium text-ink";

/** Botón redondo de icono sobre la foto (editar / eliminar). */
export const PHOTO_ICON_BUTTON = cn(
  "inline-flex size-9 items-center justify-center rounded-full bg-raised/95 text-ink transition-colors hover:bg-raised sm:size-8",
  "[&_svg]:size-4",
  ROW_FOCUS
);

/**
 * Disparador de edición. Reenvía las props que inyecta DialogTrigger (onClick,
 * ref, aria-*), sin las cuales el diálogo no se abriría.
 */
export const IconTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & { label: string }
>(function IconTrigger({ label, className, children, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(PHOTO_ICON_BUTTON, className)}
      {...props}
    >
      {children}
    </button>
  );
});
