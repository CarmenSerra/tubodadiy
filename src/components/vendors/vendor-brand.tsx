import * as React from "react";

import { cn } from "@/lib/utils";

// Piezas de marca de los diálogos y controles de Proveedores. Los componentes
// de components/ui no se tocan: todo se aplica por className (cn = tailwind-merge).

/** Contenido de diálogo: crema, esquinas redondeadas, sin sombra. */
export const DIALOG_CONTENT =
  "w-[calc(100%-2rem)] max-w-lg gap-0 rounded-2xl border-[#E5DDEC] bg-[#F8F5F1] p-5 text-[#102D28] shadow-none sm:p-7";

/** Título serif de diálogo. */
export const DIALOG_TITLE =
  "font-display text-xl font-semibold leading-tight text-[#26413C] sm:text-2xl";

/** Etiqueta de campo. */
export const FIELD_LABEL = "text-sm font-medium leading-none text-[#26413C]";

/** Campo de texto: blanco, borde lila y foco #927AAC. */
export const FIELD =
  "h-11 rounded-xl border-[#D4C0EA] bg-white text-base text-[#102D28] shadow-none placeholder:text-[#677775] focus-visible:ring-[#927AAC] focus-visible:ring-offset-0 sm:text-sm";

/** Desplegable (Select) de marca. */
export const SELECT_TRIGGER =
  "h-11 rounded-xl border-[#D4C0EA] bg-white text-base text-[#102D28] shadow-none focus:ring-[#927AAC] sm:text-sm";
export const SELECT_CONTENT = "rounded-xl border-[#E5DDEC] bg-[#F8F5F1] text-[#102D28] shadow-md";
export const SELECT_ITEM = "rounded-lg focus:bg-[#ECE6F4] focus:text-[#26413C]";

/** Foco de teclado sobre fondo blanco/crema dentro de una tarjeta. */
export const ROW_FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-[#927AAC] focus-visible:ring-offset-2 focus-visible:ring-offset-white";

/** Texto de error de campo (sin rojo: el rojo es solo para confirmar borrados). */
export const FIELD_ERROR = "text-sm font-medium text-[#26413C]";

/** Botón redondo de icono sobre la foto (editar / eliminar). */
export const PHOTO_ICON_BUTTON = cn(
  "inline-flex size-9 items-center justify-center rounded-full bg-white/95 text-[#26413C] transition-colors hover:bg-white sm:size-8",
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
