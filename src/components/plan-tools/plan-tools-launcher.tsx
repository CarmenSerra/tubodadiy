"use client";

import * as React from "react";

import { CeremonyDialog } from "@/components/plan-tools/ceremony-dialog";
import { GiftDialog } from "@/components/plan-tools/gift-dialog";
import { LegalDocsDialog } from "@/components/plan-tools/legal-docs-dialog";
import type { PlanTool } from "@/components/plan/task-links";
import { usePlanContext } from "@/lib/context/plan-context";

interface OpenOptions {
  /** Herramienta a la que volver cuando esta termine (p. ej. elegir ceremonia desde los documentos). */
  then?: PlanTool;
}

interface PlanToolsLauncher {
  open: (tool: PlanTool, options?: OpenOptions) => void;
}

const PlanToolsLauncherContext = React.createContext<PlanToolsLauncher | null>(null);

/**
 * Dueño de los diálogos de las herramientas del plan (tipo de ceremonia,
 * documentos legales y regalo), que se abren desde la flecha de una tarea.
 * Solo hay uno abierto a la vez.
 */
export function PlanToolsProvider({ children }: { children: React.ReactNode }) {
  const { plan } = usePlanContext();
  const [current, setCurrent] = React.useState<{ tool: PlanTool; then?: PlanTool } | null>(null);

  const launcher = React.useMemo<PlanToolsLauncher>(
    () => ({ open: (tool, options) => setCurrent({ tool, then: options?.then }) }),
    []
  );

  const isOpen = (tool: PlanTool) => current?.tool === tool;
  const close = () => setCurrent(null);

  return (
    <PlanToolsLauncherContext.Provider value={launcher}>
      {children}
      {plan && (
        <>
          <CeremonyDialog
            open={isOpen("ceremony")}
            // Si se abrió desde los documentos legales, al cerrar (guardando o no) se vuelve a ellos.
            onOpenChange={(open) => {
              if (open) return;
              if (current?.then) setCurrent({ tool: current.then });
              else close();
            }}
          />
          <LegalDocsDialog
            open={isOpen("legal-docs")}
            onOpenChange={(open) => !open && close()}
            onChooseCeremony={() => setCurrent({ tool: "ceremony", then: "legal-docs" })}
          />
          <GiftDialog open={isOpen("gift")} onOpenChange={(open) => !open && close()} />
        </>
      )}
    </PlanToolsLauncherContext.Provider>
  );
}

/** `null` fuera del Resumen: quien lo use debe tolerar que no haya herramientas. */
export function usePlanToolsLauncher() {
  return React.useContext(PlanToolsLauncherContext);
}
