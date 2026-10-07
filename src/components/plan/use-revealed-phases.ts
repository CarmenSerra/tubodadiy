"use client";

import * as React from "react";

import type { PhaseId } from "@/lib/phases";

// Fases cerradas que la persona ha decidido "echar un vistazo", por plan.
// Solo es una comodidad de este navegador: sin localStorage (ventana privada,
// datos bloqueados…) sigue funcionando en memoria hasta recargar.

const KEY_PREFIX = "tubodadiy:revealed-phases:";
const listeners = new Set<() => void>();
const memory = new Map<string, string>();

function read(planId: string): string {
  try {
    const value = window.localStorage.getItem(KEY_PREFIX + planId);
    if (value !== null) return value;
  } catch {
    // localStorage no disponible: se usa la memoria.
  }
  return memory.get(planId) ?? "";
}

function write(planId: string, ids: PhaseId[]) {
  const value = ids.join(",");
  memory.set(planId, value);
  try {
    if (value) window.localStorage.setItem(KEY_PREFIX + planId, value);
    else window.localStorage.removeItem(KEY_PREFIX + planId);
  } catch {
    // Sin almacenamiento persistente: queda solo en memoria.
  }
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useRevealedPhases(planId: string) {
  const raw = React.useSyncExternalStore(
    subscribe,
    () => read(planId),
    () => ""
  );

  const revealed = React.useMemo(
    () => new Set<PhaseId>(raw ? (raw.split(",") as PhaseId[]) : []),
    [raw]
  );

  const setRevealed = React.useCallback(
    (id: PhaseId, value: boolean) => {
      const next = new Set<PhaseId>(read(planId) ? (read(planId).split(",") as PhaseId[]) : []);
      if (value) next.add(id);
      else next.delete(id);
      write(planId, [...next]);
    },
    [planId]
  );

  return { revealed, setRevealed };
}
