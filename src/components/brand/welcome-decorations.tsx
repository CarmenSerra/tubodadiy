import { cn } from "@/lib/utils";

// Decoraciones del banner de bienvenida (home sin planes): "empezar a planear
// una boda". Trazo fino a mano (1.5-2px, puntas redondas) con alianzas, un
// sobre, florecillas, eucalipto de hoja redonda, un camino punteado y
// confeti de corazones. Distinto de la landing (ramas de hoja puntiaguda).
// Son puramente ornamentales: aria-hidden y pointer-events-none, y el
// contenedor que las use debe ser `relative` (y, para los blobs, overflow-hidden).

const BASE = "pointer-events-none absolute";

// Corazón pequeño centrado en el origen (~13 x 13).
const HEART = "M0 5 C -8 -1, -5 -8, 0 -3 C 5 -8, 8 -1, 0 5Z";

/* ------------------------------------------------------------------ */
/* Blobs                                                               */
/* ------------------------------------------------------------------ */

/** Banda ondulada a lo ancho del borde inferior: salvia detrás, lila delante. */
export function WelcomeWave({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 80"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn(BASE, className)}
    >
      <path
        d="M0 40 C 150 10, 300 10, 450 34 S 750 62, 900 36 S 1100 14, 1200 30 L1200 80 L0 80Z"
        style={{ fill: "var(--deco-sage-soft)" }}
      />
      <path
        d="M0 58 C 200 28, 380 32, 560 54 S 900 74, 1200 42 L1200 80 L0 80Z"
        style={{ fill: "var(--deco-lilac-soft)" }}
      />
    </svg>
  );
}

/** Guijarro lila suave para la esquina superior izquierda (se recorta en el borde). */
export function WelcomePebble({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 170" aria-hidden="true" className={cn(BASE, className)}>
      <path
        d="M20 76 C 8 28, 60 2, 108 12 C 156 24, 184 72, 156 114 C 128 156, 62 166, 32 128 C 22 116, 22 96, 20 76Z"
        style={{ fill: "var(--deco-lilac)" }}
      />
    </svg>
  );
}

/** Círculo salvia para la esquina superior derecha. */
export function WelcomeDisc({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={cn(BASE, className)}>
      <circle cx="50" cy="50" r="50" style={{ fill: "var(--deco-sage-soft)" }} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Motivos de línea                                                    */
/* ------------------------------------------------------------------ */

/** Dos alianzas entrelazadas. `gap` debe ser el color del fondo sobre el que se dibujen. */
export function Rings({ className, gap = "var(--lilac-soft)" }: { className?: string; gap?: string }) {
  return (
    <svg
      viewBox="0 0 120 100"
      fill="none"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(BASE, className)}
    >
      {/* Brillo sobre las alianzas */}
      <g strokeWidth="1.5" style={{ stroke: "var(--deco-line-bright)" }}>
        <path d="M52 6 L52 13" />
        <path d="M40 10 L44 16" />
        <path d="M64 10 L60 16" />
      </g>
      <circle cx="44" cy="58" r="28" style={{ stroke: "var(--deco-line)" }} />
      <circle cx="76" cy="58" r="28" style={{ stroke: "var(--deco-green)" }} />
      {/* Cruces: arriba pasa la lila por encima, abajo la verde */}
      <path d="M54.03 31.86 A28 28 0 0 1 65.13 39.63" strokeWidth="6" style={{ stroke: gap }} />
      <path d="M54.03 31.86 A28 28 0 0 1 65.13 39.63" style={{ stroke: "var(--deco-line)" }} />
      <path d="M65.97 84.14 A28 28 0 0 1 54.87 76.37" strokeWidth="6" style={{ stroke: gap }} />
      <path d="M65.97 84.14 A28 28 0 0 1 54.87 76.37" style={{ stroke: "var(--deco-green)" }} />
    </svg>
  );
}

/** Sobre cerrado con sello de corazón (la invitación). */
export function Envelope({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 90"
      fill="none"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(BASE, className)}
    >
      <rect x="6" y="12" width="108" height="68" rx="8" style={{ fill: "var(--surface-alt)", stroke: "var(--deco-line)" }} />
      <path d="M7 20 L60 54 L113 20" style={{ stroke: "var(--deco-line)" }} />
      <path d="M8 78 L47 46" style={{ stroke: "var(--deco-line)" }} />
      <path d="M112 78 L73 46" style={{ stroke: "var(--deco-line)" }} />
      <g transform="translate(60 54) scale(1.25)">
        <path d={HEART} strokeWidth="1.4" style={{ fill: "var(--deco-heart)", stroke: "var(--deco-line-bright)" }} />
      </g>
    </svg>
  );
}

/** Florecilla de cinco pétalos. */
export function Floret({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 60"
      fill="none"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(BASE, className)}
    >
      {[0, 72, 144, 216, 288].map((r) => (
        <path
          key={r}
          d="M0 -5 C -10 -11, -9 -25, 0 -27 C 9 -25, 10 -11, 0 -5Z"
          transform={`translate(30 30) rotate(${r})`}
          style={{ stroke: "var(--deco-line-bright)" }}
        />
      ))}
      <circle cx="30" cy="30" r="4" style={{ stroke: "var(--deco-sage-line)" }} />
      <circle cx="30" cy="30" r="1" stroke="none" style={{ fill: "var(--deco-sage-line)" }} />
    </svg>
  );
}

// Tallo del eucalipto: curva de Bézier cúbica y hojas redondas alternas.
const STEM: [number, number][] = [
  [22, 176],
  [28, 124],
  [54, 76],
  [92, 16],
];

function stemAt(t: number) {
  const [p0, p1, p2, p3] = STEM;
  const u = 1 - t;
  const x = u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0];
  const y = u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1];
  const dx =
    3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
  const dy =
    3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
  const len = Math.hypot(dx, dy);
  return { x, y, tx: dx / len, ty: dy / len };
}

const f = (n: number) => Number(n.toFixed(1));

// [t sobre el tallo, lado (+1/-1), radio de la hoja]
const EUCALYPTUS_LEAVES: [number, 1 | -1, number][] = [
  [0.14, -1, 10],
  [0.27, 1, 10],
  [0.4, -1, 9],
  [0.53, 1, 9],
  [0.66, -1, 8],
  [0.79, 1, 7.5],
  [0.9, -1, 6.5],
].map(([t, s, r]) => [t, s, r] as [number, 1 | -1, number]);

const EUCALYPTUS = EUCALYPTUS_LEAVES.map(([t, side, r]) => {
  const { x, y, tx, ty } = stemAt(t);
  const nx = -ty * side;
  const ny = tx * side;
  const petiole = 5;
  return {
    key: t,
    r,
    stem: `M${f(x)} ${f(y)} L${f(x + nx * petiole)} ${f(y + ny * petiole)}`,
    cx: f(x + nx * (petiole + r)),
    cy: f(y + ny * (petiole + r)),
  };
});

const EUCALYPTUS_TIP = (() => {
  const { x, y, tx, ty } = stemAt(1);
  return { cx: f(x + tx * 6), cy: f(y + ty * 6), r: 5.5 };
})();

/** Ramita de eucalipto con hojas redondas (frente a las hojas puntiagudas de la landing). */
export function Eucalyptus({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 190"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(BASE, className)}
      style={{ stroke: "var(--deco-green)" }}
    >
      <path d={`M${STEM[0]} C ${STEM[1]}, ${STEM[2]}, ${STEM[3]}`} />
      {EUCALYPTUS.map((l) => (
        <g key={l.key}>
          <path d={l.stem} />
          <circle cx={l.cx} cy={l.cy} r={l.r} style={{ fill: "var(--deco-sage-soft)" }} />
          <path
            d={`M${f(l.cx - l.r * 0.45)} ${f(l.cy + l.r * 0.2)} Q ${l.cx} ${f(l.cy - l.r * 0.1)} ${f(l.cx + l.r * 0.45)} ${f(l.cy - l.r * 0.2)}`}
            strokeWidth="1"
            opacity="0.7"
          />
        </g>
      ))}
      <circle cx={EUCALYPTUS_TIP.cx} cy={EUCALYPTUS_TIP.cy} r={EUCALYPTUS_TIP.r} style={{ fill: "var(--deco-sage-soft)" }} />
    </svg>
  );
}

/** Camino punteado (el recorrido hasta el gran día), de abajo-izquierda a arriba-derecha. */
export function JourneyPath({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      className={cn(BASE, className)}
      style={{ stroke: "var(--deco-line-bright)" }}
    >
      <path d="M10 152 C 6 104, 66 124, 78 76 S 118 30, 142 30" strokeDasharray="0.5 9" />
      <circle cx="10" cy="153" r="3" stroke="none" style={{ fill: "var(--deco-line-bright)" }} />
      <g transform="translate(144 22)">
        <path d={HEART} strokeWidth="1.5" style={{ fill: "var(--deco-heart)" }} />
      </g>
    </svg>
  );
}

/** Corazoncito suelto (confeti). */
export function Heart({ className, tone = "var(--deco-line-bright)" }: { className?: string; tone?: string }) {
  return (
    <svg
      viewBox="-9 -9 18 18"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(BASE, className)}
      style={{ stroke: tone }}
    >
      <path d={HEART} />
    </svg>
  );
}

/** Punto de confeti. */
export function Dot({ className, tone = "var(--deco-heart)" }: { className?: string; tone?: string }) {
  return (
    <svg viewBox="0 0 10 10" aria-hidden="true" className={cn(BASE, className)}>
      <circle cx="5" cy="5" r="4" style={{ fill: tone }} />
    </svg>
  );
}

// Ramita del "tubodadiy": tallo fino que sube hacia la palabra, hojitas
// redondeadas alternas (de mayor a menor) y un capullo lila en la punta.
const SPRIG_STEM: [number, number][] = [
  [2, 21],
  [15, 24],
  [28, 20],
  [42, 12],
];

// [t sobre el tallo, lado (+1 arriba / -1 abajo), largo de la hoja]
const SPRIG_LEAVES: [number, 1 | -1, number][] = [
  [0.2, 1, 7],
  [0.36, -1, 7],
  [0.52, 1, 6.4],
  [0.68, -1, 5.6],
  [0.82, 1, 4.8],
];

// Punto y ángulo (grados) del tallo en t; el tallo avanza hacia la punta.
function sprigAt(t: number) {
  const [p0, p1, p2, p3] = SPRIG_STEM;
  const u = 1 - t;
  const at = (i: 0 | 1) =>
    u ** 3 * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t ** 3 * p3[i];
  const d = (i: 0 | 1) =>
    3 * u * u * (p1[i] - p0[i]) + 6 * u * t * (p2[i] - p1[i]) + 3 * t * t * (p3[i] - p2[i]);
  return { x: f(at(0)), y: f(at(1)), angle: (Math.atan2(d(1), d(0)) * 180) / Math.PI };
}

const SPRIG_LEAF_SHAPES = SPRIG_LEAVES.map(([t, side, len]) => {
  const { x, y, angle } = sprigAt(t);
  return { key: t, len, ry: f(len * 0.32), x, y, angle: f(angle - side * 48) };
});

const SPRIG_BUD_ANGLE = f(sprigAt(1).angle - 8);

/**
 * Ramita fina a cada lado del "tubodadiy" (sustituye a los destellos de la
 * landing): tallo salvia, cinco hojitas redondeadas y un capullo lila que
 * apunta a la palabra. Espejar con -scale-x-100.
 */
export function Flourish({ className }: { className?: string }) {
  const [, , , tip] = SPRIG_STEM;
  return (
    <svg
      viewBox="0 0 56 28"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(BASE, "h-6 w-12 sm:h-7 sm:w-14", className)}
    >
      <path
        d={`M${SPRIG_STEM[0]} C ${SPRIG_STEM[1]}, ${SPRIG_STEM[2]}, ${SPRIG_STEM[3]}`}
        strokeWidth="1.25"
        style={{ stroke: "var(--deco-sage-line)" }}
      />
      {SPRIG_LEAF_SHAPES.map((l) => (
        <ellipse
          key={l.key}
          cx={l.len / 2}
          cy="0"
          rx={l.len / 2}
          ry={l.ry}
          transform={`translate(${l.x} ${l.y}) rotate(${l.angle})`}
          style={{ fill: "var(--deco-sage)" }}
        />
      ))}
      <path
        d="M0 0 C 0.6 -2.6, 5 -3, 7.5 0 C 5 3, 0.6 2.6, 0 0Z"
        transform={`translate(${tip[0]} ${tip[1]}) rotate(${SPRIG_BUD_ANGLE})`}
        strokeWidth="1.1"
        style={{ fill: "var(--deco-heart)", stroke: "var(--deco-line-bright)" }}
      />
    </svg>
  );
}
