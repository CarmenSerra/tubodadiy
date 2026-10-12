"use client";

import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";

import { Watercolor } from "@/components/brand/watercolor";
import { WATERCOLOR } from "@/components/brand/watercolor-assets";
import { decorLayout, type DecorItem } from "@/lib/decor-layout";
import { cn } from "@/lib/utils";

// Fondo decorativo fijo de las páginas autenticadas: acuarelas (WebP de public/decor)
// repartidas al azar por los márgenes. La composición cambia con la ruta pero es estable
// durante la visita (semilla = pathname, ver decor-layout.ts). Va `fixed` a pantalla
// completa detrás del contenido, sin eventos, y con baja opacidad: es ambiente, no
// información. En móvil (<640px) solo se ven los 4 primeros motivos, a menor tamaño.

/** Posición, tamaño y giro de un motivo del reparto (lo reutiliza el fondo de la Luna de miel). */
export function decorItemStyle(it: DecorItem<string>, { w, h }: { w: number; h: number }): CSSProperties {
  const iw = "var(--iw)";
  const flip = it.flip ? " scaleX(-1)" : "";
  const common = {
    "--iw": "calc(var(--w) * var(--decor-scale))",
    "--w": `${it.width}px`,
    "--o": it.opacity,
    width: iw,
    height: "auto",
  } as CSSProperties;
  if (it.side === "b") {
    return {
      ...common,
      left: `${it.pos}%`,
      bottom: `calc(var(--iw) * ${(-it.bleed * (h / w)).toFixed(3)})`,
      transform: `translateX(-50%) rotate(${it.rot}deg)${flip}`,
    };
  }
  return {
    ...common,
    top: `${it.pos}%`,
    [it.side === "l" ? "left" : "right"]: `calc(var(--iw) * ${(-it.bleed).toFixed(3)})`,
    transform: `translateY(-50%) rotate(${it.rot}deg)${flip}`,
  };
}

export function AppBackdrop() {
  const pathname = usePathname();
  // /nuevo-plan ya lleva sus propias acuarelas (onboarding/ui.tsx): aquí solo dos motivos.
  const items = decorLayout(pathname).slice(0, pathname.startsWith("/nuevo-plan") ? 2 : undefined);
  return (
    <div
      key={pathname}
      aria-hidden="true"
      className="decor-layer pointer-events-none fixed inset-0 -z-10 overflow-hidden print:hidden"
    >
      {items.map((it) => (
        <Watercolor
          key={it.name}
          name={it.name}
          className={cn("absolute max-w-none", !it.mobile && "hidden sm:block")}
          style={decorItemStyle(it, WATERCOLOR[it.name])}
        />
      ))}
    </div>
  );
}
