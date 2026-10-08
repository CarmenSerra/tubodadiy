"use client";

import * as React from "react";

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
import { DIALOG_CONTENT, DIALOG_TITLE } from "@/components/vendors/vendor-brand";
import { cn } from "@/lib/utils";

/**
 * Eliminar con confirmación. El rojo se reserva al botón de confirmación,
 * la única acción realmente destructiva.
 */
export function ConfirmDelete({
  itemLabel,
  trigger,
  onConfirm,
}: {
  /** Texto del título: «¿Eliminar {itemLabel}?» */
  itemLabel: string;
  trigger: React.ReactNode;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
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
