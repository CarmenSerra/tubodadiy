import type { CSSProperties } from "react";

import type { SceneVariant } from "@/lib/honeymoon-model";
import { cn } from "@/lib/utils";

// Dibujos decorativos de la Luna de miel: palmeras, sol/luna, olas, montañas, hojas,
// nubes, hibisco y un avión con su estela punteada. SVG en línea, sin imágenes, todos
// `aria-hidden`; los colores salen de los tokens --hm-* (globals.css), que cambian solos
// entre el tema claro y la noche tropical. Sin hooks: sirven en servidor y en cliente.

type MotifProps = { className?: string; style?: CSSProperties };

const fill = (token: string): CSSProperties => ({ fill: `var(--hm-${token})` });
const stroke = (token: string): CSSProperties => ({ stroke: `var(--hm-${token})` });

/** Sol (claro) o luna (oscuro) con halo y rayos. */
export function Sun({ className, style }: MotifProps) {
  return (
    <svg viewBox="0 0 160 160" aria-hidden="true" className={className} style={style}>
      <circle cx="80" cy="80" r="76" style={fill("sun-glow")} />
      <circle cx="80" cy="80" r="52" style={fill("sun-glow")} />
      <g strokeWidth="3.5" strokeLinecap="round" style={stroke("sun-ray")}>
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1="80" y1="14" x2="80" y2="26" transform={`rotate(${i * 30} 80 80)`} />
        ))}
      </g>
      <circle cx="80" cy="80" r="30" style={fill("sun")} />
    </svg>
  );
}

/** Estrellitas: solo se ven en la noche tropical (--hm-star es transparente de día). */
export function Stars({ className }: MotifProps) {
  const stars = [
    [20, 30, 1.6],
    [70, 12, 1.2],
    [118, 44, 1.8],
    [160, 18, 1.2],
    [210, 52, 1.5],
    [250, 24, 1.1],
    [40, 78, 1.1],
    [96, 90, 1.5],
    [190, 96, 1.2],
    [236, 82, 1.7],
  ] as const;
  return (
    <svg viewBox="0 0 280 110" aria-hidden="true" className={className}>
      {stars.map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} style={fill("star")} />
      ))}
    </svg>
  );
}

export function Cloud({ className, style }: MotifProps) {
  return (
    <svg viewBox="0 0 120 56" aria-hidden="true" className={className} style={style}>
      <path
        d="M22 50 a16 16 0 0 1 2-31 a22 22 0 0 1 42-6 a18 18 0 0 1 30 12 a15 15 0 0 1 4 25 Z"
        style={fill("cloud")}
      />
    </svg>
  );
}

/** Una hoja de palmera: arco con nervio central. Se orienta hacia la derecha desde (0,0). */
const FROND_BLADE = "M0 0 C 26 -40, 82 -50, 120 -8 C 84 -26, 40 -22, 0 0 Z";
const FROND_RIB = "M0 0 C 30 -30, 76 -36, 116 -10";

/** Palmera con tronco curvo y copa de siete hojas. */
export function Palm({ className, style }: MotifProps) {
  const right = [-62, -30, 4, 34] as const;
  const left = [-52, -22, 12] as const;
  return (
    <svg viewBox="0 0 260 340" aria-hidden="true" className={className} style={style}>
      <path
        d="M118 340 C 124 270, 112 200, 138 120 L 148 122 C 128 204, 138 274, 136 340 Z"
        style={fill("trunk")}
      />
      <g strokeWidth="1.5" strokeLinecap="round" opacity="0.55" style={stroke("palm-dark")} fill="none">
        <path d="M122 300 l14 -2 M123 262 l14 -2 M124 224 l14 -2 M128 186 l14 -2 M132 150 l13 -2" />
      </g>
      <g transform="translate(143 121)">
        {left.map((r, i) => (
          <g key={`l${r}`} transform={`scale(-1 1) rotate(${r}) scale(${0.92 - i * 0.04})`}>
            <path d={FROND_BLADE} style={fill(i % 2 ? "palm" : "palm-dark")} />
            <path d={FROND_RIB} fill="none" strokeWidth="1.5" opacity="0.5" style={stroke("sun-glow")} />
          </g>
        ))}
        {right.map((r, i) => (
          <g key={`r${r}`} transform={`rotate(${r}) scale(${1 - i * 0.05})`}>
            <path d={FROND_BLADE} style={fill(i % 2 ? "palm-dark" : "palm")} />
            <path d={FROND_RIB} fill="none" strokeWidth="1.5" opacity="0.5" style={stroke("sun-glow")} />
          </g>
        ))}
        <circle cx="-5" cy="9" r="6" style={fill("palm-dark")} />
        <circle cx="6" cy="11" r="6" style={fill("palm-dark")} />
      </g>
    </svg>
  );
}

/** Hoja de platanera: alargada, con nervios en espiga. */
export function BananaLeaf({ className, style }: MotifProps) {
  return (
    <svg viewBox="0 0 120 200" aria-hidden="true" className={className} style={style}>
      <path d="M60 196 C 14 150, 6 70, 60 4 C 114 70, 106 150, 60 196 Z" style={fill("leaf")} />
      <g fill="none" strokeWidth="2" strokeLinecap="round" opacity="0.5" style={stroke("palm-dark")}>
        <path d="M60 196 L60 14" />
        {[44, 74, 104, 134, 162].map((y) => {
          const w = 38 - Math.abs(y - 100) / 4;
          return <path key={y} d={`M60 ${y} L${60 - w} ${y - 22} M60 ${y} L${60 + w} ${y - 22}`} />;
        })}
      </g>
    </svg>
  );
}

/** Hoja de monstera: corazón con escotaduras. */
export function Monstera({ className, style }: MotifProps) {
  return (
    <svg viewBox="0 0 140 140" aria-hidden="true" className={className} style={style}>
      <path
        d="M70 134 C 22 124, 6 78, 24 44 C 34 24, 56 14, 70 24 C 84 14, 106 24, 116 44 C 134 78, 118 124, 70 134 Z"
        style={fill("leaf")}
      />
      <g fill="none" strokeWidth="2.2" strokeLinecap="round" opacity="0.55" style={stroke("palm-dark")}>
        <path d="M70 134 L70 30" />
        <path d="M70 100 L36 86 M70 80 L30 62 M70 60 L40 40 M70 100 L104 86 M70 80 L110 62 M70 60 L100 40" />
      </g>
      <g style={{ fill: "var(--hm-sky-mid)" }}>
        <path d="M24 72 L46 80 L26 86 Z M116 72 L94 80 L114 86 Z M34 102 L52 100 L40 112 Z M106 102 L88 100 L100 112 Z" />
      </g>
    </svg>
  );
}

/** Hibisco: cinco pétalos y estambre. */
export function Hibiscus({ className, style }: MotifProps) {
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true" className={className} style={style}>
      <g transform="translate(40 40)">
        {Array.from({ length: 5 }, (_, i) => (
          <ellipse
            key={i}
            cx="0"
            cy="-16"
            rx="11"
            ry="17"
            transform={`rotate(${i * 72})`}
            style={fill("flower")}
            opacity="0.92"
          />
        ))}
        <circle r="5" style={fill("sun")} />
        <path d="M0 0 L14 -14" strokeWidth="2.5" strokeLinecap="round" style={stroke("sun")} />
        <circle cx="14" cy="-14" r="2.6" style={fill("sun")} />
      </g>
    </svg>
  );
}

/** Siluetas de montañas (dos filas) con cima en V. */
export function Mountains({ className, style }: MotifProps) {
  return (
    <svg
      viewBox="0 0 1200 300"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <path
        d="M0 300 L0 190 L90 126 L150 168 L270 56 L372 160 L444 120 L560 206 L690 84 L790 170 L880 112 L1010 200 L1100 140 L1200 196 L1200 300 Z"
        style={fill("mtn-far")}
      />
      <path d="M270 56 L300 98 L282 94 L262 112 L248 82 Z" opacity="0.35" style={{ fill: "var(--hm-cloud)" }} />
      <path
        d="M0 300 L0 236 C 80 190, 150 196, 240 232 C 330 266, 400 214, 500 190 C 610 162, 690 214, 780 236 C 880 262, 960 198, 1060 184 C 1130 176, 1170 200, 1200 214 L1200 300 Z"
        style={fill("mtn-near")}
      />
      <path
        d="M0 300 L0 270 C 120 246, 220 262, 340 276 C 470 290, 560 254, 690 258 C 820 262, 920 290, 1040 270 C 1110 258, 1160 262, 1200 270 L1200 300 Z"
        style={fill("hill")}
      />
    </svg>
  );
}

/** Mar: dos capas de olas y una línea de espuma punteada. */
export function Waves({ className, style }: MotifProps) {
  return (
    <svg
      viewBox="0 0 1200 140"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <path
        d="M0 46 C 100 14, 200 78, 300 46 S 500 14, 600 46 S 800 78, 900 46 S 1100 14, 1200 46 L1200 140 L0 140 Z"
        style={fill("sea")}
      />
      <path
        d="M0 46 C 100 14, 200 78, 300 46 S 500 14, 600 46 S 800 78, 900 46 S 1100 14, 1200 46"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 12"
        style={stroke("foam")}
      />
      <path
        d="M0 84 C 120 56, 220 110, 340 84 S 560 56, 680 84 S 900 110, 1020 84 S 1150 64, 1200 78 L1200 140 L0 140 Z"
        style={fill("sea-deep")}
      />
      <path
        d="M0 84 C 120 56, 220 110, 340 84 S 560 56, 680 84 S 900 110, 1020 84 S 1150 64, 1200 78"
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="1 11"
        style={stroke("foam")}
      />
    </svg>
  );
}

/** Silueta de avión (24×24, apunta arriba a la derecha) para usar dentro de un <svg>. */
const PLANE_PATH =
  "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z";

/** Avión suelto. */
export function Plane({ className, style }: MotifProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} style={style}>
      <path
        d={PLANE_PATH}
        strokeWidth="1.4"
        strokeLinejoin="round"
        style={{ fill: "var(--hm-plane)", stroke: "var(--hm-plane-edge)" }}
      />
    </svg>
  );
}

/** Avión que acaba una estela punteada: sale por la izquierda y sube hacia la derecha. */
export function PlaneTrail({ className, style }: MotifProps) {
  return (
    <svg viewBox="0 0 320 120" aria-hidden="true" className={className} style={style}>
      <path
        d="M6 108 C 70 112, 96 40, 168 56 S 238 70, 270 34"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="0.5 10"
        style={stroke("trail")}
      />
      <g transform="translate(264 6) rotate(8 18 18) scale(1.5)">
        <path
          d={PLANE_PATH}
          strokeWidth="1.1"
          strokeLinejoin="round"
          style={{ fill: "var(--hm-plane)", stroke: "var(--hm-plane-edge)" }}
        />
      </g>
    </svg>
  );
}

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
