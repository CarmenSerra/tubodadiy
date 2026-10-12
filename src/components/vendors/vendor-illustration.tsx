import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Ilustración determinista para proveedores sin foto: mismo `seed` → mismo dibujo.
 * Una escena suave (cielo, colinas, suelo) con un motivo según el tipo de lugar o
 * categoría. Solo formas SVG con tokens de color de la app (lila, salvia, crema),
 * así que se adapta al tema claro y al oscuro sin imágenes ni peticiones.
 */

type Motif =
  | "finca"
  | "restaurante"
  | "hotel"
  | "iglesia"
  | "camara"
  | "musica"
  | "flores"
  | "pastel"
  | "coche"
  | "generico";

/** Reglas por orden de prioridad sobre el tipo normalizado (sin tildes, con espacios). */
const MOTIF_RULES: [Motif, RegExp][] = [
  ["iglesia", /church|iglesia|ceremon|worship|chapel|capilla|ermita|catedral|basilica|monasterio|place of worship/],
  ["camara", /fotogra|photo|video|camara|camera|film|cine/],
  ["musica", /music|musica|\bdj\b|band|orquesta|grupo|night club|sonido|coro/],
  ["pastel", /pastel|cake|bakery|tarta|reposter|dessert|confiter|candy|dulce/],
  ["flores", /flor|florist|flower|ramo|bouquet|decora/],
  ["coche", /transport|coche|\bcar\b|taxi|limusina|\bbus\b|autobus|vehicle/],
  ["hotel", /hotel|lodging|resort|hostal|alojamiento|\bspa\b|\binn\b|guest house|apartamento/],
  ["restaurante", /restaur|catering|food|cafe|\bbar\b|meal|comida|banquete|bistro|bodega|winery|cocina/],
  ["finca", /finca|venue|wedding|event|farm|garden|jardin|hacienda|masia|cortijo|park|campground|pazo|castillo|palacio|lugar|salon/],
];

function motifFor(kind: string | undefined): Motif {
  if (!kind) return "generico";
  const normalized = kind
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[_/-]+/g, " ")
    .trim();
  for (const [motif, rule] of MOTIF_RULES) {
    if (rule.test(normalized)) return motif;
  }
  return "generico";
}

/** FNV-1a de 32 bits: barato y suficiente para repartir variaciones. */
function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** mulberry32: generador pseudoaleatorio con semilla. */
function makeRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Random = () => number;

const range = (rand: Random, min: number, max: number) => min + rand() * (max - min);
const pick = <T,>(rand: Random, items: T[]): T => items[Math.floor(rand() * items.length) % items.length];
const round = (n: number) => Math.round(n * 10) / 10;

// Tokens de color (definidos en globals.css para claro y oscuro).
const C = {
  lilacFlat: "var(--lilac-flat)",
  lilacMid: "var(--lilac-mid)",
  lilac: "var(--lilac)",
  lilacBright: "var(--lilac-bright)",
  sagePale: "var(--sage-pale)",
  sageLight: "var(--sage-light)",
  sage: "var(--sage)",
  green: "var(--green)",
  raised: "var(--raised)",
};

const GROUND = 232; // línea de suelo donde se apoya el motivo
const STROKE = 2.5;

/* ------------------------------------------------------------------ */
/* Piezas sueltas                                                      */
/* ------------------------------------------------------------------ */

function Hill({ y, amp, seed, fill, opacity }: { y: number; amp: number; seed: number; fill: string; opacity: number }) {
  const rand = makeRandom(seed);
  const a = range(rand, -amp, amp);
  const b = range(rand, -amp, amp);
  const c = range(rand, -amp * 0.6, amp * 0.6);
  const d = `M0 ${round(y + c)} Q100 ${round(y - 28 + a)} 200 ${round(y + b)} T400 ${round(y - c)} V300 H0Z`;
  return <path d={d} fill={fill} opacity={opacity} />;
}

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${round(x)} ${round(y)}) scale(${round(s)})`} fill={C.raised} opacity={0.75}>
      <rect x={-26} y={-6} width={52} height={12} rx={6} />
      <circle cx={-6} cy={-8} r={9} />
      <circle cx={9} cy={-5} r={7} />
    </g>
  );
}

function Cypress({ x, h = 62, w = 13 }: { x: number; h?: number; w?: number }) {
  return (
    <g transform={`translate(${round(x)} ${GROUND})`}>
      <path
        d={`M0 ${-h} C${w * 1.5} ${-h * 0.6} ${w} ${-h * 0.1} 0 0 C${-w} ${-h * 0.1} ${-w * 1.5} ${-h * 0.6} 0 ${-h}Z`}
        fill={C.sage}
        stroke={C.green}
        strokeWidth={STROKE}
      />
    </g>
  );
}

function RoundTree({ x, s = 1 }: { x: number; s?: number }) {
  return (
    <g transform={`translate(${round(x)} ${GROUND}) scale(${round(s)})`}>
      <path d="M0 0V-26" stroke={C.green} strokeWidth={STROKE} fill="none" />
      <circle cx={0} cy={-42} r={20} fill={C.sage} stroke={C.green} strokeWidth={STROKE} />
      <path d="M0 -22 L-9 -30 M0 -26 L8 -34" stroke={C.green} strokeWidth={1.6} fill="none" opacity={0.7} />
    </g>
  );
}

function Flower({ cx, cy, r, fill, center = C.raised }: { cx: number; cy: number; r: number; fill: string; center?: string }) {
  const petals = [0, 72, 144, 216, 288].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return (
      <circle
        key={deg}
        cx={round(cx + Math.cos(rad) * r * 0.62)}
        cy={round(cy + Math.sin(rad) * r * 0.62)}
        r={round(r * 0.5)}
        fill={fill}
        stroke={C.green}
        strokeWidth={1.8}
      />
    );
  });
  return (
    <g>
      {petals}
      <circle cx={cx} cy={cy} r={round(r * 0.34)} fill={center} stroke={C.green} strokeWidth={1.8} />
    </g>
  );
}

function Heart({ x, y, s, fill, opacity = 1 }: { x: number; y: number; s: number; fill: string; opacity?: number }) {
  return (
    <path
      transform={`translate(${round(x)} ${round(y)}) scale(${round(s)})`}
      d="M0 8C-14 -2 -12 -14 -4 -14C-1 -14 0 -11 0 -10C0 -11 1 -14 4 -14C12 -14 14 -2 0 8Z"
      fill={fill}
      opacity={opacity}
    />
  );
}

function Sparkle({ x, y, s, fill }: { x: number; y: number; s: number; fill: string }) {
  return (
    <path
      transform={`translate(${round(x)} ${round(y)}) scale(${round(s)})`}
      d="M0 -8C1 -3 3 -1 8 0C3 1 1 3 0 8C-1 3 -3 1 -8 0C-3 -1 -1 -3 0 -8Z"
      fill={fill}
      opacity={0.8}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Motivos (origen: centro del suelo; se dibujan hacia arriba)         */
/* ------------------------------------------------------------------ */

function FincaMotif({ seed }: { seed: number }) {
  const rand = makeRandom(seed);
  const variant = rand() < 0.5 ? "casa" : "arco";
  const lit = pick(rand, [C.lilacMid, C.lilacBright, C.sagePale]);
  if (variant === "casa") {
    const window = (x: number) => (
      <path
        key={x}
        d={`M${x - 7} -20V-30a7 7 0 0 1 14 0V-20Z`}
        fill={C.sagePale}
        stroke={C.green}
        strokeWidth={2}
      />
    );
    return (
      <g stroke={C.green} strokeWidth={STROKE}>
        <path d="M-72 0V-54H72V0Z" fill={C.raised} />
        <path d="M-84 -54L0 -98L84 -54Z" fill={lit} opacity={0.95} />
        <path d="M-14 0V-24a14 14 0 0 1 28 0V0Z" fill={C.sagePale} />
        {window(-46)}
        {window(46)}
        <path d="M-72 -54H72" />
      </g>
    );
  }
  // Arco de jardín cubierto de flores
  const dots: React.ReactNode[] = [];
  for (let i = 0; i < 11; i += 1) {
    const angle = Math.PI * (i / 10);
    const px = -Math.cos(angle) * 40;
    const py = -76 - Math.sin(angle) * 40;
    dots.push(
      <circle
        key={i}
        cx={round(px + range(rand, -3, 3))}
        cy={round(py + range(rand, -3, 3))}
        r={round(range(rand, 4.5, 7))}
        fill={pick(rand, [C.lilacBright, C.lilacMid, C.raised, C.lilac])}
        stroke={C.green}
        strokeWidth={1.6}
      />
    );
  }
  return (
    <g>
      <path d="M-40 0V-76a40 40 0 0 1 80 0V0" fill="none" stroke={C.green} strokeWidth={STROKE} />
      <path d="M-34 0V-76a34 34 0 0 1 68 0V0" fill="none" stroke={C.green} strokeWidth={1.4} opacity={0.5} />
      {dots}
      <path d="M-70 0H70" stroke={C.green} strokeWidth={STROKE} />
      <path d="M-30 0L-24 -8M30 0L24 -8M-14 0V-6M14 0V-6M0 0V-8" stroke={C.green} strokeWidth={1.6} fill="none" />
    </g>
  );
}

function RestauranteMotif({ seed }: { seed: number }) {
  const rand = makeRandom(seed);
  const bulbs: React.ReactNode[] = [];
  for (let i = 0; i <= 6; i += 1) {
    const t = i / 6;
    bulbs.push(
      <circle
        key={i}
        cx={round(-150 + t * 300)}
        cy={round(-122 + Math.sin(t * Math.PI) * 26 + 6)}
        r={4.5}
        fill={pick(rand, [C.lilacBright, C.raised])}
        stroke={C.green}
        strokeWidth={1.6}
      />
    );
  }
  return (
    <g>
      <path d="M-150 -122Q0 -66 150 -122" fill="none" stroke={C.green} strokeWidth={1.6} />
      {bulbs}
      <g stroke={C.green} strokeWidth={STROKE}>
        <path d="M-74 -44L-84 0H84L74 -44Z" fill={C.raised} />
        <path d="M-82 -44H82" fill="none" />
        <path d="M-84 -14H84" fill="none" opacity={0.45} />
        {/* campana */}
        <path d="M-32 -44a32 32 0 0 1 64 0Z" fill={C.lilacMid} />
        <circle cx={0} cy={-80} r={5} fill={C.raised} />
        {/* copa */}
        <path d="M52 -44V-56M44 -44H60M44 -86h16c0 14-4 24-8 28c-4-4-8-14-8-28Z" fill={C.raised} />
        {/* vela */}
        <rect x={-62} y={-64} width={8} height={20} rx={2} fill={C.raised} />
        <path d="M-58 -72c-4 4-4 6 0 8c4-2 4-4 0-8Z" fill={C.lilacBright} strokeWidth={1.6} />
      </g>
    </g>
  );
}

function HotelMotif({ seed }: { seed: number }) {
  const rand = makeRandom(seed);
  const windows: React.ReactNode[] = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const x = -34 + col * 34;
      const y = -112 + row * 30;
      const on = rand() < 0.4;
      windows.push(
        <path
          key={`${row}-${col}`}
          d={`M${x - 8} ${y + 20}V${y + 6}a8 8 0 0 1 16 0V${y + 20}Z`}
          fill={on ? C.lilacBright : C.sagePale}
          opacity={on ? 0.9 : 1}
          stroke={C.green}
          strokeWidth={2}
        />
      );
    }
  }
  return (
    <g stroke={C.green} strokeWidth={STROKE}>
      <path d="M-64 0V-126H64V0Z" fill={C.raised} />
      <path d="M-72 -126H72" />
      <path d="M-20 -150H20V-126H-20Z" fill={C.lilacMid} />
      <path d="M-8 -140H8" strokeWidth={2} />
      {windows}
      <path d="M-16 0V-20a16 16 0 0 1 32 0V0Z" fill={C.sage} />
      <path d="M-26 -30H26V-26Q0 -18 -26 -26Z" fill={C.lilacMid} strokeWidth={2} />
    </g>
  );
}

function IglesiaMotif() {
  return (
    <g stroke={C.green} strokeWidth={STROKE}>
      {/* nave */}
      <path d="M-82 0V-44H18V0Z" fill={C.raised} />
      <path d="M-90 -44L-32 -78L26 -44Z" fill={C.lilacMid} />
      {/* torre */}
      <path d="M18 0V-96H62V0Z" fill={C.raised} />
      <path d="M12 -96L40 -142L68 -96Z" fill={C.lilac} opacity={0.9} />
      <path d="M40 -142V-160M33 -152H47" fill="none" />
      <path d="M32 -70V-82a8 8 0 0 1 16 0V-70Z" fill={C.sagePale} strokeWidth={2} />
      {/* puerta, ventanas y rosetón */}
      <path d="M-44 0V-14a12 12 0 0 1 24 0V0Z" fill={C.sagePale} />
      <path d="M-72 0V-14a6 6 0 0 1 12 0V0Z" fill={C.sagePale} strokeWidth={2} />
      <path d="M-4 0V-14a6 6 0 0 1 12 0V0Z" fill={C.sagePale} strokeWidth={2} />
      <circle cx={-32} cy={-56} r={8} fill={C.lilacBright} opacity={0.85} strokeWidth={2} />
    </g>
  );
}

function CamaraMotif({ seed }: { seed: number }) {
  const rand = makeRandom(seed);
  const accent = pick(rand, [C.lilacMid, C.sagePale, C.lilac]);
  return (
    <g stroke={C.green} strokeWidth={STROKE} transform="translate(0 -4)">
      <path d="M-28 -98L-20 -112H20L28 -98Z" fill={C.raised} />
      <rect x={-76} y={-100} width={152} height={92} rx={16} fill={C.raised} />
      <path d="M-76 -76H76" fill="none" strokeWidth={2} opacity={0.5} />
      <rect x={-62} y={-92} width={20} height={9} rx={3} fill={accent} strokeWidth={2} />
      <circle cx={0} cy={-54} r={32} fill={accent} />
      <circle cx={0} cy={-54} r={22} fill={C.raised} />
      <circle cx={0} cy={-54} r={11} fill={C.sagePale} strokeWidth={2} />
      <circle cx={-5} cy={-59} r={3} fill={C.raised} stroke="none" />
      <circle cx={58} cy={-86} r={4} fill={C.lilacBright} strokeWidth={1.8} />
    </g>
  );
}

function MusicaMotif({ seed }: { seed: number }) {
  const rand = makeRandom(seed);
  const lines = [0, 1, 2, 3, 4].map((i) => (
    <path
      key={i}
      d={`M-150 ${-86 + i * 14}Q-60 ${-96 + i * 14 + range(rand, -2, 2)} 0 ${-86 + i * 14}T150 ${-86 + i * 14}`}
      fill="none"
      stroke={C.green}
      strokeWidth={1.4}
      opacity={0.5}
    />
  ));
  return (
    <g>
      {lines}
      <g stroke={C.green} strokeWidth={STROKE} strokeLinejoin="round">
        {/* corcheas unidas */}
        <ellipse cx={-26} cy={-18} rx={17} ry={12} transform="rotate(-18 -26 -18)" fill={C.lilacMid} />
        <ellipse cx={42} cy={-34} rx={17} ry={12} transform="rotate(-18 42 -34)" fill={C.lilacMid} />
        <path d="M-12 -22V-118L56 -138V-38" fill="none" />
        <path d="M-12 -98L56 -118V-138L-12 -118Z" fill={C.green} />
        {/* nota suelta */}
        <ellipse cx={-98} cy={-8} rx={10} ry={7} transform="rotate(-18 -98 -8)" fill={C.sage} />
        <path d="M-90 -11V-58q10 4 14 16" fill="none" />
      </g>
    </g>
  );
}

function FloresMotif({ seed }: { seed: number }) {
  const rand = makeRandom(seed);
  const colors = [C.lilacBright, C.lilacMid, C.raised, C.lilac];
  const heads = [
    { cx: -34, cy: -104, r: 20 },
    { cx: 20, cy: -122, r: 24 },
    { cx: 54, cy: -86, r: 18 },
    { cx: -8, cy: -80, r: 16 },
  ].map((h, i) => ({ ...h, fill: colors[(i + Math.floor(rand() * 4)) % colors.length] }));
  return (
    <g>
      <g stroke={C.green} strokeWidth={STROKE} fill="none">
        <path d="M-34 -84Q-24 -40 -4 -14" />
        <path d="M20 -98Q12 -50 -2 -14" />
        <path d="M54 -68Q36 -34 4 -14" />
        <path d="M-8 -64Q-4 -38 0 -14" />
      </g>
      <path d="M-38 -44C-62 -50 -70 -66 -64 -78C-46 -76 -38 -62 -38 -44Z" fill={C.sage} stroke={C.green} strokeWidth={STROKE} />
      <path d="M40 -42C64 -46 74 -62 70 -74C52 -74 42 -60 40 -42Z" fill={C.sage} stroke={C.green} strokeWidth={STROKE} />
      {heads.map((h) => (
        <Flower key={`${h.cx}`} cx={h.cx} cy={h.cy} r={h.r} fill={h.fill} />
      ))}
      <g stroke={C.green} strokeWidth={STROKE} strokeLinejoin="round">
        <path d="M0 -20L-24 -2L-20 -18Z" fill={C.lilacMid} />
        <path d="M0 -20L24 -2L20 -18Z" fill={C.lilacMid} />
        <circle cx={0} cy={-16} r={6} fill={C.lilac} />
      </g>
    </g>
  );
}

function PastelMotif({ seed }: { seed: number }) {
  const rand = makeRandom(seed);
  const icing = pick(rand, [C.lilacMid, C.lilacBright, C.sagePale]);
  const tiers = [
    { w: 120, y: -30, h: 30 },
    { w: 88, y: -64, h: 34 },
    { w: 56, y: -94, h: 30 },
  ];
  return (
    <g stroke={C.green} strokeWidth={STROKE} strokeLinejoin="round">
      <path d="M-100 0Q0 12 100 0" fill="none" opacity={0.5} />
      {tiers.map((t, i) => (
        <g key={t.w}>
          <rect x={-t.w / 2} y={t.y} width={t.w} height={t.h} rx={6} fill={C.raised} />
          <path
            d={`M${-t.w / 2} ${t.y + 6}h${t.w}`}
            fill="none"
            strokeWidth={0}
          />
          <path
            d={`M${-t.w / 2} ${t.y + 4}q${t.w / 12} 12 ${t.w / 6} 0q${t.w / 12} 14 ${t.w / 6} 0q${t.w / 12} 12 ${t.w / 6} 0q${t.w / 12} 14 ${t.w / 6} 0q${t.w / 12} 12 ${t.w / 6} 0q${t.w / 12} 14 ${t.w / 6} 0V${t.y + 4}Z`}
            fill={icing}
            opacity={i % 2 === 0 ? 1 : 0.8}
          />
        </g>
      ))}
      <path d="M-76 0H76" />
      <path d="M0 -94V-112" fill="none" />
      <Heart x={0} y={-118} s={1.5} fill={C.lilac} />
      <circle cx={-26} cy={-14} r={3} fill={C.lilacBright} strokeWidth={1.4} />
      <circle cx={0} cy={-12} r={3} fill={C.lilacBright} strokeWidth={1.4} />
      <circle cx={26} cy={-14} r={3} fill={C.lilacBright} strokeWidth={1.4} />
    </g>
  );
}

function CocheMotif({ seed }: { seed: number }) {
  const rand = makeRandom(seed);
  const body = pick(rand, [C.lilacMid, C.raised, C.sagePale]);
  return (
    <g stroke={C.green} strokeWidth={STROKE} strokeLinejoin="round">
      <path d="M-84 -14V-30Q-80 -38 -62 -40L-42 -66Q-38 -72 -28 -72H34Q44 -72 50 -64L66 -40Q82 -38 84 -28V-14Z" fill={body} />
      <path d="M-34 -42L-24 -62H-2V-42ZM6 -42V-62H32L46 -42Z" fill={C.sagePale} strokeWidth={2} />
      <circle cx={-48} cy={-12} r={15} fill={C.raised} />
      <circle cx={48} cy={-12} r={15} fill={C.raised} />
      <circle cx={-48} cy={-12} r={5} fill={C.green} stroke="none" />
      <circle cx={48} cy={-12} r={5} fill={C.green} stroke="none" />
      <Heart x={0} y={-24} s={0.9} fill={C.lilac} />
    </g>
  );
}

function GenericoMotif() {
  return (
    <g>
      <Heart x={0} y={-72} s={4.6} fill={C.lilacMid} />
      <path
        transform="translate(0 -72) scale(4.6)"
        d="M0 8C-14 -2 -12 -14 -4 -14C-1 -14 0 -11 0 -10C0 -11 1 -14 4 -14C12 -14 14 -2 0 8Z"
        fill="none"
        stroke={C.green}
        strokeWidth={0.55}
        strokeLinejoin="round"
      />
      <circle cx={-16} cy={-26} r={20} fill="none" stroke={C.green} strokeWidth={STROKE + 1} />
      <circle cx={16} cy={-26} r={20} fill="none" stroke={C.lilac} strokeWidth={STROKE + 1} />
      <path d="M-6 -44L0 -52L6 -44L0 -40Z" fill={C.raised} stroke={C.green} strokeWidth={1.6} transform="translate(0 -6)" />
    </g>
  );
}

function renderMotif(motif: Motif, seed: number): React.ReactNode {
  switch (motif) {
    case "finca":
      return <FincaMotif seed={seed} />;
    case "restaurante":
      return <RestauranteMotif seed={seed} />;
    case "hotel":
      return <HotelMotif seed={seed} />;
    case "iglesia":
      return <IglesiaMotif />;
    case "camara":
      return <CamaraMotif seed={seed} />;
    case "musica":
      return <MusicaMotif seed={seed} />;
    case "flores":
      return <FloresMotif seed={seed} />;
    case "pastel":
      return <PastelMotif seed={seed} />;
    case "coche":
      return <CocheMotif seed={seed} />;
    default:
      return <GenericoMotif />;
  }
}

/* ------------------------------------------------------------------ */
/* Escena                                                              */
/* ------------------------------------------------------------------ */

/**
 * SVG decorativo (aria-hidden) que rellena su contenedor (`slice`). Pensado para
 * un marco 4:3, pero se recorta bien en cualquier proporción.
 */
export function VendorIllustration({
  seed,
  kind,
  className,
}: {
  seed: string;
  kind?: string;
  className?: string;
}) {
  const scene = React.useMemo(() => {
    const motif = motifFor(kind);
    const rand = makeRandom(hashString(`${seed}|${motif}`));
    const tone = Math.floor(rand() * 3);
    const bg = [C.lilacFlat, C.sagePale, C.lilacMid][tone];
    const farHill = tone === 1 ? C.lilacMid : C.sageLight;
    const sunX = range(rand, 60, 340);
    const sunY = range(rand, 44, 86);
    const sunR = range(rand, 16, 26);
    const hasSun = rand() < 0.8;
    const clouds = [
      { x: range(rand, 40, 150), y: range(rand, 40, 78), s: range(rand, 0.8, 1.3) },
      { x: range(rand, 240, 360), y: range(rand, 56, 100), s: range(rand, 0.7, 1.1) },
    ];
    const dx = range(rand, -26, 26);
    const scale = range(rand, 0.94, 1.08);
    const flip = rand() < 0.5 ? -1 : 1;
    const farSeed = hashString(`${seed}|far`);
    const nearSeed = hashString(`${seed}|near`);
    const motifSeed = hashString(`${seed}|motif`);
    const sparkles = Array.from({ length: 4 }, () => ({
      x: range(rand, 24, 376),
      y: range(rand, 24, 130),
      s: range(rand, 0.5, 1),
      heart: rand() < 0.45,
    }));
    // Árboles laterales: los de las fincas y los lugares son más protagonistas.
    const treeCount = motif === "finca" ? 2 : 1;
    const sides = Array.from({ length: treeCount * 2 }, (_, i) => ({
      x: i % 2 === 0 ? range(rand, 24, 78) : range(rand, 322, 376),
      round: rand() < 0.5,
      s: range(rand, 0.8, 1.15),
      h: range(rand, 52, 78),
    }));
    return {
      motif,
      bg,
      farHill,
      sun: hasSun ? { x: sunX, y: sunY, r: sunR } : null,
      clouds,
      dx,
      scale,
      flip,
      farSeed,
      nearSeed,
      motifSeed,
      sparkles,
      sides,
    };
  }, [seed, kind]);

  const showSideTrees = scene.motif !== "camara" && scene.motif !== "musica" && scene.motif !== "pastel";

  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className={cn("block h-full w-full", className)}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width={400} height={300} fill={scene.bg} />
      {scene.sun && <circle cx={round(scene.sun.x)} cy={round(scene.sun.y)} r={round(scene.sun.r)} fill={C.lilacBright} opacity={0.4} />}
      {scene.clouds.map((c, i) => (
        <Cloud key={i} x={c.x} y={c.y} s={c.s} />
      ))}
      {scene.sparkles.map((s, i) =>
        s.heart ? (
          <Heart key={i} x={s.x} y={s.y} s={s.s * 0.9} fill={C.lilac} opacity={0.55} />
        ) : (
          <Sparkle key={i} x={s.x} y={s.y} s={s.s} fill={C.raised} />
        )
      )}
      <Hill y={196} amp={22} seed={scene.farSeed} fill={scene.farHill} opacity={0.7} />
      <Hill y={218} amp={14} seed={scene.nearSeed} fill={C.sage} opacity={0.5} />
      <rect y={GROUND} width={400} height={300 - GROUND} fill={C.sage} opacity={0.5} />
      {showSideTrees &&
        scene.sides.map((t, i) =>
          t.round ? <RoundTree key={i} x={t.x} s={t.s} /> : <Cypress key={i} x={t.x} h={t.h} />
        )}
      <ellipse cx={200 + round(scene.dx)} cy={GROUND + 3} rx={96} ry={7} fill={C.green} opacity={0.14} />
      <g
        transform={`translate(${round(200 + scene.dx)} ${GROUND}) scale(${round(scene.scale * scene.flip)} ${round(scene.scale)})`}
      >
        {renderMotif(scene.motif, scene.motifSeed)}
      </g>
    </svg>
  );
}
