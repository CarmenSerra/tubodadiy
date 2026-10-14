/**
 * Guirnalda floral de la plantilla «Botánico»: una esquina (arriba a la izquierda) con flores, hojas y
 * capullos que se repite girada 180° abajo a la derecha. Sin dependencias ni hooks: la misma geometría
 * sirve a la tarjeta (SVG en línea, colores con variables CSS) y al lienzo de «Reserva la fecha»
 * (SVG con colores concretos dibujado como imagen). Las medidas están en «cqw»: 100 = ancho de la tarjeta,
 * así que la esquina ocupa lo mismo en cualquier tamaño. Zona que usa (sin pisar el texto, que empieza a
 * 15 de alto y a 7 del borde): arriba una franja de ≤ 15, a la izquierda una tira de ≤ 7.
 */

export interface BotanicalColors {
  /** Hojas claras. */
  leaf: string;
  /** Tallos y hojas oscuras. */
  leafDark: string;
  /** Pétalos. */
  petal: string;
  /** Contorno de los pétalos. */
  petalLine: string;
  /** Centro de las flores. */
  center: string;
}

type Pt = [number, number];
type Curve = [Pt, Pt, Pt, Pt];

const n = (v: number) => String(Math.round(v * 100) / 100);

function at([p0, p1, p2, p3]: Curve, t: number) {
  const u = 1 - t;
  const x = u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0];
  const y = u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1];
  const dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
  const dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
  return { x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
}

const curvePath = ([p0, p1, p2, p3]: Curve) =>
  `M${n(p0[0])} ${n(p0[1])}C${n(p1[0])} ${n(p1[1])} ${n(p2[0])} ${n(p2[1])} ${n(p3[0])} ${n(p3[1])}`;

function leaf(x: number, y: number, angle: number, len: number, c: BotanicalColors, dark: boolean) {
  const w = len * 0.3;
  const d = `M0 0C${n(len * 0.18)} ${n(-w)} ${n(len * 0.72)} ${n(-w)} ${n(len)} 0C${n(len * 0.72)} ${n(w)} ${n(len * 0.18)} ${n(w)} 0 0Z`;
  return (
    `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(angle)})">` +
    `<path d="${d}" fill="${dark ? c.leafDark : c.leaf}" stroke="${c.leafDark}" stroke-width="0.22" stroke-linejoin="round"/>` +
    `<path d="M${n(len * 0.1)} 0L${n(len * 0.82)} 0" stroke="${dark ? c.leaf : c.leafDark}" stroke-width="0.2" stroke-linecap="round" opacity="0.7"/>` +
    `</g>`
  );
}

/** Hojas alternas a lo largo de un tallo, cada vez más pequeñas hacia la punta. */
function leaves(curve: Curve, count: number, len0: number, len1: number, spread: number, c: BotanicalColors, first = 1) {
  let out = "";
  for (let i = 0; i < count; i++) {
    const t = 0.1 + (0.86 * i) / Math.max(1, count - 1);
    const side = (i % 2 === 0 ? first : -first) as 1 | -1;
    const p = at(curve, t);
    const len = len0 + (len1 - len0) * t;
    out += leaf(p.x, p.y, p.angle + side * spread, len, c, i % 3 === 1);
  }
  // hoja terminal
  const tip = at(curve, 1);
  out += leaf(tip.x, tip.y, tip.angle, len1 * 0.95, c, false);
  return out;
}

const PETAL = "M0 -0.9C-2.3 -2.5-2.2 -5.6 0 -6.1C2.2 -5.6 2.3 -2.5 0 -0.9Z";

/** Flor de cinco pétalos de radio `r` con el centro marcado. */
function flower(x: number, y: number, r: number, rot: number, c: BotanicalColors) {
  const s = r / 6.1;
  let petals = "";
  for (let i = 0; i < 5; i++) petals += `<path d="${PETAL}" transform="rotate(${i * 72})"/>`;
  return (
    `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)}) scale(${n(s)})">` +
    `<g fill="${c.petal}" stroke="${c.petalLine}" stroke-width="${n(0.3 / s)}" stroke-linejoin="round">${petals}</g>` +
    `<circle r="1.45" fill="${c.center}" stroke="${c.petalLine}" stroke-width="${n(0.22 / s)}"/>` +
    `<circle r="0.42" fill="${c.petalLine}"/>` +
    `</g>`
  );
}

const bud = (x: number, y: number, r: number, c: BotanicalColors) =>
  `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${c.petal}" stroke="${c.petalLine}" stroke-width="0.22"/>`;

/** Esquina superior izquierda en un recuadro de 64 × 42. */
export function botanicalCornerBody(c: BotanicalColors): string {
  const top: Curve = [[4, 7], [18, 1.6], [34, 11.6], [62, 6.6]];
  const side: Curve = [[5, 8], [1.2, 17], [6.6, 28], [3.6, 41]];
  const stem = (curve: Curve, w: number) =>
    `<path d="${curvePath(curve)}" fill="none" stroke="${c.leafDark}" stroke-width="${w}" stroke-linecap="round"/>`;
  return (
    stem(top, 0.5) +
    stem(side, 0.5) +
    leaves(top, 10, 7.6, 4.2, 52, c, 1) +
    leaves(side, 6, 4.6, 2.8, 50, c, -1) +
    // brotecito en el cuerpo de la guirnalda
    leaf(15, 12, 60, 5, c, true) +
    leaf(13.5, 13, 100, 4.4, c, false) +
    bud(47, 9.6, 1.15, c) +
    bud(55, 8.4, 0.9, c) +
    bud(6.2, 33.5, 1, c) +
    flower(24.5, 6.4, 4.3, 12, c) +
    flower(3.4, 25, 3.1, -8, c) +
    flower(10.6, 10.6, 6.3, 18, c) +
    flower(37.5, 8.8, 2.8, 30, c) +
    flower(2.6, 15.2, 2.2, 0, c)
  );
}

/** SVG suelto de una esquina (para dibujarlo en el lienzo), con anchura y altura propias. */
export function botanicalCornerSvg(c: BotanicalColors): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 42" width="640" height="420">${botanicalCornerBody(c)}</svg>`;
}

/** Cuerpo de una capa completa de `100 × h` (con `scale` < 1, esquinas más pequeñas para cajas pequeñas): la esquina arriba a la izquierda y la misma girada abajo a la derecha. */
export function botanicalCornersBody(h: number, c: BotanicalColors, scale = 1): string {
  const body = botanicalCornerBody(c);
  return `<g transform="scale(${n(scale)})">${body}</g><g transform="translate(100 ${n(h)}) rotate(180) scale(${n(scale)})">${body}</g>`;
}
