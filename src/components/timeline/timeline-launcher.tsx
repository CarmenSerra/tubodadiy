"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

import { TimelineDialog } from "@/components/timeline/timeline-dialog";

/** Parámetro de la URL que abre el cronograma: /plan/{id}?cronograma=1 */
export const TIMELINE_PARAM = "cronograma";

interface TimelineLauncher {
  open: () => void;
}

const TimelineLauncherContext = React.createContext<TimelineLauncher | null>(null);

/**
 * Dueño del diálogo del cronograma en el Resumen: lo abre el botón del paso
 * "Cronograma del día" o el enlace directo `?cronograma=1` (que se limpia de
 * la URL al abrirse, para que cerrar y recargar no lo vuelva a abrir).
 */
export function TimelineLauncherProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const [open, setOpen] = React.useState(false);
  const requested = searchParams.get(TIMELINE_PARAM) === "1";

  React.useEffect(() => {
    if (!requested) return;
    // Abrir por enlace: sincroniza el diálogo con la URL y consume el parámetro.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
    const url = new URL(window.location.href);
    url.searchParams.delete(TIMELINE_PARAM);
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`
    );
  }, [requested]);

  const launcher = React.useMemo<TimelineLauncher>(() => ({ open: () => setOpen(true) }), []);

  return (
    <TimelineLauncherContext.Provider value={launcher}>
      {children}
      <TimelineDialog open={open} onOpenChange={setOpen} />
    </TimelineLauncherContext.Provider>
  );
}

/** `null` fuera del Resumen: quien lo use debe tolerar que no haya cronograma. */
export function useTimelineLauncher() {
  return React.useContext(TimelineLauncherContext);
}
