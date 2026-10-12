import type { CSSProperties } from "react";

import type { SceneVariant } from "@/lib/honeymoon-model";
import { cn } from "@/lib/utils";

// Miniaturas ilustradas de los destinos sin foto (palmera, sol/luna, mar, avión). SVG en
// línea, `aria-hidden`; los colores salen de los tokens --hm-* (globals.css), que cambian
// solos entre el tema claro y la noche tropical. Sin movimiento. El fondo de la página son
// las acuarelas de public/decor/travel (honeymoon-backdrop.tsx), no estos dibujos.
// Sin hooks: sirven en servidor y en cliente.

const fill = (token: string): CSSProperties => ({ fill: `var(--hm-${token})` });
const stroke = (token: string): CSSProperties => ({ stroke: `var(--hm-${token})` });

/** Una hoja de palmera: arco con nervio central. Se orienta hacia la derecha desde (0,0). */
const FROND_BLADE = "M0 0 C 26 -40, 82 -50, 120 -8 C 84 -26, 40 -22, 0 0 Z";

/** Silueta de avión (24×24, apunta arriba a la derecha) para usar dentro de un <svg>. */
const PLANE_PATH =
  "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z";

// ---------- Escenas para las miniaturas de destinos sin foto ----------

function SkyDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style={{ stopColor: "var(--hm-sky-top)" }} />
        <stop offset="1" style={{ stopColor: "var(--hm-sky-mid)" }} />
      </linearGradient>
    </defs>
  );
}

/**
 * Miniatura ilustrada (4:3) de un destino sin imagen. La variante sale del nombre, así
 * cada destino conserva su dibujo. `uid` hace único el id del degradado dentro de la página.
 */
export function DestinationScene({
  variant,
  uid,
  className,
}: {
  variant: SceneVariant;
  uid: string;
  className?: string;
}) {
  const sky = `hm-sky-${uid}`;
  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={cn("h-full w-full", className)}
    >
      <SkyDefs id={sky} />
      <rect width="400" height="300" fill={`url(#${sky})`} />
      <circle cx="318" cy="76" r="44" style={fill("sun-glow")} />
      <circle cx="318" cy="76" r="24" style={fill("sun")} />
      <path
        d="M30 70 a10 10 0 0 1 1-19 a14 14 0 0 1 26-3 a11 11 0 0 1 18 7 a9 9 0 0 1 3 15 Z"
        style={fill("cloud")}
      />

      {variant === "playa" && (
        <>
          <path d="M0 176 C 90 160, 180 190, 400 168 L400 300 L0 300 Z" style={fill("sea")} />
          <path d="M0 196 C 100 182, 200 206, 400 190 L400 300 L0 300 Z" style={fill("sea-deep")} />
          <path
            d="M0 232 C 110 214, 240 252, 400 226 L400 300 L0 300 Z"
            style={fill("sand")}
          />
          <path
            d="M0 200 C 100 186, 200 210, 400 194"
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="1 11"
            style={stroke("foam")}
          />
          <svg x="236" y="46" width="150" height="196" viewBox="0 0 260 340">
            <path d="M118 340 C 124 270, 112 200, 138 120 L 148 122 C 128 204, 138 274, 136 340 Z" style={fill("trunk")} />
            <g transform="translate(143 121)">
              {[-60, -26, 6, 36].map((r) => (
                <path key={r} d={FROND_BLADE} transform={`rotate(${r})`} style={fill("palm")} />
              ))}
              {[-50, -18, 14].map((r) => (
                <path key={r} d={FROND_BLADE} transform={`scale(-1 1) rotate(${r})`} style={fill("palm-dark")} />
              ))}
            </g>
          </svg>
        </>
      )}

      {variant === "montana" && (
        <>
          <path
            d="M0 300 L0 170 L70 100 L120 146 L204 40 L286 150 L330 112 L400 180 L400 300 Z"
            style={fill("mtn-far")}
          />
          <path d="M204 40 L230 78 L214 74 L200 90 L186 66 Z" opacity="0.5" style={{ fill: "var(--hm-cloud)" }} />
          <path
            d="M0 300 L0 214 C 60 186, 120 196, 190 226 C 260 254, 320 214, 400 200 L400 300 Z"
            style={fill("mtn-near")}
          />
          <path d="M0 300 L0 258 C 100 238, 180 268, 280 256 C 340 250, 380 256, 400 262 L400 300 Z" style={fill("hill")} />
        </>
      )}

      {variant === "selva" && (
        <>
          <path d="M0 300 L0 190 C 70 150, 140 170, 210 196 C 290 224, 340 180, 400 170 L400 300 Z" style={fill("mtn-near")} />
          <path d="M0 300 L0 240 C 90 214, 170 250, 260 232 C 320 220, 370 230, 400 240 L400 300 Z" style={fill("hill")} />
          <svg x="-20" y="70" width="170" height="240" viewBox="0 0 120 200">
            <path d="M60 196 C 14 150, 6 70, 60 4 C 114 70, 106 150, 60 196 Z" style={fill("leaf")} />
            <path d="M60 196 L60 14" fill="none" strokeWidth="2" opacity="0.5" style={stroke("palm-dark")} />
          </svg>
          <svg x="250" y="90" width="170" height="220" viewBox="0 0 120 200">
            <path d="M60 196 C 14 150, 6 70, 60 4 C 114 70, 106 150, 60 196 Z" style={fill("palm")} />
            <path d="M60 196 L60 14" fill="none" strokeWidth="2" opacity="0.5" style={stroke("palm-dark")} />
          </svg>
          <svg x="150" y="190" width="90" height="90" viewBox="0 0 80 80">
            <g transform="translate(40 40)">
              {Array.from({ length: 5 }, (_, i) => (
                <ellipse key={i} cy="-16" rx="11" ry="17" transform={`rotate(${i * 72})`} style={fill("flower")} />
              ))}
              <circle r="5" style={fill("sun")} />
            </g>
          </svg>
        </>
      )}

      {variant === "isla" && (
        <>
          <path d="M0 190 L400 190 L400 300 L0 300 Z" style={fill("sea")} />
          <path d="M0 232 C 100 216, 220 250, 400 226 L400 300 L0 300 Z" style={fill("sea-deep")} />
          <path
            d="M70 192 C 110 150, 190 150, 244 192 Z"
            style={fill("hill")}
          />
          <path d="M96 192 C 130 168, 190 168, 224 192 Z" style={fill("sand")} />
          <svg x="130" y="96" width="96" height="124" viewBox="0 0 260 340">
            <path d="M118 340 C 124 270, 112 200, 138 120 L 148 122 C 128 204, 138 274, 136 340 Z" style={fill("trunk")} />
            <g transform="translate(143 121)">
              {[-60, -26, 6, 36].map((r) => (
                <path key={r} d={FROND_BLADE} transform={`rotate(${r})`} style={fill("palm")} />
              ))}
              {[-50, -18, 14].map((r) => (
                <path key={r} d={FROND_BLADE} transform={`scale(-1 1) rotate(${r})`} style={fill("palm-dark")} />
              ))}
            </g>
          </svg>
          <path
            d="M10 120 C 60 126, 90 70, 150 78"
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="0.5 9"
            style={stroke("trail")}
          />
          <g transform="translate(150 50) rotate(10 12 12) scale(1.8)">
            <path
              d={PLANE_PATH}
              strokeWidth="1.1"
              strokeLinejoin="round"
              style={{ fill: "var(--hm-plane)", stroke: "var(--hm-plane-edge)" }}
            />
          </g>
        </>
      )}
    </svg>
  );
}
