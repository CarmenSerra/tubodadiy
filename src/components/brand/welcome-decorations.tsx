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
        fill="#D2D7CB"
      />
      <path
        d="M0 58 C 200 28, 380 32, 560 54 S 900 74, 1200 42 L1200 80 L0 80Z"
        fill="#E5DDEC"
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
        fill="#DECDF1"
      />
    </svg>
  );
}

/** Círculo salvia para la esquina superior derecha. */
export function WelcomeDisc({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={cn(BASE, className)}>
      <circle cx="50" cy="50" r="50" fill="#D2D7CB" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Motivos de línea                                                    */
/* ------------------------------------------------------------------ */

/** Dos alianzas entrelazadas. `gap` debe ser el color del fondo sobre el que se dibujen. */
export function Rings({ className, gap = "#ECE6F4" }: { className?: string; gap?: string }) {
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
      <g stroke="#A38ED2" strokeWidth="1.5">
        <path d="M52 6 L52 13" />
        <path d="M40 10 L44 16" />
        <path d="M64 10 L60 16" />
      </g>
      <circle cx="44" cy="58" r="28" stroke="#927AAC" />
      <circle cx="76" cy="58" r="28" stroke="#4E6A5A" />
      {/* Cruces: arriba pasa la lila por encima, abajo la verde */}
      <path d="M54.03 31.86 A28 28 0 0 1 65.13 39.63" stroke={gap} strokeWidth="6" />
      <path d="M54.03 31.86 A28 28 0 0 1 65.13 39.63" stroke="#927AAC" />
      <path d="M65.97 84.14 A28 28 0 0 1 54.87 76.37" stroke={gap} strokeWidth="6" />
      <path d="M65.97 84.14 A28 28 0 0 1 54.87 76.37" stroke="#4E6A5A" />
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
      <rect x="6" y="12" width="108" height="68" rx="8" fill="#F8F5F0" stroke="#927AAC" />
      <path d="M7 20 L60 54 L113 20" stroke="#927AAC" />
      <path d="M8 78 L47 46" stroke="#927AAC" />
      <path d="M112 78 L73 46" stroke="#927AAC" />
      <g transform="translate(60 54) scale(1.25)">
        <path d={HEART} fill="#D4C0EA" stroke="#A38ED2" strokeWidth="1.4" />
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
          stroke="#A38ED2"
        />
      ))}
      <circle cx="30" cy="30" r="4" stroke="#8FAF8A" />
      <circle cx="30" cy="30" r="1" fill="#8FAF8A" stroke="none" />
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
      stroke="#4E6A5A"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(BASE, className)}
    >
      <path d={`M${STEM[0]} C ${STEM[1]}, ${STEM[2]}, ${STEM[3]}`} />
      {EUCALYPTUS.map((l) => (
        <g key={l.key}>
          <path d={l.stem} />
          <circle cx={l.cx} cy={l.cy} r={l.r} fill="#D2D7CB" />
          <path
            d={`M${f(l.cx - l.r * 0.45)} ${f(l.cy + l.r * 0.2)} Q ${l.cx} ${f(l.cy - l.r * 0.1)} ${f(l.cx + l.r * 0.45)} ${f(l.cy - l.r * 0.2)}`}
            strokeWidth="1"
            opacity="0.7"
          />
        </g>
      ))}
      <circle cx={EUCALYPTUS_TIP.cx} cy={EUCALYPTUS_TIP.cy} r={EUCALYPTUS_TIP.r} fill="#D2D7CB" />
    </svg>
  );
}

/** Camino punteado (el recorrido hasta el gran día), de abajo-izquierda a arriba-derecha. */
export function JourneyPath({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      stroke="#A38ED2"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      className={cn(BASE, className)}
    >
      <path d="M10 152 C 6 104, 66 124, 78 76 S 118 30, 142 30" strokeDasharray="0.5 9" />
      <circle cx="10" cy="153" r="3" fill="#A38ED2" stroke="none" />
      <g transform="translate(144 22)">
        <path d={HEART} fill="#D4C0EA" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

/** Corazoncito suelto (confeti). */
export function Heart({ className, tone = "#A38ED2" }: { className?: string; tone?: string }) {
  return (
    <svg
      viewBox="-9 -9 18 18"
      fill="none"
      stroke={tone}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(BASE, className)}
    >
      <path d={HEART} />
    </svg>
  );
}

/** Punto de confeti. */
export function Dot({ className, tone = "#D4C0EA" }: { className?: string; tone?: string }) {
  return (
    <svg viewBox="0 0 10 10" aria-hidden="true" className={cn(BASE, className)}>
      <circle cx="5" cy="5" r="4" fill={tone} />
    </svg>
  );
}

/**
 * Florituras junto al "tubodadiy" (sustituyen a los destellos de la landing):
 * una voluta fina que remata en un corazón. Espejar con -scale-x-100.
 */
export function Flourish({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 28"
      fill="none"
      stroke="#A38ED2"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(BASE, "h-6 w-10 sm:h-7 sm:w-12", className)}
    >
      <path d="M2 18 C 8 8, 16 8, 20 14 S 30 20, 33 13" />
      <g transform="translate(40 11) scale(0.8)">
        <path d={HEART} fill="#D4C0EA" />
      </g>
    </svg>
  );
}
