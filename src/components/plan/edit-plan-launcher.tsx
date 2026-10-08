"use client";

import * as React from "react";

import { EditPlanDialog } from "@/components/plan/edit-plan-dialog";
import { usePlanContext } from "@/lib/context/plan-context";

interface EditPlanLauncher {
  open: () => void;
}

const EditPlanLauncherContext = React.createContext<EditPlanLauncher | null>(null);

/**
 * Dueño de un diálogo «Editar plan» que se abre desde fuera del botón
 * «Editar» del resumen: lo usan las flechas de las tareas «Elegir una fecha
 * objetivo» y «Definir el presupuesto total».
 */
export function EditPlanLauncherProvider({ children }: { children: React.ReactNode }) {
  const { plan } = usePlanContext();
  const [open, setOpen] = React.useState(false);
  const launcher = React.useMemo<EditPlanLauncher>(() => ({ open: () => setOpen(true) }), []);

  return (
    <EditPlanLauncherContext.Provider value={launcher}>
      {children}
      {plan && <EditPlanDialog plan={plan} open={open} onOpenChange={setOpen} />}
    </EditPlanLauncherContext.Provider>
  );
}

/** `null` fuera del Resumen: quien lo use debe tolerar que no haya diálogo. */
export function useEditPlanLauncher() {
  return React.useContext(EditPlanLauncherContext);
}
