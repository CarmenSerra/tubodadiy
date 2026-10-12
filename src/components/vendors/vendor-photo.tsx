"use client";

import * as React from "react";

import { VendorIllustration } from "@/components/vendors/vendor-illustration";
import { isHttpUrl } from "@/components/vendors/vendor-model";
import { cn } from "@/lib/utils";

/**
 * Marcador de posición de marca: la ilustración determinista de la categoría.
 * (Sin `seed` propio usa la categoría, así que todas las vacías de una misma
 * categoría se ven igual.)
 */
export function VendorPlaceholder({
  category,
  className,
  muted = false,
}: {
  category: string;
  className?: string;
  muted?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("relative h-full w-full overflow-hidden", muted && "opacity-70", className)}
    >
      <VendorIllustration seed={`categoria:${category}`} kind={category} />
    </div>
  );
}

/**
 * Filtros SVG del efecto "ilustrado": desatura, suaviza, posteriza la luminosidad en
 * 6 niveles y la reparte en un degradado verde salvia → lila → crema (claro) o
 * ciruela → salvia → lila (oscuro). Es solo visual: la imagen original no se toca.
 * Cada filtro se elige con la variable `--illustrated-filter` (globals.css).
 */
function IllustratedFilterDefs() {
  const levels = "0 0.2 0.4 0.6 0.8 1";
  const duotone = (id: string, shadow: [number, number, number], mid: [number, number, number], light: [number, number, number]) => (
    <filter id={id} colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
      <feGaussianBlur stdDeviation="1.1" />
      <feColorMatrix type="matrix" values="0.33 0.5 0.17 0 0  0.33 0.5 0.17 0 0  0.33 0.5 0.17 0 0  0 0 0 1 0" />
      <feComponentTransfer>
        <feFuncR type="discrete" tableValues={levels} />
        <feFuncG type="discrete" tableValues={levels} />
        <feFuncB type="discrete" tableValues={levels} />
      </feComponentTransfer>
      <feComponentTransfer>
        <feFuncR type="table" tableValues={`${shadow[0]} ${mid[0]} ${light[0]}`} />
        <feFuncG type="table" tableValues={`${shadow[1]} ${mid[1]} ${light[1]}`} />
        <feFuncB type="table" tableValues={`${shadow[2]} ${mid[2]} ${light[2]}`} />
      </feComponentTransfer>
    </filter>
  );
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        {/* #3f5c4a → #b6a5d0 → #f4f1eb */}
        {duotone("vendor-illustrated-light", [0.247, 0.361, 0.29], [0.714, 0.647, 0.816], [0.957, 0.945, 0.922])}
        {/* #38384d → #8faf8a → #d4c0ea */}
        {duotone("vendor-illustrated-dark", [0.22, 0.22, 0.302], [0.561, 0.686, 0.541], [0.831, 0.753, 0.918])}
      </defs>
    </svg>
  );
}

const PHOTO_DATA_PREFIX = /^data:image\/(?:webp|jpeg|jpg|png);base64,/i;

/**
 * Foto de la opción con zoom suave al pasar el ratón por la tarjeta
 * (el grupo `group/card` lo define la tarjeta). Solo la imagen escala, dentro
 * de un contenedor con overflow-hidden: nada de will-change para no
 * emborronar el texto.
 *
 * Prioridad: foto subida (`photoData`) → foto enlazada de la web (`photoUrl`,
 * solo enlazada, nunca copiada; si falla la carga se descarta) → ilustración
 * determinista (`seed`, `kind`). Con `illustrated` la foto de la web recibe el
 * efecto duotono; la subida por el usuario se muestra tal cual.
 */
export function VendorPhoto({
  photoData,
  photoUrl,
  name,
  category,
  seed,
  kind,
  illustrated = false,
  className,
}: {
  photoData?: string;
  photoUrl?: string;
  name: string;
  category: string;
  /** Semilla de la ilustración (placeId ?? id). */
  seed?: string;
  /** Tipo para el motivo de la ilustración (placeKind ?? category). */
  kind?: string;
  /** Aplica el efecto "ilustrado" a la foto enlazada de la web. */
  illustrated?: boolean;
  className?: string;
}) {
  const data = photoData?.trim() ?? "";
  const url = photoUrl?.trim() ?? "";
  const [failed, setFailed] = React.useState<string | null>(null);
  const hasData = PHOTO_DATA_PREFIX.test(data) && failed !== data;
  const hasUrl = !hasData && isHttpUrl(url) && failed !== url;
  const src = hasData ? data : hasUrl ? url : "";
  const imageClass =
    "h-full w-full object-cover transition-transform duration-500 ease-out group-hover/card:scale-[1.08] motion-reduce:transition-none motion-reduce:group-hover/card:scale-100";

  return (
    <div className={cn("relative aspect-[4/3] w-full overflow-hidden bg-lilac-soft", className)}>
      {src ? (
        <>
          {hasUrl && illustrated && <IllustratedFilterDefs />}
          {/* eslint-disable-next-line @next/next/no-img-element -- dominios remotos libres: no se puede usar next/image */}
          <img
            src={src}
            alt={name}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailed(src)}
            className={cn(imageClass, hasUrl && illustrated && "photo-illustrated")}
          />
        </>
      ) : (
        <div aria-hidden="true" className="h-full w-full">
          <VendorIllustration seed={seed || `categoria:${category}`} kind={kind || category} />
        </div>
      )}
    </div>
  );
}
