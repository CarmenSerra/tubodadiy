"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

import { SaveTheDateDialog } from "@/components/stationery/save-the-date-dialog";
import { STATIONERY_PARAM } from "@/components/stationery/save-the-date-model";

interface SaveTheDateLauncher {
  open: () => void;
}

const SaveTheDateLauncherContext = React.createContext<SaveTheDateLauncher | null>(null);

/**
 * Dueño del diseñador «Reserva la fecha» en el Resumen: lo abre cualquier botón
 * con `useSaveTheDateLauncher().open()` o el enlace directo `?reserva=1` (que se
 * limpia de la URL al abrirse, para que cerrar y recargar no lo vuelva a abrir).
 */
export function SaveTheDateLauncherProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const [open, setOpen] = React.useState(false);
  const requested = searchParams.get(STATIONERY_PARAM) === "1";

  React.useEffect(() => {
    if (!requested) return;
    // Abrir por enlace: sincroniza el diálogo con la URL y consume el parámetro.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
    const url = new URL(window.location.href);
    url.searchParams.delete(STATIONERY_PARAM);
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`
    );
  }, [requested]);

  const launcher = React.useMemo<SaveTheDateLauncher>(() => ({ open: () => setOpen(true) }), []);

  return (
    <SaveTheDateLauncherContext.Provider value={launcher}>
      {children}
      <SaveTheDateDialog open={open} onOpenChange={setOpen} />
    </SaveTheDateLauncherContext.Provider>
  );
}

/** `null` fuera del Resumen: quien lo use debe tolerar que no haya diseñador. */
export function useSaveTheDateLauncher() {
  return React.useContext(SaveTheDateLauncherContext);
}
