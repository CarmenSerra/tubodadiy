import * as React from "react";

const DESKTOP_QUERY = "(min-width: 640px)";

/** ¿Pantalla de escritorio (sm y mayores)? En servidor se asume que sí. */
export function useIsDesktop(): boolean {
  return React.useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(DESKTOP_QUERY);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true
  );
}
