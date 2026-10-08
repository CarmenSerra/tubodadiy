"use client";

import * as React from "react";
import { toast } from "sonner";

/** Cuántos cambios se pueden deshacer, como máximo, durante una sesión del diálogo. */
const MAX_STACK = 30;
/** Tiempo que el aviso con «Deshacer» sigue visible. */
const TOAST_MS = 9000;

export interface UndoEntry {
  /** Qué se hizo, en pasado y con la hora si aplica: «Momento eliminado». */
  message: string;
  /** Revierte el cambio en Firestore. Lanza si no se pudo. */
  undo: () => Promise<void>;
}

interface StackEntry extends UndoEntry {
  toastId: string;
}

export interface TimelineUndo {
  /** Cambios que se pueden deshacer (el último es el siguiente en deshacerse). */
  count: number;
  /** Texto del cambio que se deshará ahora, o null. */
  lastMessage: string | null;
  /** Deshace el cambio más reciente. */
  undoLast: () => Promise<void>;
  /** Apunta un cambio ya hecho y avisa con un aviso con botón «Deshacer». */
  push: (entry: UndoEntry) => void;
  /** Vacía la pila (al cerrar el diálogo). */
  clear: () => void;
}

/**
 * Pila de deshacer del cronograma durante una sesión del diálogo. Cada cambio
 * (borrar, editar, crear, ±15 min, plantilla) se apunta con su función inversa;
 * solo el aviso del último cambio está activo, así el botón del aviso y el de la
 * cabecera siempre deshacen lo mismo y en orden.
 */
export function useTimelineUndo(): TimelineUndo {
  const stackRef = React.useRef<StackEntry[]>([]);
  const busyRef = React.useRef(false);
  const counterRef = React.useRef(0);
  const [stack, setStack] = React.useState<StackEntry[]>([]);

  const commit = React.useCallback((next: StackEntry[]) => {
    stackRef.current = next;
    setStack(next);
  }, []);

  const undoLast = React.useCallback(async () => {
    const entry = stackRef.current[stackRef.current.length - 1];
    if (!entry || busyRef.current) return;
    busyRef.current = true;
    toast.dismiss(entry.toastId);
    try {
      await entry.undo();
      // Solo se quita de la pila si salió bien: si falla, se puede reintentar.
      commit(stackRef.current.filter((e) => e !== entry));
      toast.success(`Deshecho: ${entry.message.charAt(0).toLowerCase()}${entry.message.slice(1)}`);
    } catch {
      toast.error("No se ha podido deshacer el cambio.");
    } finally {
      busyRef.current = false;
    }
  }, [commit]);

  const push = React.useCallback(
    (entry: UndoEntry) => {
      const previous = stackRef.current[stackRef.current.length - 1];
      if (previous) toast.dismiss(previous.toastId);
      counterRef.current += 1;
      const toastId = `timeline-undo-${counterRef.current}`;
      commit([...stackRef.current, { ...entry, toastId }].slice(-MAX_STACK));
      toast.success(entry.message, {
        id: toastId,
        duration: TOAST_MS,
        // Con el diálogo modal abierto, Radix desactiva los clics fuera de él (también en los
        // avisos); sin esto el botón «Deshacer» del aviso no respondería.
        style: { pointerEvents: "auto" },
        classNames: { actionButton: "!rounded-full !bg-cta !px-3 !font-medium !text-on-cta" },
        action: { label: "Deshacer", onClick: () => void undoLast() },
      });
    },
    [commit, undoLast]
  );

  const clear = React.useCallback(() => {
    for (const entry of stackRef.current) toast.dismiss(entry.toastId);
    commit([]);
  }, [commit]);

  const last = stack[stack.length - 1];
  return {
    count: stack.length,
    lastMessage: last?.message ?? null,
    undoLast,
    push,
    clear,
  };
}

/**
 * Para el `onInteractOutside` de los diálogos del cronograma: pulsar «Deshacer» en
 * un aviso (que vive fuera del diálogo) no debe cerrarlo.
 */
export function ignoreToastInteraction(event: Event) {
  const target = event.target;
  if (target instanceof Element && target.closest("[data-sonner-toast]")) event.preventDefault();
}
