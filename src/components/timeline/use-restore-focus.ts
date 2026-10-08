import * as React from "react";

/**
 * Devuelve el foco a quien abrió un diálogo controlado (sin DialogTrigger).
 * Radix lo devuelve al trigger, que aquí no existe, y el foco se perdería.
 * Sus dos manejadores se pasan a <DialogContent> (onOpenAutoFocus / onCloseAutoFocus).
 */
export function useRestoreFocus() {
  const opener = React.useRef<HTMLElement | null>(null);

  const onOpenAutoFocus = React.useCallback(() => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, []);

  const onCloseAutoFocus = React.useCallback((event: Event) => {
    event.preventDefault();
    const el = opener.current;
    opener.current = null;
    if (el && el.isConnected && el !== document.body) el.focus();
  }, []);

  return { onOpenAutoFocus, onCloseAutoFocus };
}
