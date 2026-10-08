"use client";

import { toast } from "sonner";

/** Tiempo que el aviso con «Deshacer» sigue visible. */
const TOAST_MS = 9000;

/**
 * Aviso de «hecho» con botón «Deshacer». `undo` revierte el cambio y lanza si
 * no se pudo; el aviso lo gestiona: confirma «Deshecho: …» o avisa del error.
 * No depende del componente que lo lanzó, así que sigue funcionando aunque este
 * ya se haya desmontado (p. ej. la tarjeta de un proveedor borrado).
 */
export function toastWithUndo(message: string, undo: () => Promise<void>) {
  const toastId = toast.success(message, {
    duration: TOAST_MS,
    // Si hubiera un diálogo modal abierto, Radix desactiva los clics fuera de él (también en los
    // avisos); sin esto el botón «Deshacer» del aviso no respondería.
    style: { pointerEvents: "auto" },
    classNames: { actionButton: "!rounded-full !bg-cta !px-3 !font-medium !text-on-cta" },
    action: {
      label: "Deshacer",
      onClick: async () => {
        toast.dismiss(toastId);
        try {
          await undo();
          toast.success(`Deshecho: ${message.charAt(0).toLowerCase()}${message.slice(1)}`);
        } catch {
          toast.error("No se ha podido deshacer el cambio.");
        }
      },
    },
  });
  return toastId;
}
