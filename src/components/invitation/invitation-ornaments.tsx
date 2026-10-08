import type { CSSProperties } from "react";

/** Adornos de la invitación: SVG sencillos que toman el color de cada plantilla. */

const LEAF = "M0 0 C 8 -13 28 -14 42 0 C 28 14 8 13 0 0 Z";

function Leaf({ x, y, r, s = 1, tone = "leaf" }: { x: number; y: number; r: number; s?: number; tone?: "leaf" | "leafDark" }) {
  return (
    <path
      d={LEAF}
      transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}
      className={tone === "leaf" ? "inv-fillLeaf" : "inv-fillLeafDark"}
    />
  );
}

function Flower({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="0" cy="-8" rx="5" ry="8.5" transform={`rotate(${a})`} className="inv-fillAccent" />
      ))}
      <circle r="3.6" className="inv-fillPaper" />
    </g>
  );
}

/** Rama de esquina (esquina superior izquierda; se refleja por CSS en la derecha). */
export function BotanicalCorner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 210 190"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ overflow: "visible" } as CSSProperties}
    >
      <path d="M-6 26 C 44 30, 96 52, 128 92 C 150 120, 166 146, 176 176" className="inv-strokeLeafDark" fill="none" strokeWidth="2" strokeLinecap="round" />
      <Leaf x={22} y={30} r={-38} s={0.9} />
      <Leaf x={34} y={31} r={32} s={0.85} tone="leafDark" />
      <Leaf x={56} y={40} r={-48} s={1} />
      <Leaf x={68} y={46} r={42} s={0.95} tone="leafDark" />
      <Leaf x={92} y={62} r={-62} s={1} />
      <Leaf x={102} y={70} r={26} s={0.9} />
      <Leaf x={122} y={88} r={-78} s={0.95} tone="leafDark" />
      <Leaf x={128} y={96} r={10} s={0.9} />
      <Leaf x={146} y={118} r={-92} s={0.85} />
      <Leaf x={152} y={126} r={-16} s={0.8} tone="leafDark" />
      <Leaf x={166} y={150} r={-100} s={0.75} />
      <Flower x={96} y={36} s={1.1} />
      <Flower x={150} y={78} s={0.9} />
      <Flower x={186} y={128} s={0.75} />
      <circle cx="176" cy="176" r="3.5" className="inv-fillAccent" />
    </svg>
  );
}

/** Separador con ramita y flor. */
export function Sprig({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 36" aria-hidden="true" focusable="false" className={className}>
      <path d="M8 18 H92 M128 18 H212" className="inv-strokeLine" strokeWidth="1.2" strokeLinecap="round" />
      <g transform="translate(110 18)">
        <Flower x={0} y={0} s={0.9} />
        <Leaf x={-14} y={2} r={180} s={0.55} />
        <Leaf x={14} y={2} r={0} s={0.55} />
      </g>
    </svg>
  );
}

/** Separador de rombo (plantilla elegante). */
export function DiamondDivider({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 24" aria-hidden="true" focusable="false" className={className}>
      <path d="M10 12 H88 M132 12 H210" className="inv-strokeLine" strokeWidth="1" strokeLinecap="round" />
      <path d="M110 3 L117 12 L110 21 L103 12 Z" className="inv-fillAccent" />
      <path d="M96 12 L99 9 L102 12 L99 15 Z M118 12 L121 9 L124 12 L121 15 Z" className="inv-fillAccent" opacity="0.7" />
    </svg>
  );
}

/** Línea fina con punto (plantilla minimal). */
export function DotRule({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 12" aria-hidden="true" focusable="false" className={className}>
      <path d="M4 6 H50 M70 6 H116" className="inv-strokeLine" strokeWidth="1" strokeLinecap="round" />
      <circle cx="60" cy="6" r="2.6" className="inv-fillAccent" />
    </svg>
  );
}
