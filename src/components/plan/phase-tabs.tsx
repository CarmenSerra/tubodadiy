"use client";

import * as React from "react";
import { CheckIcon, LockIcon } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface PhaseTab {
  /** Id que viaja en la URL (?fase=…). */
  id: string;
  name: string;
  done: number;
  total: number;
  complete: boolean;
  /** La fase que recomendamos ahora. */
  recommended: boolean;
  /** Posterior a la recomendada y sin desbloquear (la pestaña sigue activa). */
  locked?: boolean;
}

/**
 * Selector de fases en forma de pestañas (role=tablist): nombre, avance
 * "2/3" o un check si está completa y la marca "Recomendado" en la fase
 * sugerida. Flechas ←/→ (y Inicio/Fin) mueven entre pestañas; las fases aún
 * bloqueadas llevan un candado pero se pueden abrir igualmente. El panel lo pinta quien la usa, como hijo.
 */
export function PhaseTabs({
  tabs,
  value,
  onValueChange,
  children,
}: {
  tabs: PhaseTab[];
  value: string;
  onValueChange: (id: string) => void;
  children: React.ReactNode;
}) {
  const listRef = React.useRef<HTMLDivElement>(null);

  // En móvil la lista se desplaza en horizontal: mantén a la vista la pestaña activa.
  React.useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (!list || !active) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2;
    list.scrollTo({ left: Math.max(0, target), behavior: reduce ? "auto" : "smooth" });
  }, [value]);

  return (
    <Tabs value={value} onValueChange={onValueChange} className="gap-4">
      <TabsList
        ref={listRef}
        aria-label="Fases del plan"
        className={cn(
          "h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl bg-lilac-soft p-1.5 ring-1 ring-lilac-edge",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        )}
      >
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className={cn(
              "relative min-h-14 min-w-[9.5rem] flex-none flex-col sm:flex-1 items-start justify-center gap-0.5 rounded-xl border border-transparent px-3.5 py-2 text-left",
              "text-ink hover:bg-track motion-reduce:transition-none",
              "data-[state=active]:border-line-strong data-[state=active]:bg-raised data-[state=active]:text-ink-strong data-[state=active]:shadow-none",
              "outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-0"
            )}
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold sm:text-[0.95rem]">
              {tab.name}
              {tab.locked && (
                <>
                  <LockIcon className="size-3.5 text-ink-muted" aria-hidden="true" />
                  <span className="sr-only">(bloqueada)</span>
                </>
              )}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-normal text-ink-muted">
              {tab.recommended && (
                <>
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-lilac" />
                  <span>Recomendado</span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              {tab.complete ? (
                <>
                  <CheckIcon className="size-3.5 text-green" aria-hidden="true" />
                  <span className="sr-only">Completada</span>
                </>
              ) : (
                <>
                  <span aria-hidden="true">
                    {tab.done}/{tab.total}
                  </span>
                  <span className="sr-only">
                    {tab.done} de {tab.total} {tab.total === 1 ? "paso" : "pasos"}
                  </span>
                </>
              )}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  );
}
