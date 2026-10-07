"use client";

import * as React from "react";
import { PencilIcon, Trash2Icon } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CTA_SECONDARY } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";

// Piezas de marca compartidas por los diálogos de Invitados y Presupuesto.
// Los componentes de components/ui no se tocan: todo se aplica por className
// (cn = tailwind-merge, así que estas clases ganan a las de base).

/** Contenido de diálogo: crema, esquinas redondeadas, sin sombra. */
export const DIALOG_CONTENT =
  "w-[calc(100%-2rem)] max-w-lg gap-0 rounded-2xl border-[#E5DDEC] bg-[#F8F5F1] p-5 text-[#102D28] shadow-none sm:p-7";

/** Título serif de diálogo. */
export const DIALOG_TITLE = "font-display text-xl font-semibold leading-tight text-[#26413C] sm:text-2xl";

/** Etiqueta de campo. */
export const FIELD_LABEL = "text-sm font-medium leading-none text-[#26413C]";

/** Campo de texto: blanco, borde lila y foco #927AAC (igual que StepCard). */
export const FIELD =
  "h-11 rounded-xl border-[#D4C0EA] bg-white text-base text-[#102D28] shadow-none placeholder:text-[#677775] focus-visible:ring-[#927AAC] focus-visible:ring-offset-0 sm:text-sm";

/** Casilla de formulario / lista. */
export const CHECKBOX =
  "size-5 rounded-md border-[#927AAC] bg-white shadow-none focus-visible:ring-[#927AAC] focus-visible:ring-offset-0 data-[state=checked]:border-[#4E6A5A] data-[state=checked]:bg-[#4E6A5A] data-[state=checked]:text-white";

/** Desplegable (Select) de marca. */
export const SELECT_TRIGGER =
  "h-11 rounded-xl border-[#D4C0EA] bg-white text-base text-[#102D28] shadow-none focus:ring-[#927AAC] sm:text-sm";
export const SELECT_CONTENT = "rounded-xl border-[#E5DDEC] bg-[#F8F5F1] text-[#102D28] shadow-md";
export const SELECT_ITEM = "rounded-lg focus:bg-[#ECE6F4] focus:text-[#26413C]";

/** Foco de teclado de los controles de fila sobre fondo crema. */
export const ROW_FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-[#927AAC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F8F5F1]";

/** Botón de icono de fila (editar / eliminar): neutro, objetivo táctil de 40px. */
export const ICON_BUTTON = cn(
  "inline-flex size-10 items-center justify-center rounded-full text-[#586C64] transition-colors hover:bg-[#ECE6F4] hover:text-[#26413C] sm:size-9",
  "[&_svg]:size-4",
  ROW_FOCUS
);

/**
 * Disparador de edición. Reenvía las props que inyecta DialogTrigger (onClick,
 * ref, aria-*), sin las cuales el diálogo no se abriría.
 */
export function EditIconButton({
  label,
  className,
  ...props
}: React.ComponentProps<"button"> & { label: string }) {
  return (
    <button type="button" aria-label={label} title={label} className={cn(ICON_BUTTON, className)} {...props}>
      <PencilIcon aria-hidden="true" />
    </button>
  );
}

/**
 * Eliminar con confirmación. Sustituye a DeleteConfirmButton en estas pantallas
 * (ese componente no admite estilos). El rojo se reserva al botón de
 * confirmación, que es la única acción realmente destructiva.
 */
export function ConfirmDeleteButton({
  itemLabel,
  ariaLabel,
  onConfirm,
}: {
  /** Texto del título: «¿Eliminar {itemLabel}?» */
  itemLabel: string;
  ariaLabel: string;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button type="button" aria-label={ariaLabel} title={ariaLabel} className={ICON_BUTTON}>
          <Trash2Icon aria-hidden="true" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className={cn(DIALOG_CONTENT, "max-w-md gap-4 sm:p-7")}>
        <AlertDialogHeader>
          <AlertDialogTitle className={DIALOG_TITLE}>¿Eliminar {itemLabel}?</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-[#586C64]">
            Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-3">
          <AlertDialogCancel
            className={cn(
              CTA_SECONDARY,
              "border-transparent shadow-none hover:bg-[#D4C0EA] hover:text-[#38384D] hover:opacity-90"
            )}
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm()}
            className="inline-flex h-10 items-center justify-center rounded-full bg-[#9F3A38] px-5 text-sm font-medium text-white shadow-none transition-opacity hover:bg-[#9F3A38] hover:opacity-90 focus-visible:ring-[#9F3A38] focus-visible:ring-offset-[#F8F5F1]"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
