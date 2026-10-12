import type { CSSProperties } from "react";

import { TRAVEL, type TravelName } from "@/components/honeymoon/travel-assets";
import { cn } from "@/lib/utils";

// Acuarela de viaje (public/decor/travel/*.webp, generadas por scripts/watercolor con
// `--set travel`). Igual que `Watercolor` del resto de la app: <img> plano, decorativo,
// sin eventos; el tono en modo noche sale de `.decor-img` (globals.css).
export function TravelWatercolor({
  name,
  className,
  style,
}: {
  name: TravelName;
  className?: string;
  style?: CSSProperties;
}) {
  const { w, h, kind } = TRAVEL[name];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/decor/travel/${name}.webp`}
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
