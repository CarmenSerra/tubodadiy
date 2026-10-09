// Utilidades para pintar acuarelas con SVG: RNG con semilla, geometría de hojas y
// pétalos, y un "lienzo" que aplica filtros de acuarela (bordes ondulados, pigmento
// acumulado en el borde, moteado y grano de papel). Todo corre offline en el
// generador; la app solo recibe WebP rasterizados.

export function rng(seed) {
  let a = seed >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (lo, hi) => lo + (hi - lo) * r();
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.sign = () => (r() < 0.5 ? -1 : 1);
  return r;
}

export const f = (n) => Number(n.toFixed(2));
const rad = (d) => (d * Math.PI) / 180;

/* ------------------------------ color ------------------------------ */
const hex2 = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const mix = (a, b, t) => {
  const A = hex2(a);
  const B = hex2(b);
  return (
    "#" +
    A.map((v, i) =>
      Math.round(v + (B[i] - v) * t)
        .toString(16)
        .padStart(2, "0"),
    ).join("")
  );
};

// Paletas [claro, hondo] de la marca (salvias, lilas) más un dorado suave para alianzas.
export const PAL = {
  sage: ["#B2C7A3", "#729778"],
  sageDeep: ["#98B48F", "#4F7A64"],
  eucal: ["#A9C6B8", "#5F8E80"],
  teal: ["#92BFAD", "#427466"],
  olive: ["#BAC692", "#789262"],
  lilac: ["#E0D0F2", "#B49AD8"],
  lilacDeep: ["#C9B3E6", "#8468AE"],
  violet: ["#C8B1E8", "#7A5CAA"],
  gold: ["#EBD79C", "#B18A40"],
  stem: ["#8A9E7E", "#55725A"],
};

/* ---------------------------- geometría ---------------------------- */
export function bez(p, t) {
  const u = 1 - t;
  const x = u ** 3 * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t ** 3 * p[3][0];
  const y = u ** 3 * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t ** 3 * p[3][1];
  const dx = 3 * u * u * (p[1][0] - p[0][0]) + 6 * u * t * (p[2][0] - p[1][0]) + 3 * t * t * (p[3][0] - p[2][0]);
  const dy = 3 * u * u * (p[1][1] - p[0][1]) + 6 * u * t * (p[2][1] - p[1][1]) + 3 * t * t * (p[3][1] - p[2][1]);
  const l = Math.hypot(dx, dy) || 1;
  return { x, y, tx: dx / l, ty: dy / l, ang: (Math.atan2(dy, dx) * 180) / Math.PI };
}

/** Catmull-Rom -> bezier cúbica. */
export function smooth(pts, closed = true) {
  const n = pts.length;
  const g = (i) => (closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + (closed ? "Z" : "");
}

const PROFILES = {
  round: (t) => { const u = t ** 0.85; return Math.sqrt(Math.max(0, 4 * u * (1 - u))); },
  lance: (t) => Math.sin(Math.PI * t ** 0.8) ** 0.85,
  ovate: (t) => Math.sin(Math.PI * t ** 0.6) ** 0.8,
  needle: (t) => Math.sin(Math.PI * t) ** 0.6,
  petal: (t) => Math.sin(Math.PI * t ** 1.4) ** 0.5,
  floret: (t) => Math.sin(Math.PI * t ** 0.9) ** 0.6,
};

/** Hoja/pétalo: contorno suave, eje curvo, y mitad izquierda (para sombreado). */
export function leaf({ x, y, ang, len, wid, bend = 0, prof = "lance", asym = 0, n = 16 }) {
  const a = rad(ang);
  const dx = Math.cos(a), dy = Math.sin(a);
  const nx = -dy, ny = dx;
  const P = PROFILES[prof];
  let maxW = 0;
  for (let i = 0; i <= 40; i++) maxW = Math.max(maxW, P(i / 40));
  const axis = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const off = bend * len * (0.5 * Math.sin(Math.PI * t) + 0.3 * t * t);
    axis.push([x + dx * len * t + nx * off, y + dy * len * t + ny * off]);
  }
  const L = [], R = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p0 = axis[Math.max(0, i - 1)], p1 = axis[Math.min(n, i + 1)];
    const tl = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1;
    const tx = (p1[0] - p0[0]) / tl, ty = (p1[1] - p0[1]) / tl;
    const hw = ((wid / 2) * P(t)) / maxW;
    const mx = -ty, my = tx; // normal local
    L.push([axis[i][0] + mx * hw * (1 + asym), axis[i][1] + my * hw * (1 + asym)]);
    R.push([axis[i][0] - mx * hw * (1 - asym), axis[i][1] - my * hw * (1 - asym)]);
  }
  const outline = [axis[0], ...L.slice(1, n), axis[n], ...R.slice(1, n).reverse()];
  const halfL = [axis[0], ...L.slice(1, n), axis[n], ...axis.slice(1, n).reverse()];
  const halfR = [axis[0], ...R.slice(1, n), axis[n], ...axis.slice(1, n).reverse()];
  return {
    d: smooth(outline),
    halfL: smooth(halfL),
    halfR: smooth(halfR),
    axis, L, R,
    base: axis[0], tip: axis[n],
    mid: smooth(axis.slice(0, Math.max(2, Math.round(n * 0.92))), false),
  };
}

/** Nervios laterales finos hacia el borde. */
export function veins(lf, count = 4, side = 0.72) {
  const n = lf.axis.length - 1;
  let d = "";
  for (let k = 1; k <= count; k++) {
    const i = Math.round((n * (0.14 + 0.62 * ((k - 1) / Math.max(1, count - 1)))));
    const j = Math.min(n - 1, i + Math.max(2, Math.round(n * 0.2)));
    for (const E of [lf.L, lf.R]) {
      const a = lf.axis[i], b = E[j];
      const tx = a[0] + (b[0] - a[0]) * side, ty = a[1] + (b[1] - a[1]) * side;
      const cx = a[0] + (tx - a[0]) * 0.5 + (lf.axis[j][0] - a[0]) * 0.12;
      const cy = a[1] + (ty - a[1]) * 0.5 + (lf.axis[j][1] - a[1]) * 0.12;
      d += `M${f(a[0])} ${f(a[1])}Q${f(cx)} ${f(cy)} ${f(tx)} ${f(ty)}`;
    }
  }
  return d;
}

/** Polígono de tallo que adelgaza a lo largo de una bezier (o de una polilínea). */
export function stemPath(ctrl, w0, w1, n = 28) {
  const L = [], R = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const { x, y, tx, ty } = bez(ctrl, t);
    const w = (w0 + (w1 - w0) * t ** 0.9) / 2;
    L.push([x - ty * w, y + tx * w]);
    R.push([x + ty * w, y - tx * w]);
  }
  return smooth([...L, ...R.reverse()]);
}

/** Blob orgánico: radio con armónicos aleatorios. */
export function blob(cx, cy, r, rand, { rough = 0.22, n = 28, sx = 1, sy = 1 } = {}) {
  const ph = Array.from({ length: 6 }, () => rand() * Math.PI * 2);
  const am = [0, 0, 1, 0.8, 0.55, 0.35].map((k) => k * rough * rand.range(0.5, 1.1));
  const pts = [];
  for (let i = 0; i < n; i++) {
    const th = (i / n) * Math.PI * 2;
    let k = 1;
    for (let h = 2; h <= 5; h++) k += (am[h] / h) * Math.cos(h * th + ph[h]);
    pts.push([cx + Math.cos(th) * r * k * sx, cy + Math.sin(th) * r * k * sy]);
  }
  return smooth(pts);
}

export function heartPath(cx, cy, size, rot = 0) {
  const pts = [];
  const c = Math.cos(rad(rot)), s = Math.sin(rad(rot));
  for (let i = 0; i < 64; i++) {
    const t = (i / 64) * Math.PI * 2;
    const hx = 16 * Math.sin(t) ** 3;
    const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    const x = (hx * size) / 34, y = ((hy + 1.5) * size) / 34;
    pts.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return smooth(pts);
}

/* ------------------------------ lienzo ------------------------------ */
const KINDS = {
  // df: frecuencia del desplazamiento; disp: px de ondulación del borde; soft: desenfoque
  // del borde; edge: ancho del pigmento acumulado; ek/dk: fuerza y oscurecimiento del borde;
  // mean/mk: moteado (alfa medio y contraste); grain: fuerza del grano de papel.
  leaf: { df: 0.035, disp: 5, soft: 0.8, edge: 3, ek: 3, dk: 0.56, mf: 0.016, mean: 0.92, mk: 1.3, grain: 0.08 },
  petal: { df: 0.045, disp: 4, soft: 0.8, edge: 2.6, ek: 3, dk: 0.6, mf: 0.02, mean: 0.9, mk: 1.4, grain: 0.08 },
  stem: { df: 0.06, disp: 2.4, soft: 0.5, edge: 1.2, ek: 1.6, dk: 0.7, mf: 0.03, mean: 0.95, mk: 0.8, grain: 0.08 },
  wash: { df: 0.012, disp: 24, soft: 2.5, edge: 7, ek: 2.2, dk: 0.76, mf: 0.008, mean: 0.9, mk: 1.5, grain: 0.03 },
  band: { df: 0.03, disp: 1.5, soft: 0.6, edge: 3, ek: 3, dk: 0.62, mf: 0.02, mean: 0.92, mk: 1.2, grain: 0.1 },
  heart: { df: 0.02, disp: 7, soft: 1.2, edge: 4.5, ek: 3, dk: 0.7, mf: 0.012, mean: 0.9, mk: 1.6, grain: 0.08 },
  tiny: { df: 0.09, disp: 1.8, soft: 0.5, edge: 1.4, ek: 2, dk: 0.7, mf: 0.05, mean: 0.95, mk: 0.6, grain: 0.06 },
  line: { df: 0.07, disp: 1.8, soft: 0.35, edge: 0, ek: 0, dk: 1, mf: 0.05, mean: 1, mk: 0, grain: 0.05 },
};

export class Canvas {
  constructor(w, h, rand, scale = 1) {
    this.w = w; this.h = h; this.rand = rand; this.s = scale;
    this.defs = []; this.body = []; this.filters = new Set(); this.n = 0;
  }
  filter(kind, seed, edge = true) {
    const id = `f-${kind}-${seed}-${edge ? 1 : 0}`;
    if (this.filters.has(id)) return id;
    this.filters.add(id);
    const k = KINDS[kind], s = this.s;
    const ek = edge ? k.ek : 0;
    const mb = k.mean - 0.5 * k.mk;
    this.defs.push(`<filter id="${id}" filterUnits="userSpaceOnUse" x="0" y="0" width="${this.w}" height="${this.h}" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="${f(k.df / s)}" numOctaves="2" seed="${seed}" result="dn"/>
<feDisplacementMap in="SourceGraphic" in2="dn" scale="${f(k.disp * s)}" xChannelSelector="R" yChannelSelector="G" result="d"/>
<feGaussianBlur in="d" stdDeviation="${f(k.soft * s)}" result="soft"/>
<feTurbulence type="fractalNoise" baseFrequency="${f(k.mf / s)}" numOctaves="3" seed="${seed + 7}" result="mn"/>
<feColorMatrix in="mn" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${f(k.mk)} 0 0 0 ${f(mb)}" result="ma"/>
<feComposite in="soft" in2="ma" operator="in" result="mott"/>
${ek ? `<feGaussianBlur in="soft" stdDeviation="${f(k.edge * s)}" result="bl"/>
<feComposite in="soft" in2="bl" operator="arithmetic" k1="0" k2="1" k3="-1" k4="0" result="ring"/>
<feColorMatrix in="ring" type="matrix" values="${k.dk} 0 0 0 0 0 ${k.dk} 0 0 0 0 0 ${k.dk} 0 0 0 0 0 ${ek} 0" result="ed"/>` : `<feOffset in="soft" dx="0" dy="0" result="ed"/>`}
<feMerge result="m"><feMergeNode in="mott"/>${ek ? '<feMergeNode in="ed"/>' : ""}</feMerge>
<feTurbulence type="fractalNoise" baseFrequency="0.62" numOctaves="2" seed="${seed + 3}" result="gn"/>
<feColorMatrix in="gn" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${f(k.grain * 2)} 0 0 0 ${f(1 - k.grain)}" result="ga"/>
<feComposite in="m" in2="ga" operator="in"/>
</filter>`);
    return id;
  }
  grad(x1, y1, x2, y2, c1, c2, o1 = 1, o2 = 1) {
    const id = `g${this.n++}`;
    this.defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"><stop offset="0" stop-color="${c1}" stop-opacity="${o1}"/><stop offset="1" stop-color="${c2}" stop-opacity="${o2}"/></linearGradient>`);
    return id;
  }
  /** Mancha de pigmento. fill: color o [c1,c2] con `axis` [x1,y1,x2,y2] para el degradado. */
  shape(d, { fill, axis, op = 0.68, kind = "leaf", seed = 1, edge = true, extra = "" }) {
    let paint = fill;
    if (Array.isArray(fill)) {
      const [x1, y1, x2, y2] = axis ?? [0, 0, this.w, this.h];
      paint = `url(#${this.grad(x1, y1, x2, y2, fill[0], fill[1])})`;
    }
    const id = this.filter(kind, seed, edge);
    this.body.push(`<path d="${d}" fill="${paint}" fill-opacity="${op}" filter="url(#${id})" ${extra}/>`);
  }
  /** Trazo fino (nervios, estambres) con un ligero temblor. */
  line(d, { stroke, w = 1.2, op = 0.4, seed = 1, cap = "round" }) {
    const id = this.filter("line", seed, false);
    this.body.push(`<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w * this.s}" stroke-opacity="${op}" stroke-linecap="${cap}" stroke-linejoin="round" filter="url(#${id})"/>`);
  }
  /** Grupo con un único filtro (p. ej. salpicaduras). */
  group(inner, { kind = "tiny", seed = 1, edge = false }) {
    const id = this.filter(kind, seed, edge);
    this.body.push(`<g filter="url(#${id})">${inner}</g>`);
  }
  svg() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.w}" height="${this.h}" viewBox="0 0 ${this.w} ${this.h}"><defs>${this.defs.join("")}</defs>${this.body.join("")}</svg>`;
  }
}
