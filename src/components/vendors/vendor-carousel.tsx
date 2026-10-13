"use client";

import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

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
export const SLIDE_WIDTH = "w-[68%] sm:w-[14.5rem] lg:w-[16.5rem]";

/** Arrastre mínimo (px) para pasar de tarjeta al soltar. */
const SWIPE_THRESHOLD = 40;
/** Desde aquí un gesto es un arrastre y no un clic. */
const DRAG_START = 6;
/** Tiempo con el cursor encima de una lateral antes de traerla al frente. */
const HOVER_INTENT_MS = 280;
/** Fracción del ancho de la tarjeta que separa a las vecinas (también en `--step`). */
const STEP = 0.74;
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
  peek: { scale: 0.9, opacity: 0.85 },
  hidden: { scale: 0.7, opacity: 0 },
} as const;

const ARROW = cn(
  "absolute top-full left-0 z-40 mt-3 inline-flex size-11 items-center justify-center rounded-full bg-cta text-on-cta transition-opacity hover:opacity-90",
  "md:top-1/2 md:mt-0 md:size-11 md:-translate-y-1/2",
  ROW_FOCUS
);

/**
 * Carrusel circular estilo coverflow: la tarjeta activa va en el centro a
 * tamaño completo y las vecinas asoman a los lados, más pequeñas y atenuadas.
 * Solo la tarjeta central es interactiva; una vecina pasa al frente al pulsarla o
 * al dejar el cursor encima un instante. También se arrastra con ratón o dedo.
 */
export function VendorCarousel({ label, slides }: { label: string; slides: CarouselSlide[] }) {
  const { t } = useTranslation("vendors");
  const count = slides.length;
  // Se guarda la clave (no el índice) para que reordenar por estado no cambie la tarjeta central.
  const [state, setState] = React.useState<{ active: string | null; prev: string | null }>({
    active: null,
    prev: null,
  });
  const [announcement, setAnnouncement] = React.useState("");
  const regionRef = React.useRef<HTMLDivElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{ x: number; y: number; id: number; started: boolean } | null>(null);
  const dragged = React.useRef(false);
  const hoverTimer = React.useRef<number | null>(null);
  // Última posición del cursor y punto desde el que se exige moverlo para volver a armar el hover.
  const lastPointer = React.useRef<{ x: number; y: number } | null>(null);
  const hoverLock = React.useRef<{ x: number; y: number } | null>(null);
  const [peek, setPeek] = React.useState<string | null>(null);

  // Una opción nueva que entra la primera (las listas van de más nueva a más antigua)
  // se coloca delante. Se ajusta durante el render, sin pasar por un efecto.
  const keysSignature = slides.map((s) => s.key).join("\u0000");
  const [seen, setSeen] = React.useState({ signature: keysSignature, keys: slides.map((s) => s.key) });
  if (seen.signature !== keysSignature) {
    const keys = slides.map((s) => s.key);
    setSeen({ signature: keysSignature, keys });
    if (seen.keys.length > 0 && keys.length > 0 && !seen.keys.includes(keys[0])) {
      setState({ active: keys[0], prev: state.active ?? seen.keys[0] });
      setAnnouncement(t("carousel.newOption", { name: slides[0].name }));
    }
  }

  const indexOfKey = (key: string | null) => {
    const i = key === null ? -1 : slides.findIndex((s) => s.key === key);
    return i === -1 ? 0 : i;
  };
  const active = indexOfKey(state.active);
  const prev = indexOfKey(state.prev);

  function cancelHover() {
    if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
    setPeek(null);
  }

  React.useEffect(
    () => () => {
      if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
    },
    []
  );

  function goTo(index: number) {
    if (count === 0) return;
    cancelHover();
    const next = ((index % count) + count) % count;
    if (next === active) return;
    // Mientras las tarjetas se recolocan bajo un cursor quieto no se encadenan más cambios.
    hoverLock.current = lastPointer.current;
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

  function setDragging(on: boolean, dx = 0) {
    const track = trackRef.current;
    if (!track) return;
    if (on) track.dataset.dragging = "true";
    else delete track.dataset.dragging;
    track.style.setProperty("--drag", `${dx}px`);
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (count < 2 || !event.currentTarget.contains(event.target as Node)) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    // Los botones de la tarjeta (editar, eliminar, contacto) no inician arrastre.
    if ((event.target as HTMLElement).closest("button, a, input, textarea, select")) return;
    cancelHover();
    drag.current = { x: event.clientX, y: event.clientY, id: event.pointerId, started: false };
    dragged.current = false;
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    lastPointer.current = { x: event.clientX, y: event.clientY };
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    if (!start.started) {
      if (Math.abs(dx) < DRAG_START || Math.abs(dx) <= Math.abs(event.clientY - start.y)) return;
      start.started = true;
      dragged.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    // La tarjeta sigue al dedo hasta, como mucho, la separación entre vecinas.
    const limit = (trackRef.current?.firstElementChild as HTMLElement | null)?.offsetWidth ?? 240;
    const max = limit * STEP;
    setDragging(true, Math.max(-max, Math.min(max, dx)));
  }

  function onPointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    drag.current = null;
    if (!start.started) return;
    setDragging(false);
    if (event.type === "pointercancel") return;
    const dx = event.clientX - start.x;
    if (Math.abs(dx) >= SWIPE_THRESHOLD) goTo(dx < 0 ? active + 1 : active - 1);
  }

  // Tras arrastrar, el "click" que sigue al soltar no debe centrar la tarjeta que haya debajo.
  function onClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (dragged.current) {
      dragged.current = false;
      event.stopPropagation();
    }
  }

  // Cursor un instante sobre una lateral: pasa al frente (no salta al cruzarla de paso).
  function armHover(index: number, event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || drag.current || hoverTimer.current !== null) return;
    const lock = hoverLock.current;
    if (lock && Math.hypot(event.clientX - lock.x, event.clientY - lock.y) < 10) return;
    hoverLock.current = null;
    setPeek(slides[index].key);
    hoverTimer.current = window.setTimeout(() => goTo(index), HOVER_INTENT_MS);
  }

  const single = count < 2;

  return (
    <div
      ref={regionRef}
      role="region"
      aria-roledescription={t("carousel.roleCarousel")}
      aria-label={t("carousel.options", { label })}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className={cn(
        "relative -mx-5 rounded-xl outline-none sm:-mx-8",
        "focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-inset"
      )}
    >
      {/* Los keyframes solo animan las tarjetas que "saltan" al otro extremo del círculo. */}
      <style>{`@media (prefers-reduced-motion: no-preference){@keyframes vendor-carousel-in{from{opacity:0}}}`}</style>
      <div className="relative">
        <div
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onClickCapture={onClickCapture}
          onDragStart={(event) => event.preventDefault()}
          className={cn(
            "group/track grid grid-cols-[minmax(0,1fr)] overflow-x-clip py-3 [--step:74%]",
            !single && "cursor-grab touch-pan-y select-none data-[dragging=true]:cursor-grabbing"
          )}
        >
          {slides.map((slide, index) => {
            const offset = offsetOf(index, active, count);
            const before = offsetOf(index, prev, count);
            const isCenter = offset === 0;
            const isHidden = Math.abs(offset) >= HIDDEN_AT;
            const look = isCenter
              ? STYLE.center
              : isHidden
                ? STYLE.hidden
                : peek === slide.key
                  ? STYLE.peek
                  : STYLE.side;
            const clamped = Math.max(-HIDDEN_AT, Math.min(HIDDEN_AT, offset));
            // Salto de un extremo del círculo al otro: se recoloca al instante y aparece con fundido.
            const jumped = prev !== active && Math.abs(offset - before) > 1;

            return (
              <div
                key={slide.key}
                data-slide=""
                data-offset={offset}
                role="group"
                aria-roledescription={t("carousel.roleSlide")}
                aria-label={t("carousel.slideOf", { index: index + 1, count })}
                aria-hidden={isCenter ? undefined : true}
                onClick={isCenter || isHidden ? undefined : () => goTo(index)}
                onPointerEnter={isCenter || isHidden ? undefined : (event) => armHover(index, event)}
                onPointerMove={isCenter || isHidden ? undefined : (event) => armHover(index, event)}
                onPointerLeave={isCenter || isHidden ? undefined : cancelHover}
                className={cn(
                  "col-start-1 row-start-1 justify-self-center",
                  SLIDE_WIDTH,
                  "transition-[transform,opacity] duration-[450ms] [transition-timing-function:var(--ease-gentle)] motion-reduce:transition-none",
                  "group-data-[dragging=true]/track:transition-none",
                  isHidden && "pointer-events-none"
                )}
                style={{
                  transform: `translateX(calc(${clamped} * var(--step) + var(--drag, 0px))) scale(${look.scale})`,
                  opacity: look.opacity,
                  zIndex: 30 - Math.abs(clamped) * 10,
                  transition: jumped ? "none" : undefined,
                  animation: jumped && !isHidden ? "vendor-carousel-in 450ms var(--ease-gentle)" : undefined,
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
              aria-label={t("carousel.previous", { label })}
              onClick={() => goTo(active - 1)}
              className={cn(ARROW, "left-5 sm:left-8 md:left-4")}
            >
              <ChevronLeftIcon className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={t("carousel.next", { label })}
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
              aria-label={t("carousel.goTo", { index: index + 1, count, name: slide.name })}
              aria-current={index === active ? "true" : undefined}
              onClick={() => goTo(index)}
              className={cn("group/dot inline-flex size-6 items-center justify-center rounded-full", ROW_FOCUS)}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "rounded-full transition-all duration-300 motion-reduce:transition-none",
                  index === active ? "size-3 bg-lilac" : "size-2.5 bg-btn-soft group-hover/dot:bg-lilac-bright"
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
