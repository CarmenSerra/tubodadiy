"use client";

import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { FOCUS } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";

const ARROW = cn(
  "absolute top-[6.5rem] z-10 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-[#927AAC] text-white transition-opacity hover:opacity-90 sm:top-[7rem] sm:size-10",
  FOCUS
);

/**
 * Carrusel horizontal con scroll-snap. Las flechas solo aparecen si hay
 * contenido fuera de vista en esa dirección; el desplazamiento táctil y de
 * trackpad funciona de forma nativa (la barra de scroll va oculta).
 */
export function VendorCarousel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = React.useState(false);
  const [canNext, setCanNext] = React.useState(false);

  const update = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(max > 4 && el.scrollLeft < max - 4);
  }, []);

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    Array.from(el.children).forEach((child) => observer.observe(child));
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [update, children]);

  function scrollByPage(direction: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <div className="relative">
      {canPrev && (
        <button
          type="button"
          aria-label={`Ver opciones anteriores de ${label}`}
          onClick={() => scrollByPage(-1)}
          className={cn(ARROW, "left-2")}
        >
          <ChevronLeftIcon className="size-5" aria-hidden="true" />
        </button>
      )}
      {canNext && (
        <button
          type="button"
          aria-label={`Ver más opciones de ${label}`}
          onClick={() => scrollByPage(1)}
          className={cn(ARROW, "right-2")}
        >
          <ChevronRightIcon className="size-5" aria-hidden="true" />
        </button>
      )}
      <div
        ref={scrollerRef}
        role="group"
        aria-label={`Opciones de ${label}`}
        tabIndex={0}
        className={cn(
          "flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth pb-1",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#927AAC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F1EB]"
        )}
      >
        {children}
      </div>
    </div>
  );
}
