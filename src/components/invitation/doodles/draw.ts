// Utilidades para generar trazos "a mano" (curvas con irregularidad determinista).
type Pt = [number, number];

let state = 1;
export function seedDraw(n: number) { state = (n * 9301 + 49297) % 233280 || 1; }
function rnd() { state = (state * 16807) % 2147483647; return (state - 1) / 2147483646; }
export const jit = (a = 0.5) => (rnd() - 0.5) * 2 * a;
const f = (n: number) => (Math.round(n * 10) / 10).toString();

/** Curva suave (Catmull-Rom) por los puntos, con jitter. */
export function C(pts: Pt[], o: { closed?: boolean; j?: number; t?: number } = {}): string {
  const j = o.j ?? 0.35;
  const t = o.t ?? 1;
  const p = pts.map(([x, y]) => [x + jit(j), y + jit(j)] as Pt);
  const n = p.length;
  const at = (i: number): Pt => (o.closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  const segs = o.closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1 = [p1[0] + ((p2[0] - p0[0]) / 6) * t, p1[1] + ((p2[1] - p0[1]) / 6) * t];
    const c2 = [p2[0] - ((p3[0] - p1[0]) / 6) * t, p2[1] - ((p3[1] - p1[1]) / 6) * t];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + (o.closed ? "Z" : "");
}

/** Polilínea recta con ligera curvatura/irregularidad por tramo. */
export function L(pts: Pt[], o: { closed?: boolean; j?: number } = {}): string {
  const j = o.j ?? 0.5;
  const p = pts.map(([x, y]) => [x + jit(j * 0.6), y + jit(j * 0.6)] as Pt);
  if (o.closed) p.push(p[0]);
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 1; i < p.length; i++) {
    const [x0, y0] = p[i - 1];
    const [x1, y1] = p[i];
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
    const b = jit(Math.min(j * 1.6, len * 0.05 + 0.2));
    d += `Q${f((x0 + x1) / 2 + nx * b)} ${f((y0 + y1) / 2 + ny * b)} ${f(x1)} ${f(y1)}`;
  }
  return d + (o.closed ? "Z" : "");
}

/** Elipse irregular con pequeño solape al cerrar (como un círculo dibujado a mano). */
export function E(cx: number, cy: number, rx: number, ry = rx, o: { a0?: number; over?: number; j?: number; n?: number } = {}): string {
  const n = o.n ?? 10;
  const a0 = o.a0 ?? -2.2 + jit(0.5);
  const over = o.over ?? 0.3;
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((Math.PI * 2 + over) * i) / n;
    const k = 1 + jit(0.025);
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return C(pts, { j: o.j ?? 0.12 });
}

/** Rectángulo de esquinas redondeadas, trazo irregular. */
export function R(x: number, y: number, w: number, h: number, r = 4, j = 0.45): string {
  const q = (v: number) => v + jit(j);
  const x2 = x + w, y2 = y + h;
  return (
    `M${f(q(x + r))} ${f(q(y))}L${f(q(x2 - r))} ${f(q(y))}Q${f(q(x2))} ${f(q(y))} ${f(q(x2))} ${f(q(y + r))}` +
    `L${f(q(x2))} ${f(q(y2 - r))}Q${f(q(x2))} ${f(q(y2))} ${f(q(x2 - r))} ${f(q(y2))}` +
    `L${f(q(x + r))} ${f(q(y2))}Q${f(q(x))} ${f(q(y2))} ${f(q(x))} ${f(q(y2 - r))}` +
    `L${f(q(x))} ${f(q(y + r))}Q${f(q(x))} ${f(q(y))} ${f(q(x + r))} ${f(q(y))}Z`
  );
}

/** Perímetro de un corazón (paramétrico) muestreado por longitud de arco. */
export function heartPts(cx: number, cy: number, w: number, n: number): Pt[] {
  const raw: Pt[] = [];
  const M = 400;
  for (let i = 0; i <= M; i++) {
    const t = (i / M) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    raw.push([x, y]);
  }
  const s = w / 32;
  const cum = [0];
  for (let i = 1; i <= M; i++) cum.push(cum[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
  const total = cum[M];
  const out: Pt[] = [];
  let k = 0;
  for (let i = 0; i < n; i++) {
    const target = (i / n) * total;
    while (cum[k + 1] < target) k++;
    const [x, y] = raw[k];
    out.push([cx + x * s, cy + (y - 3) * s]);
  }
  return out;
}

/** Corazón suave (curva cerrada). */
export function H(cx: number, cy: number, w: number, o: { j?: number } = {}): string {
  return C(heartPts(cx, cy, w, 26), { closed: true, j: o.j ?? 0.25, t: 0.8 });
}

/** Borde festoneado a partir de un polígono cerrado (arcos hacia fuera). */
export function scallop(pts: Pt[], bulge = 1.05): string {
  const n = pts.length;
  let area = 0;
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const sweep = area > 0 ? 1 : 0;
  const p = pts.map(([x, y]) => [x + jit(0.3), y + jit(0.3)] as Pt);
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 0; i < n; i++) {
    const a = p[i], b = p[(i + 1) % n];
    const r = (Math.hypot(b[0] - a[0], b[1] - a[1]) / 2) * bulge * (1 + jit(0.06));
    d += `A${f(r)} ${f(r)} 0 0 ${sweep} ${f(b[0])} ${f(b[1])}`;
  }
  return d + "Z";
}

/** Flor de n pétalos festoneados. */
export function flowerPath(cx: number, cy: number, r: number, n = 5, rot = 0): string {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2 - Math.PI / 2;
    pts.push([cx + Math.cos(a) * r * 0.64, cy + Math.sin(a) * r * 0.64]);
  }
  return scallop(pts, 1.0);
}

/** Hoja (lente) desde (x,y) con ángulo (grados) y longitud. */
export function leaf(x: number, y: number, ang: number, len: number, wid = 0.38): string {
  const a = (ang * Math.PI) / 180;
  const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
  const nx = -Math.sin(a) * len * wid, ny = Math.cos(a) * len * wid;
  const mx = (x + ex) / 2, my = (y + ey) / 2;
  return `M${f(x)} ${f(y)}Q${f(mx + nx + jit(0.3))} ${f(my + ny + jit(0.3))} ${f(ex)} ${f(ey)}Q${f(mx - nx + jit(0.3))} ${f(my - ny + jit(0.3))} ${f(x)} ${f(y)}Z`;
}

export const P = (d: string, extra = "") => `<path d="${d}"${extra ? " " + extra : ""}/>`;
/** Relleno de acento (con trazo heredado). */
export const FILL = 'fill="§A"';
export const INKFILL = 'fill="§I"';
export const dot = (x: number, y: number, r = 1.3) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="§I"/>`;
export const G = (tf: string, inner: string) => `<g transform="${tf}">${inner}</g>`;
export const NOSTROKE = 'stroke="none"';
