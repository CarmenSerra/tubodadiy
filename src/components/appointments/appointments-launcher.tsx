"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

import {
  AppointmentsDialog,
  type AppointmentsIntent,
} from "@/components/appointments/appointments-dialog";
import {
  APPOINTMENTS_PARAM,
  APPOINTMENTS_TYPE_PARAM,
  isCategory,
} from "@/components/appointments/appointment-model";
import type { AppointmentCategory } from "@/lib/firebase/appointments";

export interface OpenAppointmentsOptions {
  /**
   * Tipo de cita. Con él, la agenda se abre con el formulario «Nueva cita» ya
   * listo para ese tipo (p. ej. "lugar" para «Visitar posibles lugares»).
   */
  category?: AppointmentCategory;
  /** Pon `false` para abrir solo la lista aunque haya `category`. */
  add?: boolean;
}

interface AppointmentsLauncher {
  open: (options?: OpenAppointmentsOptions) => void;
}

const AppointmentsLauncherContext = React.createContext<AppointmentsLauncher | null>(null);

/**
 * Dueño del diálogo de citas en el Resumen: lo abre cualquier botón con
 * `useAppointmentsLauncher().open(…)` o el enlace directo `?citas=1`
 * (opcionalmente `&tipo=lugar|vestuario|proveedor|degustacion|otro`, que abre
 * el formulario de una cita nueva de ese tipo). El parámetro se limpia de la URL
 * al abrirse, para que cerrar y recargar no lo vuelva a abrir.
 */
export function AppointmentsLauncherProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const [open, setOpen] = React.useState(false);
  const [intent, setIntent] = React.useState<AppointmentsIntent | null>(null);
  const requested = searchParams.get(APPOINTMENTS_PARAM) === "1";
  const requestedType = searchParams.get(APPOINTMENTS_TYPE_PARAM);

  React.useEffect(() => {
    if (!requested) return;
    // Abrir por enlace: sincroniza el diálogo con la URL y consume los parámetros.
    /* eslint-disable react-hooks/set-state-in-effect */
    setIntent(isCategory(requestedType) ? { category: requestedType } : null);
    setOpen(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    const url = new URL(window.location.href);
    url.searchParams.delete(APPOINTMENTS_PARAM);
    url.searchParams.delete(APPOINTMENTS_TYPE_PARAM);
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`
    );
  }, [requested, requestedType]);

  const launcher = React.useMemo<AppointmentsLauncher>(
    () => ({
      open: (options) => {
        setIntent(options?.category && options.add !== false ? { category: options.category } : null);
        setOpen(true);
      },
    }),
    []
  );

  return (
    <AppointmentsLauncherContext.Provider value={launcher}>
      {children}
      <AppointmentsDialog open={open} onOpenChange={setOpen} intent={intent} />
    </AppointmentsLauncherContext.Provider>
  );
}

/** `null` fuera del Resumen: quien lo use debe tolerar que no haya agenda. */
export function useAppointmentsLauncher() {
  return React.useContext(AppointmentsLauncherContext);
}
