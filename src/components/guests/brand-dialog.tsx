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
  "w-[calc(100%-2rem)] max-w-lg gap-0 rounded-2xl border-line bg-surface p-5 text-ink-strong shadow-none sm:p-7";

/** Título serif de diálogo. */
export const DIALOG_TITLE = "font-display text-xl font-semibold leading-tight text-ink sm:text-2xl";

/** Etiqueta de campo. */
export const FIELD_LABEL = "text-sm font-medium leading-none text-ink";

/** Campo de texto: blanco, borde lila y foco #927AAC (igual que StepCard). */
export const FIELD =
  "h-11 rounded-xl border-line-strong bg-field text-base text-ink-strong shadow-none placeholder:text-ink-placeholder focus-visible:ring-lilac focus-visible:ring-offset-0 sm:text-sm";

/** Casilla de formulario / lista. */
export const CHECKBOX =
  "size-5 rounded-md border-lilac bg-field shadow-none focus-visible:ring-lilac focus-visible:ring-offset-0 data-[state=checked]:border-green data-[state=checked]:bg-green-solid data-[state=checked]:text-on-solid";

/** Desplegable (Select) de marca. */
export const SELECT_TRIGGER =
  "h-11 rounded-xl border-line-strong bg-field text-base text-ink-strong shadow-none focus:ring-lilac sm:text-sm";
export const SELECT_CONTENT = "rounded-xl border-line bg-surface text-ink-strong shadow-md";
export const SELECT_ITEM = "rounded-lg focus:bg-lilac-soft focus:text-ink";

/** Foco de teclado de los controles de fila sobre fondo crema. */
export const ROW_FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

/** Botón de icono de fila (editar / eliminar): neutro, objetivo táctil de 40px. */
export const ICON_BUTTON = cn(
  "inline-flex size-10 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-lilac-soft hover:text-ink sm:size-9",
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
          <AlertDialogDescription className="text-sm text-ink-muted">
            Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-3">
          <AlertDialogCancel
            className={cn(
              CTA_SECONDARY,
              "border-transparent shadow-none hover:bg-btn-soft hover:text-ink-on-lilac hover:opacity-90"
            )}
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm()}
            className="inline-flex h-10 items-center justify-center rounded-full bg-danger-solid px-5 text-sm font-medium text-on-solid shadow-none transition-opacity hover:bg-danger-solid hover:opacity-90 focus-visible:ring-danger focus-visible:ring-offset-surface"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
