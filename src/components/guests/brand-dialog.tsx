"use client";

import * as React from "react";
import { PencilIcon, Trash2Icon } from "lucide-react";

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
 * Botón de eliminar de una fila. No pide confirmación: quien lo usa avisa con
 * «Deshacer» (toastWithUndo) para recuperar lo borrado.
 */
export function DeleteIconButton({
  ariaLabel,
  onDelete,
}: {
  ariaLabel: string;
  onDelete: () => void | Promise<void>;
}) {
  return (
    <button type="button" aria-label={ariaLabel} title={ariaLabel} className={ICON_BUTTON} onClick={() => void onDelete()}>
      <Trash2Icon aria-hidden="true" />
    </button>
  );
}
