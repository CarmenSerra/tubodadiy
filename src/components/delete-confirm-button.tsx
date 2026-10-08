"use client";

import * as React from "react";
import { TrashIcon } from "lucide-react";

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

interface DeleteConfirmButtonProps {
  itemLabel: string;
  onConfirm: () => void | Promise<void>;
}

export function DeleteConfirmButton({ itemLabel, onConfirm }: DeleteConfirmButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          aria-label={`Eliminar ${itemLabel}`}
          title={`Eliminar ${itemLabel}`}
          className="inline-flex size-10 items-center justify-center rounded-full text-ink-muted transition-colors outline-none hover:bg-lilac-soft hover:text-ink focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:size-9"
        >
          <TrashIcon aria-hidden="true" className="size-4" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md gap-4 p-5 sm:p-7">
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar {itemLabel}?</AlertDialogTitle>
          <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-3">
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          {/* Único elemento rojo: es la acción realmente destructiva. */}
          <AlertDialogAction
            onClick={() => onConfirm()}
            className="bg-danger-solid text-on-solid focus-visible:ring-danger"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
