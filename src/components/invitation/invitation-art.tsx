import { mix, type InvitationTheme } from "@/components/invitation/invitation-theme";

/**
 * Imagen de arriba de la tarjeta: la foto del lugar o una ilustración, ambas
 * con efecto acuarela. Todo es SVG (filtros `feTurbulence` + `feDisplacementMap`
 * suaves, poca saturación y una máscara de bordes irregulares) y solo se aplica
 * al mostrar: la foto guardada es la original comprimida. Sin estado ni hooks,
 * así que vale para servidor y cliente.
 */

const W = 200;
const H = 100;

const n = (v: number) => Math.round(v * 10) / 10;

function Defs({ theme }: { theme: InvitationTheme }) {
  return (
    <defs>
      {/* Pintura: ondulación suave del trazo, menos color, algo de papel por encima. */}
      <filter id="inv-wc-paint" x="-3%" y="-3%" width="106%" height="106%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="4" result="warp" />
        <feDisplacementMap in="SourceGraphic" in2="warp" scale="3.2" xChannelSelector="R" yChannelSelector="G" result="moved" />
        <feGaussianBlur in="moved" stdDeviation="0.38" result="soft" />
        <feColorMatrix in="soft" type="saturate" values="0.68" result="muted" />
        <feComponentTransfer in="muted" result="light">
          <feFuncR type="linear" slope="0.9" intercept="0.07" />
          <feFuncG type="linear" slope="0.9" intercept="0.07" />
          <feFuncB type="linear" slope="0.9" intercept="0.07" />
        </feComponentTransfer>
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="9" result="grain" />
        <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.4  0 0 0 0 0.35  0 0 0 0.16 0" result="grainTint" />
        <feComposite in="grainTint" in2="light" operator="in" result="grainIn" />
        <feBlend in="grainIn" in2="light" mode="multiply" />
      </filter>
      {/* Borde irregular y difuminado, como una mancha de agua. */}
      <filter id="inv-wc-edge" x="-12%" y="-20%" width="124%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.05 0.07" numOctaves="3" seed="8" result="wobble" />
        <feDisplacementMap in="SourceGraphic" in2="wobble" scale="15" xChannelSelector="R" yChannelSelector="G" result="ragged" />
        <feGaussianBlur in="ragged" stdDeviation="1.7" />
      </filter>
      <filter id="inv-wc-bleed" x="-12%" y="-20%" width="124%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.05 0.07" numOctaves="3" seed="8" result="wobble" />
        <feDisplacementMap in="SourceGraphic" in2="wobble" scale="15" xChannelSelector="R" yChannelSelector="G" result="ragged" />
        <feGaussianBlur in="ragged" stdDeviation="2.6" />
      </filter>
      <mask id="inv-wc-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
        <rect x="11" y="10" width={W - 22} height={H - 20} rx="9" fill="#fff" filter="url(#inv-wc-edge)" />
      </mask>
      <radialGradient id="inv-wc-sun" cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor={theme.primary} stopOpacity="0.85" />
        <stop offset="1" stopColor={theme.primary} stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

/** Ilustración acuarela del paisaje (colinas, árboles y un arco de flores) con los colores de la paleta. */
function Scene({ theme }: { theme: InvitationTheme }) {
  const sky = mix(theme.bg, theme.primary, theme.isDark ? 0.22 : 0.2);
  const far = mix(theme.leaf, theme.bg, 0.55);
  const mid = mix(theme.leaf, theme.bg, 0.25);
  const near = mix(theme.leaf, theme.ink, 0.28);
  const trunk = mix(theme.ink, theme.bg, 0.4);
  const tree = (x: number, y: number, s: number, tone: string) => (
    <g key={`${x}-${y}`} transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-1.1" y="-2" width="2.2" height="9" rx="1" fill={trunk} fillOpacity="0.7" />
      <ellipse cx="0" cy="-9" rx="8" ry="11" fill={tone} fillOpacity="0.92" />
      <ellipse cx="-3" cy="-6" rx="5" ry="7" fill={mix(tone, theme.bg, 0.3)} fillOpacity="0.55" />
    </g>
  );
  const blooms = Array.from({ length: 14 }, (_, i) => {
    const a = Math.PI * (1 - i / 13);
    return (
      <circle
        key={i}
        cx={n(100 + 21 * Math.cos(a))}
        cy={n(66 - 28 * Math.sin(a))}
        r={i % 3 === 0 ? 2.6 : 1.9}
        fill={i % 2 === 0 ? theme.primary : mix(theme.primary, theme.paper, 0.4)}
      />
    );
  });
  return (
    <g filter="url(#inv-wc-paint)">
      <rect width={W} height={H} fill={sky} />
      <circle cx="146" cy="30" r="22" fill="url(#inv-wc-sun)" />
      <path d={`M-10 62 C 30 40, 62 44, 96 58 C 130 44, 170 40, 210 56 V ${H + 10} H-10 Z`} fill={far} fillOpacity="0.85" />
      <path d={`M-10 74 C 24 58, 58 62, 92 72 C 130 60, 168 60, 210 72 V ${H + 10} H-10 Z`} fill={mid} fillOpacity="0.95" />
      {tree(30, 64, 0.95, near)}
      {tree(46, 68, 0.7, mid)}
      {tree(170, 63, 1, near)}
      {tree(156, 69, 0.68, mid)}
      <path
        d="M79 82 V 62 A 21 21 0 0 1 121 62 V 82"
        fill="none"
        stroke={mix(theme.ink, theme.bg, 0.45)}
        strokeOpacity="0.6"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {blooms}
      <path d={`M-10 86 C 30 78, 80 84, 120 86 C 160 80, 190 82, 210 86 V ${H + 10} H-10 Z`} fill={near} fillOpacity="0.9" />
      <ellipse cx="100" cy="90" rx="26" ry="3" fill={theme.paper} fillOpacity="0.5" />
    </g>
  );
}

export type ArtSource = { kind: "photo"; src: string } | { kind: "illustration" };

/**
 * El marco acuarela: la imagen (foto o ilustración) recortada por una máscara de
 * bordes irregulares, sobre una mancha de color de la paleta.
 */
export function WatercolorArt({
  source,
  theme,
  alt,
  className,
}: {
  source: ArtSource;
  theme: InvitationTheme;
  /** Descripción de la foto; la ilustración es decorativa. */
  alt?: string;
  className?: string;
}) {
  const decorative = source.kind !== "photo" || !alt;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : alt}
      aria-hidden={decorative ? true : undefined}
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      <Defs theme={theme} />
      {/* Pigmento que se escurre más allá del borde */}
      <rect
        x="7"
        y="6"
        width={W - 14}
        height={H - 12}
        rx="10"
        fill={theme.primary}
        fillOpacity={theme.isDark ? 0.3 : 0.22}
        filter="url(#inv-wc-bleed)"
      />
      <g mask="url(#inv-wc-mask)">
        {source.kind === "photo" ? (
          <>
            <rect width={W} height={H} fill={mix(theme.bg, theme.primary, 0.2)} />
            <image
              href={source.src}
              x="0"
              y="0"
              width={W}
              height={H}
              preserveAspectRatio="xMidYMid slice"
              filter="url(#inv-wc-paint)"
            />
            {/* Velo de color para que la foto "pertenezca" a la paleta */}
            <rect width={W} height={H} fill={theme.primary} fillOpacity={theme.isDark ? 0.1 : 0.07} />
          </>
        ) : (
          <Scene theme={theme} />
        )}
      </g>
    </svg>
  );
}
