import { Watercolor } from "@/components/brand/watercolor";
import { cn } from "@/lib/utils";

// Decoraciones del banner de bienvenida (home sin planes): "empezar a planear
// una boda". Acuarelas (alianzas, eucalipto de hoja redonda, ramita del logo) junto
// a dibujos de trazo fino (sobre, florecillas, camino punteado, confeti de corazones).
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

/** Dos alianzas entrelazadas en acuarela (cabe en ~120x100, como el dibujo anterior). */
export function Rings({ className }: { className?: string; gap?: string }) {
  return <Watercolor name="rings" className={cn(BASE, className)} />;
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

/** Rama de eucalipto de hoja redonda en acuarela (frente a las hojas puntiagudas de la landing). */
export function Eucalyptus({ className }: { className?: string }) {
  return <Watercolor name="branch-eucalyptus-round" className={cn(BASE, "object-contain", className)} />;
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

/**
 * Ramita en acuarela a cada lado del "tubodadiy": tallo salvia, hojitas alternas y un
 * capullo lila que apunta a la palabra. Espejar con -scale-x-100.
 */
export function Flourish({ className }: { className?: string }) {
  return <Watercolor name="sprig-mini" className={cn(BASE, "h-6 w-12 sm:h-7 sm:w-14", className)} />;
}
