"use client";

import { usePathname } from "next/navigation";

import { decorItemStyle } from "@/components/brand/app-backdrop";
import { TRAVEL } from "@/components/honeymoon/travel-assets";
import { travelLayout } from "@/components/honeymoon/travel-layout";
import { TravelWatercolor } from "@/components/honeymoon/travel-watercolor";
import { cn } from "@/lib/utils";

// Fondo fijo de la Luna de miel: sustituye al AppBackdrop solo en esta ruta (lo decide
// `AppFrame`). Mismo sistema que el resto de la web: acuarelas WebP (aquí la batería de
// viaje de public/decor/travel: pasaporte, DNI, billete, maleta, avión, palmera, coco,
// concha, sombrilla, cámara, mapa, brújula, sello, ola, sol e hibisco) repartidas al azar
// por los márgenes, con la composición fijada por la ruta (ver travel-layout.ts), sobre un
// degradado de cielo muy suave en pastel. Va `fixed` a pantalla completa, detrás del
// contenido, sin eventos y sin animaciones. Todo es decoración (aria-hidden): las
// tarjetas de la página son opacas, así que ningún texto se apoya en estos dibujos.
// En móvil (<640px) solo se ven los 4 primeros motivos, a menor tamaño (--decor-scale).

export function HoneymoonBackdrop() {
  const pathname = usePathname();
  const items = travelLayout(pathname);
  return (
    <div
      key={pathname}
      aria-hidden="true"
      data-testid="honeymoon-backdrop"
      className="decor-layer pointer-events-none fixed inset-0 -z-10 overflow-hidden print:hidden"
      style={{
        background:
          "linear-gradient(to bottom, var(--hm-sky-top) 0%, var(--hm-sky-mid) 52%, var(--hm-sky-bottom) 100%)",
      }}
    >
      {items.map((it) => (
        <TravelWatercolor
          key={it.name}
          name={it.name}
          className={cn("absolute max-w-none", !it.mobile && "hidden sm:block")}
          style={decorItemStyle(it, TRAVEL[it.name])}
        />
      ))}
    </div>
  );
}
