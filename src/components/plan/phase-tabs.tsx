"use client";

import * as React from "react";
import { CheckIcon, LockIcon } from "lucide-react";

import { TabUnlock } from "@/components/plan/phase-celebration";
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
 * bloqueadas llevan un candado pero se pueden abrir igualmente. Las completas
 * se pintan en verde salvia (relleno, borde y check) en claro y en oscuro. El
 * panel lo pinta quien la usa, como hijo.
 */
export function PhaseTabs({
  tabs,
  value,
  onValueChange,
  unlockingId = null,
  children,
}: {
  tabs: PhaseTab[];
  value: string;
  onValueChange: (id: string) => void;
  /** Fase que se acaba de desbloquear: su candado se abre (celebración). */
  unlockingId?: string | null;
  children: React.ReactNode;
}) {
  const listRef = React.useRef<HTMLDivElement>(null);
  const markerRef = React.useRef<HTMLSpanElement>(null);
  const markerReady = React.useRef(false);

  // Marcador de la pestaña activa: un contorno que se desliza de una pestaña a otra
  // (el relleno de cada pestaña se funde por su cuenta). La primera vez se coloca sin animar.
  const activeComplete = tabs.find((t) => t.id === value)?.complete ?? false;
  React.useLayoutEffect(() => {
    const list = listRef.current;
    const marker = markerRef.current;
    const active = list?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (!list || !marker || !active) return;
    const place = () => {
      marker.style.width = `${active.offsetWidth}px`;
      marker.style.height = `${active.offsetHeight}px`;
      marker.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
    };
    if (!markerReady.current) {
      marker.style.transition = "none";
      place();
      void marker.offsetWidth; // aplica el estilo antes de reactivar la transición
      marker.style.transition = "";
      markerReady.current = true;
    } else {
      place();
    }
    marker.style.opacity = "1";
    const onResize = new ResizeObserver(() => {
      marker.style.transition = "none";
      place();
      void marker.offsetWidth;
      marker.style.transition = "";
    });
    onResize.observe(list);
    return () => onResize.disconnect();
  }, [value, tabs.length]);

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
          "relative h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl bg-lilac-soft p-1.5 ring-1 ring-lilac-edge",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        )}
      >
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            data-complete={tab.complete || undefined}
            data-unlocking={unlockingId === tab.id || undefined}
            className={cn(
              "relative min-h-14 min-w-[9.5rem] flex-none flex-col sm:flex-1 items-start justify-center gap-0.5 rounded-xl border border-transparent px-3.5 py-2 text-left",
              "transition-colors duration-[420ms] ease-(--ease-gentle) motion-reduce:transition-none",
              "motion-reduce:transition-none outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-0",
              "data-[unlocking=true]:[animation:pc-tab-pulse_1400ms_ease-out_1300ms_1_both]",
              tab.complete
                ? // Completa: salvia (borde y relleno) con tinta oscura en claro / clara en oscuro.
                  cn(
                    "border-sage-light bg-sage-pale text-ink-strong dark:border-green-solid",
                    "hover:border-green-solid hover:bg-sage-light dark:hover:bg-sage-pale",
                    // El contorno de la activa lo dibuja el marcador deslizante.
                    "data-[state=active]:border-transparent data-[state=active]:bg-sage-pale data-[state=active]:text-ink-strong data-[state=active]:shadow-none"
                  )
                : cn(
                    "text-ink hover:bg-track",
                    "data-[state=active]:border-transparent data-[state=active]:bg-raised data-[state=active]:text-ink-strong data-[state=active]:shadow-none"
                  )
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
              {unlockingId === tab.id && !tab.locked && <TabUnlock />}
            </span>
            <span
              className={cn(
                "flex items-center gap-1.5 text-xs font-normal",
                tab.complete ? "text-ink" : "text-ink-muted"
              )}
            >
              {tab.recommended && (
                <>
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-lilac" />
                  <span>Recomendado</span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              {tab.complete ? (
                <>
                  <span
                    aria-hidden="true"
                    className="flex size-4 items-center justify-center rounded-full bg-green-solid text-on-solid"
                  >
                    <CheckIcon className="size-3" strokeWidth={3} />
                  </span>
                  <span>Completada</span>
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
        <span
          ref={markerRef}
          aria-hidden="true"
          data-complete={activeComplete || undefined}
          className={cn(
            "phase-tab-marker pointer-events-none absolute top-0 left-0 rounded-xl border opacity-0",
            "border-line-strong data-[complete=true]:border-green-solid",
            "data-[complete=true]:ring-2 data-[complete=true]:ring-inset data-[complete=true]:ring-green-solid/70"
          )}
        />
      </TabsList>
      {children}
    </Tabs>
  );
}
