"use client";

import * as React from "react";

import { AppointmentsLauncherProvider } from "@/components/appointments/appointments-launcher";
import { SaveTheDateLauncherProvider } from "@/components/stationery/stationery-launcher";

/**
 * Citas (`?citas=1`) y «Reserva la fecha» (`?reserva=1`): un solo envoltorio
 * para montar las dos herramientas en el Resumen del plan.
 */
export function AgendaProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppointmentsLauncherProvider>
      <SaveTheDateLauncherProvider>{children}</SaveTheDateLauncherProvider>
    </AppointmentsLauncherProvider>
  );
}
