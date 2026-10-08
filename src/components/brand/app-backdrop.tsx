import { cn } from "@/lib/utils";

// Fondo decorativo fijo de las páginas autenticadas (layout de `(app)`): manchas
// orgánicas lila y salvia más unos pocos dibujos de línea fina (ramitas, hojas,
// aro, corazones, puntos), con el mismo lenguaje que el banner de bienvenida.
// Va `fixed` a pantalla completa, detrás del contenido: la página se desplaza
// por encima y las decoraciones se quedan quietas. Bajo contraste a propósito
// (tokens --bd-*): es ambiente, no información. SVG en línea, sin imágenes.
// En móvil (<640px) se reduce a dos manchas y tres motivos pequeños.

const BASE = "absolute";

const LINE = {
  fill: "none",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function Blob({ className, d, tone }: { className: string; d: string; tone: "lilac" | "sage" }) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true" className={cn(BASE, className)}>
      <path d={d} style={{ fill: `var(--bd-${tone})` }} />
    </svg>
  );
}

/** Ramita de hojas puntiagudas alternas (trazo salvia). */
function Sprig({ className }: { className: string }) {
  const leaves = [
    [30, 150, -1],
    [44, 124, 1],
    [58, 98, -1],
    [72, 72, 1],
    [86, 46, -1],
  ] as const;
  return (
    <svg viewBox="0 0 120 180" aria-hidden="true" className={cn(BASE, className)} {...LINE}>
      <path d="M22 176 C 26 120, 52 70, 96 14" style={{ stroke: "var(--bd-line-sage)" }} />
      {leaves.map(([x, y, s]) => (
        <path
          key={y}
          d={s < 0 ? `M${x} ${y} q -22 -4 -26 -26 q 22 2 26 26Z` : `M${x} ${y} q 22 -4 26 -26 q -22 2 -26 26Z`}
          style={{ stroke: "var(--bd-line-sage)" }}
        />
      ))}
    </svg>
  );
}

/** Rama curva con hojitas redondas y un capullo lila. */
function Twig({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 160 90" aria-hidden="true" className={cn(BASE, className)} {...LINE}>
      <path d="M4 78 C 40 80, 90 60, 140 18" style={{ stroke: "var(--bd-line-sage)" }} />
      {[
        [28, 62],
        [66, 54],
        [82, 43],
        [121, 27],
      ].map(([cx, cy]) => (
        <ellipse
          key={cx}
          cx={cx}
          cy={cy}
          rx="6.5"
          ry="9.5"
          transform={`rotate(${cx < 70 ? -12 : 14} ${cx} ${cy})`}
          style={{ stroke: "var(--bd-line-sage)" }}
        />
      ))}
      <circle cx="142" cy="16" r="5" style={{ stroke: "var(--bd-line)" }} />
    </svg>
  );
}

/** Hoja suelta con nervio. */
function Leaf({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 60 80" aria-hidden="true" className={cn(BASE, className)} {...LINE}>
      <path d="M30 76 C 6 56, 6 22, 30 4 C 54 22, 54 56, 30 76Z" style={{ stroke: "var(--bd-line-sage)" }} />
      <path d="M30 76 L30 20 M30 56 L18 44 M30 44 L42 32" style={{ stroke: "var(--bd-line-sage)" }} />
    </svg>
  );
}

/** Aro doble (alianza) con un brillito. */
function Ring({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 70 70" aria-hidden="true" className={cn(BASE, className)} {...LINE}>
      <circle cx="35" cy="40" r="22" style={{ stroke: "var(--bd-line)" }} />
      <circle cx="35" cy="40" r="16" strokeDasharray="1 5" style={{ stroke: "var(--bd-line)" }} />
      <path d="M35 4 L35 11 M26 7 L29 13 M44 7 L41 13" style={{ stroke: "var(--bd-line)" }} />
    </svg>
  );
}

const HEART = "M0 5 C -8 -1, -5 -8, 0 -3 C 5 -8, 8 -1, 0 5Z";

/** Racimo de corazoncitos y puntos. */
function Hearts({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 80 60" aria-hidden="true" className={cn(BASE, className)} {...LINE}>
      <path d={HEART} transform="translate(20 22) scale(2.2)" style={{ stroke: "var(--bd-line)" }} />
      <path d={HEART} transform="translate(52 14) scale(1.3)" style={{ stroke: "var(--bd-line)" }} />
      <path d={HEART} transform="translate(60 42) scale(1.7)" style={{ stroke: "var(--bd-line)" }} />
      <circle cx="38" cy="46" r="2.2" stroke="none" style={{ fill: "var(--bd-line)" }} />
      <circle cx="10" cy="48" r="1.6" stroke="none" style={{ fill: "var(--bd-line)" }} />
      <circle cx="42" cy="8" r="1.6" stroke="none" style={{ fill: "var(--bd-line)" }} />
    </svg>
  );
}

/** Camino punteado con un corazón al final. */
function Trail({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 160 120" aria-hidden="true" className={cn(BASE, className)} {...LINE} strokeWidth={2}>
      <path
        d="M8 112 C 10 70, 62 86, 80 52 S 118 20, 140 22"
        strokeDasharray="0.5 9"
        style={{ stroke: "var(--bd-line)" }}
      />
      <path d={HEART} transform="translate(146 22) scale(1.1)" strokeWidth={1.5} style={{ stroke: "var(--bd-line)" }} />
    </svg>
  );
}

export function AppBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden print:hidden"
    >
      {/* Manchas */}
      <Blob
        tone="lilac"
        d="M30 96 C 18 40, 74 6, 124 20 C 176 36, 196 90, 164 138 C 132 184, 64 192, 40 150 C 32 136, 32 116, 30 96Z"
        className="-right-24 -top-20 h-72 w-72 sm:-right-32 sm:-top-28 sm:h-[34rem] sm:w-[34rem]"
      />
      <Blob
        tone="sage"
        d="M22 110 C 10 56, 54 14, 108 22 C 164 30, 192 84, 170 132 C 148 178, 84 190, 48 160 C 32 146, 26 128, 22 110Z"
        className="-bottom-28 -left-28 h-80 w-80 sm:-bottom-36 sm:-left-36 sm:h-[32rem] sm:w-[32rem]"
      />
      <Blob
        tone="sage"
        d="M26 100 C 16 50, 66 12, 116 26 C 170 42, 190 96, 156 140 C 124 180, 58 182, 38 140 C 30 126, 28 114, 26 100Z"
        className="-right-24 top-[46%] hidden h-80 w-80 md:block"
      />
      <Blob
        tone="lilac"
        d="M30 96 C 18 40, 74 6, 124 20 C 176 36, 196 90, 164 138 C 132 184, 64 192, 40 150 C 32 136, 32 116, 30 96Z"
        className="-left-20 top-[34%] hidden h-64 w-64 sm:block"
      />

      {/* Líneas */}
      <Sprig className="bottom-24 right-3 h-28 w-20 rotate-12 sm:bottom-16 sm:right-[8%] sm:h-44 sm:w-28" />
      <Twig className="left-[46%] top-[17%] hidden h-20 w-36 sm:block" />
      <Hearts className="right-[27%] top-24 hidden h-14 w-20 sm:block" />
      <Hearts className="bottom-40 left-4 h-9 w-14 -rotate-6 sm:hidden" />
      <Leaf className="bottom-[22%] left-[16%] hidden h-20 w-14 -rotate-[24deg] sm:block" />
      <Leaf className="right-4 top-[42%] h-14 w-10 rotate-[28deg] sm:right-[5%] sm:top-[58%] sm:h-20 sm:w-14" />
      <Ring className="left-[28%] top-[12%] hidden size-16 lg:block" />
      <Ring className="right-5 top-20 size-10 sm:hidden" />
      <Trail className="bottom-6 left-[34%] hidden h-24 w-32 md:block" />
      <Trail className="bottom-20 right-[34%] hidden h-20 w-28 -scale-x-100 xl:block" />
    </div>
  );
}
