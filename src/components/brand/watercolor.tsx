import type { CSSProperties } from "react";

import { WATERCOLOR, type WatercolorName } from "@/components/brand/watercolor-assets";
import { cn } from "@/lib/utils";

// Motivo de acuarela (public/decor/*.webp, generados por scripts/watercolor).
// <img> plano a propósito: son WebP ya optimizados y decorativos, y el optimizador de
// next/image los volvería a codificar. Puramente ornamental: alt vacío, aria-hidden y
// sin eventos. El tono en modo noche (.decor-img) vive en globals.css.
export function Watercolor({
  name,
  className,
  style,
}: {
  name: WatercolorName;
  className?: string;
  style?: CSSProperties;
}) {
  const { w, h, kind } = WATERCOLOR[name];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/decor/${name}.webp`}
      alt=""
      aria-hidden="true"
      width={w}
      height={h}
      loading="lazy"
      decoding="async"
      draggable={false}
      data-decor={kind}
      className={cn("decor-img pointer-events-none select-none", className)}
      style={style}
    />
  );
}
