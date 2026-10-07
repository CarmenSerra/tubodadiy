"use client";

import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { ROW_FOCUS } from "@/components/vendors/vendor-brand";
import { cn } from "@/lib/utils";

export interface CarouselSlide {
  key: string;
  /** Nombre que se anuncia al activar la diapositiva. */
  name: string;
  /** `active` es true solo para la tarjeta central (la única interactiva). */
  render: (active: boolean) => React.ReactNode;
}

/** Ancho de la tarjeta central (también del hueco vacío y del esqueleto). */
export const SLIDE_WIDTH = "w-[78%] sm:w-[20rem] lg:w-[22.5rem]";

const SWIPE_THRESHOLD = 40;
const DRAG_SUPPRESS_CLICK = 8;
/** Más allá de ±HIDDEN_AT las tarjetas están ocultas. */
const HIDDEN_AT = 2;

/**
 * Desplazamiento circular de la diapositiva `index` respecto a la activa:
 * 0 = centro, ±1 = vecinas, ±2 o más = ocultas. Con 2 elementos la otra tarjeta
 * queda a la derecha si va detrás y a la izquierda si va delante.
 */
function offsetOf(index: number, active: number, count: number): number {
  if (count <= 1) return 0;
  if (count === 2) return index === active ? 0 : index > active ? 1 : -1;
  let d = (((index - active) % count) + count) % count;
  if (d > count / 2) d -= count;
  return d;
}

const STYLE = {
  center: { scale: 1, opacity: 1 },
  side: { scale: 0.85, opacity: 0.6 },
  hidden: { scale: 0.7, opacity: 0 },
} as const;

const ARROW = cn(
  "absolute top-full left-0 z-40 mt-3 inline-flex size-11 items-center justify-center rounded-full bg-[#927AAC] text-white transition-opacity hover:opacity-90",
  "md:top-1/2 md:mt-0 md:size-11 md:-translate-y-1/2",
  ROW_FOCUS
);

/**
 * Carrusel circular estilo coverflow: la tarjeta activa va en el centro a
 * tamaño completo y las vecinas asoman a los lados, más pequeñas y atenuadas.
 * Solo la tarjeta central es interactiva; pulsar una vecina la centra.
 */
export function VendorCarousel({ label, slides }: { label: string; slides: CarouselSlide[] }) {
  const count = slides.length;
  // Se guarda la clave (no el índice) para que reordenar por estado no cambie la tarjeta central.
  const [state, setState] = React.useState<{ active: string | null; prev: string | null }>({
    active: null,
    prev: null,
  });
  const [announcement, setAnnouncement] = React.useState("");
  const regionRef = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{ x: number; y: number; id: number } | null>(null);
  const dragged = React.useRef(false);

  const indexOfKey = (key: string | null) => {
    const i = key === null ? -1 : slides.findIndex((s) => s.key === key);
    return i === -1 ? 0 : i;
  };
  const active = indexOfKey(state.active);
  const prev = indexOfKey(state.prev);

  function goTo(index: number) {
    if (count === 0) return;
    const next = ((index % count) + count) % count;
    if (next === active) return;
    // Si el foco está dentro de la tarjeta que dejará de ser interactiva, vuelve al carrusel.
    const region = regionRef.current;
    const focused = document.activeElement;
    if (region && focused && focused !== region && region.contains(focused)) {
      const insideSlide = (focused as HTMLElement).closest("[data-slide]");
      if (insideSlide) region.focus();
    }
    setState({ active: slides[next].key, prev: slides[active].key });
    setAnnouncement(`${slides[next].name}, ${next + 1} de ${count}`);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    // Los diálogos van en un portal pero propagan eventos de React: solo cuenta el DOM propio.
    if (!event.currentTarget.contains(event.target as Node)) return;
    if (event.altKey || event.ctrlKey || event.metaKey || count < 2) return;
    if (event.key === "ArrowRight") goTo(active + 1);
    else if (event.key === "ArrowLeft") goTo(active - 1);
    else if (event.key === "Home") goTo(0);
    else if (event.key === "End") goTo(count - 1);
    else return;
    event.preventDefault();
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (count < 2 || !event.currentTarget.contains(event.target as Node)) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button, a, input, textarea, select")) return;
    drag.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    dragged.current = false;
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    if (Math.abs(event.clientX - start.x) > DRAG_SUPPRESS_CLICK) dragged.current = true;
  }

  function onPointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    drag.current = null;
    if (event.type === "pointercancel") return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      goTo(dx < 0 ? active + 1 : active - 1);
    }
  }

  // Tras arrastrar, el "click" que sigue al soltar no debe centrar la tarjeta que haya debajo.
  function onClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (dragged.current) {
      dragged.current = false;
      event.stopPropagation();
    }
  }

  const single = count < 2;

  return (
    <div
      ref={regionRef}
      role="region"
      aria-roledescription="carrusel"
      aria-label={`Opciones de ${label}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className={cn(
        "relative -mx-5 rounded-xl outline-none sm:-mx-8",
        "focus-visible:ring-2 focus-visible:ring-[#927AAC] focus-visible:ring-inset"
      )}
    >
      {/* Los keyframes solo animan las tarjetas que "saltan" al otro extremo del círculo. */}
      <style>{`@media (prefers-reduced-motion: no-preference){@keyframes vendor-carousel-in{from{opacity:0}}}`}</style>
      <div className="relative">
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onClickCapture={onClickCapture}
          onDragStart={(event) => event.preventDefault()}
          className={cn(
            "grid grid-cols-[minmax(0,1fr)] overflow-x-clip py-4 [--step:74%]",
            !single && "touch-pan-y select-none"
          )}
        >
          {slides.map((slide, index) => {
            const offset = offsetOf(index, active, count);
            const before = offsetOf(index, prev, count);
            const isCenter = offset === 0;
            const isHidden = Math.abs(offset) >= HIDDEN_AT;
            const look = isCenter ? STYLE.center : isHidden ? STYLE.hidden : STYLE.side;
            const clamped = Math.max(-HIDDEN_AT, Math.min(HIDDEN_AT, offset));
            // Salto de un extremo del círculo al otro: se recoloca al instante y aparece con fundido.
            const jumped = prev !== active && Math.abs(offset - before) > 1;

            return (
              <div
                key={slide.key}
                data-slide=""
                data-offset={offset}
                role="group"
                aria-roledescription="diapositiva"
                aria-label={`${index + 1} de ${count}`}
                aria-hidden={isCenter ? undefined : true}
                onClick={isCenter || isHidden ? undefined : () => goTo(index)}
                className={cn(
                  "col-start-1 row-start-1 justify-self-center",
                  SLIDE_WIDTH,
                  "transition-[transform,opacity] duration-[400ms] ease-out motion-reduce:transition-none",
                  !isCenter && !isHidden && "cursor-pointer",
                  isHidden && "pointer-events-none"
                )}
                style={{
                  transform: `translateX(calc(${clamped} * var(--step))) scale(${look.scale})`,
                  opacity: look.opacity,
                  zIndex: 30 - Math.abs(clamped) * 10,
                  transition: jumped ? "none" : undefined,
                  animation: jumped && !isHidden ? "vendor-carousel-in 400ms ease-out" : undefined,
                }}
              >
                {/* `inert` anula foco y clics del contenido; el clic llega a la envoltura y centra la tarjeta. */}
                <div inert={!isCenter} className="h-full">
                  {slide.render(isCenter)}
                </div>
              </div>
            );
          })}
        </div>

        {!single && (
          <>
            <button
              type="button"
              aria-label={`Opción anterior de ${label}`}
              onClick={() => goTo(active - 1)}
              className={cn(ARROW, "left-5 sm:left-8 md:left-4")}
            >
              <ChevronLeftIcon className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={`Opción siguiente de ${label}`}
              onClick={() => goTo(active + 1)}
              className={cn(ARROW, "right-5 left-auto sm:right-8 md:right-4")}
            >
              <ChevronRightIcon className="size-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {!single && (
        <div className="mt-3 flex min-h-11 flex-wrap items-center justify-center gap-x-0.5 px-16">
          {slides.map((slide, index) => (
            <button
              key={slide.key}
              type="button"
              aria-label={`Ir a la opción ${index + 1} de ${count}: ${slide.name}`}
              aria-current={index === active ? "true" : undefined}
              onClick={() => goTo(index)}
              className={cn("group/dot inline-flex size-6 items-center justify-center rounded-full", ROW_FOCUS)}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "rounded-full transition-all duration-300 motion-reduce:transition-none",
                  index === active ? "size-3 bg-[#927AAC]" : "size-2.5 bg-[#D4C0EA] group-hover/dot:bg-[#A38ED2]"
                )}
              />
            </button>
          ))}
        </div>
      )}

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
