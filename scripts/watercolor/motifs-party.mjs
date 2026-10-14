// Motivos de acuarela de fiesta para la papelería: alianzas, brindis, tarta,
// ramo, fotos instantáneas y cartas de amor. Mismo motor y mismas piezas que
// motifs-stationery.mjs (-a esquina grande, -b esquina corta, -s ramita central):
// los objetos se dibujan en coordenadas locales y se colocan con T(x, y, grados, escala).
//
//   node scripts/watercolor/generate.mjs --set stationery --only rings-a,toast-a,...
import { Canvas, PAL, bez, blob, f, heartPath, leaf, mix, rng, smooth } from "./lib.mjs";
import { branch, flowerHead, paintLeaf } from "./motifs.mjs";

const DEG = Math.PI / 180;
const K = 0.5523;
const lerp = (a, b, t) => a + (b - a) * t;

// [claro, hondo]
const PT = {
  rose: ["#F8CBD0", "#D9566F"],
  blush: ["#FBE0DF", "#EDA3AE"],
  coral: ["#FAC7B1", "#E2644A"],
  peach: ["#FDE0C8", "#EE9A6B"],
  cream: ["#FFFBF0", "#E6D5B0"],
  champ: ["#FCEDB6", "#E2B650"],
  glass: ["#E4F1F6", "#98BACB"],
  bottle: ["#93B79D", "#2F5E49"],
  sky: ["#D9EAF4", "#7FAECF"],
  mint: ["#D2E9DB", "#7DB59A"],
  berry: ["#F4A3A8", "#C2334C"],
  kraft: ["#F0DDBC", "#C9A877"],
  gem: ["#F5FBFF", "#8FBFDC"],
  lilac: ["#E6D8F4", "#A98CD2"],
  leaf: ["#BCD6A2", "#5D8F57"],
  ink: "#5F7D93",
};

/* ------------------------- transformaciones ------------------------- */
/** Coloca coordenadas locales: origen (x, y), giro en grados y escala. */
function T(x, y, deg = 0, s = 1) {
  const a = deg * DEG, co = Math.cos(a) * s, si = Math.sin(a) * s;
  const fn = (px, py) => [x + px * co - py * si, y + px * si + py * co];
  fn.deg = deg;
  fn.s = s;
  return fn;
}
/** Convierte un trazado con comandos absolutos (M L C Q Z) de local a lienzo. */
function D(t, src) {
  const tok = src.match(/[MLCQZ]|-?\d*\.?\d+/g);
  let out = "", nums = [];
  for (const k of tok) {
    if (/[A-Z]/.test(k)) out += k;
    else {
      nums.push(+k);
      if (nums.length === 2) {
        const [x, y] = t(nums[0], nums[1]);
        out += `${f(x)} ${f(y)} `;
        nums = [];
      }
    }
  }
  return out;
}
const P = (t, pts) => pts.map((p) => t(p[0], p[1]));
const axis = (t, x1, y1, x2, y2) => [...t(x1, y1), ...t(x2, y2)];
const ell = (rx, ry, cx = 0, cy = 0) =>
  `M ${cx - rx} ${cy} C ${cx - rx} ${cy - ry * K} ${cx - rx * K} ${cy - ry} ${cx} ${cy - ry} C ${cx + rx * K} ${cy - ry} ${cx + rx} ${cy - ry * K} ${cx + rx} ${cy} C ${cx + rx} ${cy + ry * K} ${cx + rx * K} ${cy + ry} ${cx} ${cy + ry} C ${cx - rx * K} ${cy + ry} ${cx - rx} ${cy + ry * K} ${cx - rx} ${cy} Z`;
const rrect = (w, h, r, cx = 0, cy = 0) => {
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
  return `M ${x0 + r} ${y0} L ${x1 - r} ${y0} Q ${x1} ${y0} ${x1} ${y0 + r} L ${x1} ${y1 - r} Q ${x1} ${y1} ${x1 - r} ${y1} L ${x0 + r} ${y1} Q ${x0} ${y1} ${x0} ${y1 - r} L ${x0} ${y0 + r} Q ${x0} ${y0} ${x0 + r} ${y0} Z`;
};
const polyL = (pts) => "M " + pts.map((p) => `${p[0]} ${p[1]}`).join(" L ") + " Z";

/* ------------------------------ pintura ------------------------------ */
const mk = (seed, W, H) => new Canvas(W, H, rng(seed));
const fill = (c, d, pal, o = {}) =>
  c.shape(d, { fill: pal, axis: o.axis, op: o.op ?? 0.72, kind: o.kind ?? "petal", seed: o.seed ?? 1, edge: o.edge ?? true, extra: o.extra ?? "" });
const shade = (c, d, color, o = {}) => c.shape(d, { fill: color, op: o.op ?? 0.18, kind: o.kind ?? "petal", seed: o.seed ?? 1, edge: false });
const ink = (c, d, o = {}) => c.line(d, { stroke: o.stroke ?? PT.ink, w: o.w ?? 1.3, op: o.op ?? 0.42, seed: o.seed ?? 3 });

function sparkle(c, x, y, R, seed = 1, pal = PT.champ, op = 0.85) {
  const d = `M ${x} ${y - R} Q ${x} ${y} ${x + R} ${y} Q ${x} ${y} ${x} ${y + R} Q ${x} ${y} ${x - R} ${y} Q ${x} ${y} ${x} ${y - R} Z`;
  c.shape(d, { fill: pal, op, kind: "tiny", seed, edge: true });
}
function heart(c, x, y, size, rot = 0, pal = PT.rose, seed = 1, op = 0.78) {
  const kind = size < 22 ? "tiny" : size < 50 ? "petal" : "heart";
  c.shape(heartPath(x, y, size, rot), { fill: pal, axis: [x - size / 2, y - size / 2, x + size / 2, y + size / 2], op, kind, seed });
  if (size >= 14) {
    c.shape(blob(x - size * 0.2, y - size * 0.18, size * 0.11, c.rand, { rough: 0.1, n: 10, sx: 1.4 }), { fill: "#ffffff", op: 0.5, kind: "tiny", seed, edge: false });
  }
}
function dots(c, list, color, seed = 1, op = 0.6) {
  const inner = list.map(([x, y, r]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${color}" fill-opacity="${op}"/>`).join("");
  c.group(inner, { kind: "tiny", seed, edge: false });
}
/** Gotas de pigmento salpicadas. */
function splat(c, cx, cy, spread, n, color, seed = 1) {
  const r = c.rand;
  const list = [];
  for (let i = 0; i < n; i++) {
    const a = r.range(0, Math.PI * 2), d = Math.sqrt(r()) * spread;
    list.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d, r.range(0.8, 2.6)]);
  }
  dots(c, list, color, seed, 0.5);
}
/** Sin mancha de fondo: sobre tarjetas oscuras se vería como una nube gris. */
const halo = () => {};

/** Rama corta de hojas, para dar aire botánico. */
function sprig(c, ctrl, n, pals, { len = [40, 24], wid = 0.34, prof = "lance", seed = 1, stem = [3.6, 1.4] } = {}) {
  const r = c.rand;
  const leaves = [];
  for (let k = 0; k < n; k++) {
    const t = 0.16 + (0.8 * k) / Math.max(1, n - 1);
    const L = lerp(len[0], len[1], k / Math.max(1, n - 1));
    for (const side of [-1, 1]) {
      leaves.push({ t: Math.min(0.99, t + (side > 0 ? 0.03 : 0)), side, rel: r.range(42, 58), len: L * r.range(0.92, 1.08), wid: L * wid * r.range(0.9, 1.08), prof, bend: -side * r.range(0.03, 0.08), pet: 3, pal: r.pick(pals) });
    }
  }
  leaves.push({ t: 1, ang: bez(ctrl, 1).ang, len: len[1] * 0.95, wid: len[1] * wid, prof, pet: 1, pal: pals[0], side: 0, rel: 0 });
  branch(c, ctrl, leaves, { stem, seed, nVeins: 0, vein: false });
}

/* ------------------------------ alianzas ------------------------------ */
/** Franja de anillo entre dos ángulos (grados) de una elipse centrada en (cx, cy). */
function arcBand(t, cx, cy, rx, ry, a0, a1, th) {
  const out = [], inn = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const a = (lerp(a0, a1, i / n)) * DEG;
    out.push(t(cx + Math.cos(a) * (rx + th / 2), cy + Math.sin(a) * (ry + th / 2)));
    inn.push(t(cx + Math.cos(a) * (rx - th / 2), cy + Math.sin(a) * (ry - th / 2)));
  }
  return smooth([...out, ...inn.reverse()]);
}
function bandRing(c, t, cx, cy, rx, ry, th, seed, ang = [-40, 40]) {
  const d = D(t, ell(rx + th / 2, ry + th / 2, cx, cy) + ell(rx - th / 2, ry - th / 2, cx, cy));
  fill(c, d, PT.champ, { axis: axis(t, cx - rx, cy - ry, cx + rx, cy + ry), op: 0.82, seed, extra: 'fill-rule="evenodd"' });
  fill(c, d, [mix(PAL.gold[1], "#7a5a20", 0.2), PAL.gold[1]], { op: 0.16, edge: false, seed, extra: 'fill-rule="evenodd"' });
  // brillo en el borde superior izquierdo y sombra abajo a la derecha
  const arc = (k, a0, a1) => {
    let s = "";
    for (let i = 0; i <= 10; i++) {
      const a = lerp(a0, a1, i / 10) * DEG;
      const p = t(cx + Math.cos(a) * (rx + k), cy + Math.sin(a) * (ry + k));
      s += `${i ? "L" : "M"}${f(p[0])} ${f(p[1])}`;
    }
    return s;
  };
  c.line(arc(-th * 0.12, 190, 262), { stroke: "#ffffff", w: 1.8, op: 0.75, seed });
  c.line(arc(th * 0.12, 20, 80), { stroke: PAL.gold[1], w: 1.2, op: 0.4, seed });
}
function diamond(c, t, x, y, s, seed) {
  const pts = [[-13, 0], [-8, -9], [8, -9], [13, 0], [0, 17]].map(([px, py]) => [x + px * s, y + py * s]);
  const d = D(t, polyL(pts));
  fill(c, d, PT.gem, { axis: axis(t, x - 12 * s, y - 9 * s, x + 12 * s, y + 17 * s), op: 0.86, kind: "tiny", seed });
  const L = (a, b) => `M${f(t(x + a[0] * s, y + a[1] * s)[0])} ${f(t(x + a[0] * s, y + a[1] * s)[1])}L${f(t(x + b[0] * s, y + b[1] * s)[0])} ${f(t(x + b[0] * s, y + b[1] * s)[1])}`;
  ink(c, L([-13, 0], [13, 0]) + L([-8, -9], [-3, 0]) + L([8, -9], [3, 0]) + L([-3, 0], [0, 17]) + L([3, 0], [0, 17]), { stroke: "#5E93B5", w: 1, op: 0.5, seed });
}

/** Dos alianzas entrelazadas (la de arriba pasa por encima en un cruce). */
function ringPair(c, t, seed) {
  const R = 40, th = 11, off = 23;
  bandRing(c, t, -off, 0, R, R * 0.96, th, seed);
  bandRing(c, t, off, 0, R, R * 0.96, th, seed + 1);
  // el primer aro vuelve a pasar por encima del segundo en el cruce superior
  const a = Math.atan2(-Math.sqrt(R * R - off * off), off) / DEG;
  fill(c, arcBand(t, -off, 0, R, R * 0.96, a - 22, a + 24, th), PT.champ, { axis: axis(t, -off, -R, off, 0), op: 0.9, seed });
}
function solitaire(c, t, seed) {
  bandRing(c, t, 0, 8, 25, 29, 8, seed);
  diamond(c, t, 0, -28, 1.05, seed);
}

function ringsA() {
  const c = mk(411, 360, 360);
  halo(c, 130, 140, 110, PAL.gold[0], 0.18, 1);
  sprig(c, [[24, 150], [64, 250], [150, 280], [260, 250]], 5, [PT.leaf, PAL.sage, PAL.eucal], { len: [40, 26], wid: 0.36, seed: 2 });
  sprig(c, [[150, 20], [200, 56], [250, 76], [320, 96]], 5, [PAL.olive, PAL.sageDeep], { len: [34, 22], wid: 0.26, seed: 3 });
  ringPair(c, T(138, 138, -22, 1.2), 2);
  sparkle(c, 250, 112, 13, 2);
  sparkle(c, 60, 56, 9, 3, PT.rose);
  sparkle(c, 215, 195, 8, 4);
  heart(c, 312, 176, 20, 18, PT.rose, 2);
  splat(c, 190, 150, 120, 18, PAL.gold[1], 2);
  return c;
}
function ringsB() {
  const c = mk(413, 300, 300);
  halo(c, 105, 105, 90, PT.rose[0], 0.14, 2);
  sprig(c, [[150, 14], [212, 26], [262, 76], [278, 150]], 5, [PAL.eucal, PAL.sage, PT.leaf], { len: [36, 22], wid: 0.34, seed: 1 });
  sprig(c, [[14, 206], [48, 252], [100, 270], [160, 264]], 4, [PAL.olive, PAL.sageDeep], { len: [30, 20], wid: 0.26, seed: 2 });
  ringPair(c, T(112, 118, -16, 1.12), 1);
  sparkle(c, 214, 82, 12, 3);
  sparkle(c, 64, 196, 9, 2, PT.rose);
  heart(c, 226, 196, 24, -12, PT.rose, 3);
  heart(c, 232, 248, 14, 14, PT.berry, 4);
  splat(c, 150, 130, 100, 14, PAL.gold[1], 3);
  return c;
}
function ringsS() {
  const c = mk(417, 320, 118);
  ringPair(c, T(160, 60, -8, 0.95), 2);
  sprig(c, [[14, 66], [50, 84], [84, 78], [108, 62]], 3, [PT.leaf, PAL.sage], { len: [24, 17], wid: 0.34, seed: 1, stem: [2.6, 1] });
  sprig(c, [[306, 66], [270, 84], [236, 78], [212, 62]], 3, [PT.leaf, PAL.sage], { len: [24, 17], wid: 0.34, seed: 2, stem: [2.6, 1] });
  sparkle(c, 112, 24, 9, 3);
  sparkle(c, 214, 98, 8, 2, PT.rose);
  heart(c, 252, 26, 14, 10, PT.rose, 2);
  return c;
}

/* ------------------------------ brindis ------------------------------ */
const GLASS = {
  flute: {
    bowl: "M -12 0 C -13 30 -9 54 0 57 C 9 54 13 30 12 0 C 6 2.5 -6 2.5 -12 0 Z",
    liq: "M -11.4 15 C -11.8 36 -8 53 0 55 C 8 53 11.8 36 11.4 15 C 5 18 -5 18 -11.4 15 Z",
    rim: "M -12 0 C -6 3 6 3 12 0", stem: "M -1.9 55 L 1.9 55 L 1.2 97 L -1.2 97 Z", base: "M -18 99 C -9 94 9 94 18 99 C 9 104 -9 104 -18 99 Z",
    hi: "M -8 8 C -9 26 -7 42 -3 52", bub: [[-3, 36, 1.6], [3, 28, 1.3], [-1, 22, 1.1], [4, 42, 1.4], [0, 46, 1]],
  },
  coupe: {
    bowl: "M -27 0 C -27 24 -13 34 0 34 C 13 34 27 24 27 0 C 14 3.5 -14 3.5 -27 0 Z",
    liq: "M -23.5 8 C -23 24 -11 31 0 31.5 C 11 31 23 24 23.5 8 C 12 11 -12 11 -23.5 8 Z",
    rim: "M -27 0 C -14 4 14 4 27 0", stem: "M -1.9 33 L 1.9 33 L 1.2 72 L -1.2 72 Z", base: "M -17 74 C -9 69 9 69 17 74 C 9 79 -9 79 -17 74 Z",
    hi: "M -21 8 C -19 20 -13 27 -5 30", bub: [[-6, 20, 1.4], [8, 18, 1.2], [2, 25, 1.1], [12, 24, 1.3]],
  },
};
function glass(c, t, kind, { liquid = PT.champ, seed = 1, rose = false } = {}) {
  const g = GLASS[kind];
  fill(c, D(t, g.base), PT.glass, { op: 0.62, kind: "tiny", seed });
  fill(c, D(t, g.stem), PT.glass, { op: 0.62, kind: "stem", seed });
  fill(c, D(t, g.bowl), PT.glass, { op: 0.42, seed, axis: axis(t, -12, 0, 12, 50) });
  fill(c, D(t, g.liq), rose ? [PT.rose[0], PT.rose[1]] : liquid, { op: 0.82, seed, axis: axis(t, 0, 10, 0, 56) });
  ink(c, D(t, g.bowl), { w: 1.3, op: 0.4, seed });
  ink(c, D(t, g.rim), { w: 1.2, op: 0.4, seed });
  ink(c, D(t, g.hi), { stroke: "#ffffff", w: 2, op: 0.8, seed });
  dots(c, g.bub.map(([x, y, r]) => { const p = t(x, y); return [p[0], p[1], r * t.s]; }), "#ffffff", seed + 1, 0.85);
}
function toastA() {
  const c = mk(421, 360, 360);
  halo(c, 130, 130, 120, PT.champ[0], 0.2, 1);
  glass(c, T(120, 80, 26, 1.42), "flute", { seed: 1 });
  glass(c, T(176, 80, -26, 1.42), "flute", { seed: 2, liquid: [PT.blush[0], PT.rose[1]] });
  // chin chin: chispas y gotas en el choque
  sparkle(c, 148, 40, 15, 1);
  sparkle(c, 196, 36, 9, 2, PT.rose);
  sparkle(c, 104, 40, 8, 3);
  heart(c, 224, 100, 18, 14, PT.rose, 2);
  splat(c, 148, 56, 44, 16, PT.champ[1], 2);
  glass(c, T(268, 246, -14, 0.95), "coupe", { seed: 3, liquid: [PT.blush[0], PT.rose[1]] });
  sparkle(c, 300, 190, 10, 4, PT.rose);
  sparkle(c, 214, 262, 8, 2);
  heart(c, 330, 300, 14, -10, PT.berry, 3);
  dots(c, [[200, 170, 3], [214, 156, 2.2], [190, 150, 1.8], [236, 190, 2.4], [250, 168, 1.6]], PT.champ[1], 2, 0.5);
  return c;
}
function bottle(c, t, seed) {
  const body = "M -21 92 L -21 32 C -21 12 -8 8 -8 -10 L -8 -44 L 8 -44 L 8 -10 C 8 8 21 12 21 32 L 21 92 C 21 99 -21 99 -21 92 Z";
  fill(c, D(t, body), PT.bottle, { op: 0.82, seed, axis: axis(t, -21, 0, 21, 90) });
  shade(c, D(t, "M 2 -44 L 8 -44 L 8 -10 C 8 8 21 12 21 32 L 21 92 C 21 99 6 98 6 92 L 6 30 C 6 12 2 4 2 -10 Z"), "#16372c", { op: 0.22, seed });
  // lámina dorada del cuello y etiqueta
  fill(c, D(t, "M -9 -44 L 9 -44 L 9 -22 C 4 -19 -4 -19 -9 -22 Z"), PT.champ, { op: 0.88, kind: "tiny", seed });
  fill(c, D(t, rrect(34, 36, 3, 0, 56)), PT.cream, { op: 0.92, kind: "paper", seed });
  heartLocal(c, t, 0, 56, 14, PT.rose, seed);
  ink(c, D(t, "M -14 43 L 14 43"), { stroke: PAL.gold[1], w: 1, op: 0.5, seed });
  ink(c, D(t, "M -14 69 L 14 69"), { stroke: PAL.gold[1], w: 1, op: 0.5, seed });
  ink(c, D(t, "M -15 -2 C -16 18 -18 24 -19 34"), { stroke: "#ffffff", w: 2.2, op: 0.5, seed });
}
function heartLocal(c, t, x, y, size, pal, seed, op = 0.85) {
  const p = t(x, y);
  heart(c, p[0], p[1], size * t.s, t.deg, pal, seed, op);
}
function toastB() {
  const c = mk(423, 300, 300);
  halo(c, 110, 130, 100, PT.bottle[0], 0.14, 1);
  bottle(c, T(100, 126, 34, 1.04), 1);
  // corcho que salta y burbujas
  const cork = T(168, 34, 30, 1);
  fill(c, D(cork, rrect(17, 24, 3)), PT.kraft, { op: 0.88, kind: "tiny", seed: 2 });
  ink(c, D(cork, "M -5 -8 L -5 8 M 0 -8 L 0 8 M 5 -8 L 5 8"), { stroke: PT.kraft[1], w: 0.8, op: 0.4 });
  dots(c, [[142, 70, 5], [128, 86, 3.4], [152, 92, 3], [116, 60, 2.4], [160, 62, 2.4], [138, 46, 2.2], [182, 78, 3.4], [168, 104, 2.4]], PT.glass[1], 2, 0.55);
  sparkle(c, 214, 40, 13, 1);
  sparkle(c, 70, 62, 8, 2, PT.rose);
  glass(c, T(212, 190, -12, 1.05), "coupe", { seed: 3 });
  heart(c, 268, 246, 18, 12, PT.rose, 2);
  sparkle(c, 130, 238, 9, 3);
  splat(c, 150, 70, 60, 12, PT.champ[1], 3);
  return c;
}
function toastS() {
  const c = mk(427, 320, 118);
  halo(c, 160, 54, 70, PT.champ[0], 0.2, 1);
  glass(c, T(142, 8, 24, 0.86), "flute", { seed: 1 });
  glass(c, T(180, 8, -24, 0.86), "flute", { seed: 2, liquid: [PT.blush[0], PT.rose[1]] });
  sparkle(c, 160, 14, 11, 1);
  sparkle(c, 60, 52, 9, 2, PT.rose);
  sparkle(c, 266, 50, 9, 3);
  heart(c, 232, 22, 14, 12, PT.rose, 2);
  heart(c, 92, 84, 12, -14, PT.berry, 3);
  dots(c, [[120, 22, 2.4], [206, 28, 2], [250, 88, 2.4], [40, 98, 2], [290, 96, 2.2]], PT.champ[1], 2, 0.5);
  return c;
}

/* -------------------------------- tarta -------------------------------- */
function tier(c, t, y, w, h, pal, seed) {
  const body = `M ${-w / 2} ${y} L ${w / 2} ${y} L ${w / 2} ${y + h - 5} C ${w / 2} ${y + h + 4} ${-w / 2} ${y + h + 4} ${-w / 2} ${y + h - 5} Z`;
  fill(c, D(t, body), pal, { axis: axis(t, -w / 2, y, w / 2, y + h), op: 0.8, seed });
  shade(c, D(t, `M ${w * 0.12} ${y} L ${w / 2} ${y} L ${w / 2} ${y + h - 5} C ${w / 2} ${y + h + 4} ${w * 0.12} ${y + h + 4} ${w * 0.12} ${y + h - 5} Z`), mix(pal[1], "#6b2a3a", 0.3), { op: 0.18, seed });
  // glaseado con lágrimas
  const n = Math.max(4, Math.round(w / 15));
  const dx = w / n;
  let d = `M ${-w / 2 - 1} ${y - 4} `;
  d += `C ${-w / 2 - 1} ${y - 9} ${w / 2 + 1} ${y - 9} ${w / 2 + 1} ${y - 4} L ${w / 2 + 1} ${y + 3} `;
  for (let i = n - 1; i >= 0; i--) {
    const x0 = -w / 2 + (i + 1) * dx, x1 = -w / 2 + i * dx;
    const depth = 9 + ((i * 7) % 5) * 2;
    d += `Q ${(x0 + x1) / 2} ${y + 3 + depth * 2} ${x1} ${y + 3} `;
  }
  d += "Z";
  fill(c, D(t, d), PT.cream, { op: 0.96, kind: "petal", seed: seed + 1 });
  // perlitas en la base
  const pearls = [];
  for (let x = -w / 2 + 6; x < w / 2 - 3; x += 9) pearls.push(P(t, [[x, y + h - 3]])[0].concat(1.9 * t.s));
  dots(c, pearls, "#ffffff", seed + 2, 0.9);
}
function strawberry(c, t, x, y, s, seed) {
  const d = D(t, `M ${x} ${y - 9 * s} C ${x + 13 * s} ${y - 10 * s} ${x + 13 * s} ${y + 6 * s} ${x} ${y + 17 * s} C ${x - 13 * s} ${y + 6 * s} ${x - 13 * s} ${y - 10 * s} ${x} ${y - 9 * s} Z`);
  fill(c, d, PT.berry, { op: 0.88, kind: "tiny", seed });
  const dd = [[-5, -2], [4, -3], [0, 3], [-3, 8], [5, 4], [1, 12]].map(([a, b]) => { const p = t(x + a * s, y + b * s); return [p[0], p[1], 0.9]; });
  dots(c, dd, "#FBE592", seed, 0.85);
  for (const a of [-50, 0, 50]) {
    const p = t(x, y - 9 * s);
    const lf = leaf({ x: p[0], y: p[1], ang: -90 + a + t.deg, len: 9 * s * t.s, wid: 4.6 * s * t.s, prof: "lance", n: 8 });
    fill(c, lf.d, PT.leaf, { op: 0.85, kind: "tiny", seed, edge: false });
  }
}
function cakeSlice(c, t, seed, pal = PT.rose) {
  const A = [-4, 4], B = [40, -8], C2 = [40, 38], D2 = [-4, 50];
  const at = (top, bot, fr) => [lerp(top[0], bot[0], fr), lerp(top[1], bot[1], fr)];
  const layer = (f0, f1, p, op, sd) => fill(c, D(t, polyL([at(A, D2, f0), at(B, C2, f0), at(B, C2, f1), at(A, D2, f1)])), p, { op, kind: "petal", seed: sd });
  // cara izquierda (corte oscuro) y superficie
  fill(c, D(t, polyL([[-36, -6], A, D2, [-36, 40]])), [mix(PT.kraft[0], pal[0], 0.5), mix(PT.kraft[1], pal[1], 0.4)], { op: 0.85, kind: "petal", seed });
  layer(0, 0.3, PT.cream, 0.95, seed);
  layer(0.3, 0.5, pal, 0.88, seed + 1);
  layer(0.5, 0.78, PT.cream, 0.95, seed + 2);
  layer(0.78, 1, pal, 0.88, seed + 3);
  fill(c, D(t, polyL([[-36, -6], [8, -19], B, A])), PT.cream, { op: 0.97, kind: "petal", seed });
  ink(c, D(t, `M ${A[0]} ${A[1]} L ${D2[0]} ${D2[1]}`), { stroke: pal[1], w: 1, op: 0.35, seed });
  strawberry(c, t, 12, -22, 0.9, seed);
  heartLocal(c, t, 28, 20, 14, PT.cream, seed + 2, 0.9);
}
function cupcake(c, t, seed) {
  fill(c, D(t, "M -27 0 L 27 0 L 20 38 C 20 42 -20 42 -20 38 Z"), PT.coral, { axis: axis(t, -27, 0, 27, 40), op: 0.82, seed });
  ink(c, D(t, "M -14 4 L -11 36 M -5 4 L -4 38 M 5 4 L 4 38 M 14 4 L 11 36"), { stroke: "#a8412c", w: 1, op: 0.35, seed });
  fill(c, D(t, ell(32, 12, 0, -2)), PT.blush, { op: 0.92, seed: seed + 1 });
  fill(c, D(t, ell(25, 11, 0, -14)), PT.cream, { op: 0.95, seed: seed + 2 });
  fill(c, D(t, ell(16, 10, 0, -25)), PT.blush, { op: 0.95, seed: seed + 3 });
  fill(c, D(t, ell(8, 7, 0, -33)), PT.cream, { op: 0.95, kind: "tiny", seed: seed + 3 });
  const ch = t(0, -44);
  c.shape(blob(ch[0], ch[1], 8 * t.s, c.rand, { rough: 0.06, n: 14 }), { fill: PT.berry, op: 0.9, kind: "tiny", seed, edge: true });
  c.shape(blob(ch[0] - 2.5 * t.s, ch[1] - 2.5 * t.s, 2.4 * t.s, c.rand, { rough: 0.1, n: 8 }), { fill: "#fff", op: 0.7, kind: "tiny", seed, edge: false });
  const sp = [[-18, -4, 20], [10, -8, -30], [20, -2, 60], [-6, -16, -10], [14, -20, 40], [-12, -26, 70]];
  const out = sp.map(([x, y, a]) => { const p = t(x, y); return `<rect x="${f(p[0] - 3)}" y="${f(p[1] - 0.8)}" width="6" height="1.8" rx="0.9" fill="${a > 20 ? PT.lilac[1] : PAL.gold[1]}" fill-opacity="0.8" transform="rotate(${a + t.deg} ${f(p[0])} ${f(p[1])})"/>`; }).join("");
  c.group(out, { kind: "tiny", seed: seed + 4, edge: false });
}
function cakeA() {
  const c = mk(431, 360, 360);
  halo(c, 130, 150, 110, PT.rose[0], 0.16, 1);
  const t = T(124, 134, -7, 1.28);
  tier(c, t, 20, 124, 44, PT.blush, 1);
  tier(c, t, -22, 88, 40, PT.cream, 2);
  tier(c, t, -58, 54, 34, PT.rose, 3);
  // plato
  fill(c, D(t, ell(80, 10, 0, 68)), PT.cream, { op: 0.8, kind: "tiny", seed: 4 });
  // topper de corazón con palito
  ink(c, D(t, "M 0 -66 L 0 -82"), { stroke: PAL.gold[1], w: 1.6, op: 0.6 });
  heartLocal(c, t, 0, -96, 26, PT.rose, 2);
  // fresitas y hojitas en el piso de arriba
  strawberry(c, t, -18, -68, 0.8, 3);
  strawberry(c, t, 20, -66, 0.7, 4);
  cakeSlice(c, T(272, 256, 8, 1.2), 5);
  sparkle(c, 218, 80, 13, 1);
  sparkle(c, 60, 56, 9, 2, PT.rose);
  sparkle(c, 214, 218, 8, 3);
  heart(c, 316, 168, 18, 14, PT.berry, 2);
  splat(c, 190, 150, 130, 16, PT.rose[1], 2);
  return c;
}
function cakeB() {
  const c = mk(433, 300, 300);
  halo(c, 100, 110, 90, PT.peach[0], 0.2, 2);
  cupcake(c, T(104, 112, -8, 1.45), 1);
  cakeSlice(c, T(214, 224, -10, 0.95), 4, PT.peach);
  sparkle(c, 200, 70, 12, 1);
  sparkle(c, 54, 196, 9, 2, PT.rose);
  heart(c, 252, 110, 20, 14, PT.rose, 2);
  heart(c, 140, 230, 13, -14, PT.berry, 3);
  strawberry(c, T(0, 0), 164, 150, 0.8, 5);
  splat(c, 140, 120, 90, 12, PT.coral[1], 3);
  return c;
}
function cakeS() {
  const c = mk(437, 320, 118);
  halo(c, 160, 56, 90, PT.rose[0], 0.14, 1);
  cupcake(c, T(62, 54, -6, 0.84), 1);
  const t = T(160, 52, 0, 0.62);
  tier(c, t, 18, 96, 34, PT.blush, 2);
  tier(c, t, -14, 64, 30, PT.cream, 3);
  tier(c, t, -42, 38, 26, PT.rose, 4);
  heartLocal(c, t, 0, -64, 22, PT.rose, 2);
  cakeSlice(c, T(262, 62, 6, 0.86), 5);
  sparkle(c, 112, 20, 9, 1);
  sparkle(c, 210, 98, 8, 2, PT.rose);
  heart(c, 300, 22, 12, 12, PT.berry, 3);
  return c;
}

/* -------------------------------- ramo -------------------------------- */
function rose(c, x, y, R, pal, seed) {
  const r = c.rand;
  c.shape(blob(x, y, R, r, { rough: 0.12, n: 22 }), { fill: pal, axis: [x - R, y - R, x + R, y + R], op: 0.78, kind: "petal", seed });
  c.shape(blob(x + R * 0.05, y + R * 0.05, R * 0.66, r, { rough: 0.1, n: 18 }), { fill: [mix(pal[0], pal[1], 0.35), mix(pal[0], pal[1], 0.8)], op: 0.55, kind: "petal", seed, edge: true });
  c.shape(blob(x - R * 0.04, y, R * 0.34, r, { rough: 0.1, n: 14 }), { fill: mix(pal[1], "#5a1830", 0.25), op: 0.5, kind: "tiny", seed });
  ink(c, `M${f(x - R * 0.5)} ${f(y - R * 0.1)}Q${f(x)} ${f(y - R * 0.75)} ${f(x + R * 0.55)} ${f(y + R * 0.05)}Q${f(x + R * 0.3)} ${f(y + R * 0.6)} ${f(x - R * 0.2)} ${f(y + R * 0.45)}`, { stroke: mix(pal[1], "#5a1830", 0.35), w: 1.1, op: 0.4, seed });
}
function posy(c, x, y, R, pal, seed, petals = 6, wid = 0.8) {
  flowerHead(c, x, y, R, c.rand.range(0, 60), { petals, pal, wid, seed, deepCenter: false });
  c.shape(blob(x, y, R * 0.16, c.rand, { rough: 0.1, n: 10 }), { fill: PAL.gold[1], op: 0.85, kind: "tiny", seed, edge: false });
}
function bow(c, x, y, s, A, pal, seed) {
  // A: ángulo del eje del ramo; los lazos salen en perpendicular y las colas hacia los tallos
  for (const [ang, len, wid, prof] of [[A + 90 + 10, 34, 20, "round"], [A - 90 - 10, 34, 20, "round"], [A + 180 + 24, 38, 11, "lance"], [A + 180 - 24, 38, 11, "lance"]]) {
    const lf = leaf({ x, y, ang, len: len * s, wid: wid * s, prof, n: 12 });
    c.shape(lf.d, { fill: pal, axis: [lf.base[0], lf.base[1], lf.tip[0], lf.tip[1]], op: 0.84, kind: "petal", seed });
  }
  c.shape(blob(x, y, 6.5 * s, c.rand, { rough: 0.08, n: 12 }), { fill: mix(pal[1], "#5a1830", 0.2), op: 0.88, kind: "tiny", seed });
}
/** Flores finas tipo gipsófila: rama con puntitos blancos. */
function gyps(c, x, y, ang, len, seed) {
  const r = c.rand;
  const a = ang * DEG;
  c.line(`M${f(x)} ${f(y)}Q${f(x + Math.cos(a) * len * 0.5 + 6)} ${f(y + Math.sin(a) * len * 0.5 - 6)} ${f(x + Math.cos(a) * len)} ${f(y + Math.sin(a) * len)}`, { stroke: PAL.stem[1], w: 1.1, op: 0.4, seed });
  const list = [];
  for (let i = 0; i < 9; i++) {
    const t = 0.35 + r() * 0.65;
    const ba = a + r.range(-0.7, 0.7);
    list.push([x + Math.cos(a) * len * t + Math.cos(ba) * 7 * t, y + Math.sin(a) * len * t + Math.sin(ba) * 7 * t, r.range(2, 3.4)]);
  }
  c.group(list.map(([x2, y2, r2]) => `<circle cx="${f(x2)}" cy="${f(y2)}" r="${f(r2)}" fill="#FBEFF0" fill-opacity="0.95" stroke="#E3B7C0" stroke-width="0.9" stroke-opacity="0.7"/>`).join(""), { kind: "tiny", seed, edge: false });
}
function wrap(c, S, ang, len, half, seed) {
  const a = ang * DEG, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  const base = [S[0] + ux * len, S[1] + uy * len];
  const L = [base[0] + nx * half, base[1] + ny * half], R = [base[0] - nx * half, base[1] - ny * half];
  const d = `M${f(S[0])} ${f(S[1])}L${f(L[0])} ${f(L[1])}Q${f(base[0] + ux * 12)} ${f(base[1] + uy * 12)} ${f(R[0])} ${f(R[1])}Z`;
  fill(c, d, PT.kraft, { axis: [S[0], S[1], base[0], base[1]], op: 0.8, kind: "paper", seed });
  const d2 = `M${f(S[0])} ${f(S[1])}L${f(R[0])} ${f(R[1])}Q${f(base[0] + ux * 12)} ${f(base[1] + uy * 12)} ${f(base[0])} ${f(base[1])}Z`;
  shade(c, d2, "#8a6a3a", { op: 0.16, kind: "paper" });
  ink(c, `M${f(S[0])} ${f(S[1])}L${f(base[0] + ux * 8)} ${f(base[1] + uy * 8)}`, { stroke: PT.kraft[1], w: 1.1, op: 0.45, seed });
  return { base, L, R, ux, uy };
}
function bouquet(c, { S, ang, len, half, blooms, greens, bowAt, seed }) {
  const a = ang * DEG, ux = Math.cos(a), uy = Math.sin(a);
  // tallos que salen del envoltorio
  const cx = S[0] + ux * len * 0.9, cy = S[1] + uy * len * 0.9;
  for (let i = -2; i <= 2; i++) {
    const nx = -uy * i * 10, ny = ux * i * 10;
    ink(c, `M${f(S[0] + ux * 6)} ${f(S[1] + uy * 6)}L${f(cx + nx)} ${f(cy + ny)}`, { stroke: PAL.stem[1], w: 2.2, op: 0.5, seed: seed + i });
  }
  for (const g of greens) {
    const lf = leaf({ x: g.x, y: g.y, ang: g.ang, len: g.len, wid: g.wid, prof: g.prof ?? "round", bend: g.bend ?? 0.05, n: 12 });
    paintLeaf(c, lf, { pal: g.pal ?? [PAL.eucal, PAL.sage, PT.leaf][Math.floor(c.rand() * 3)], op: 0.7, seed: 1 + (seed % 4), nVeins: 0, vein: g.vein ?? false });
  }
  wrap(c, S, ang, len, half, seed);
  const bp = [S[0] + ux * len * bowAt, S[1] + uy * len * bowAt];
  bow(c, bp[0], bp[1], 0.95, ang, PT.rose, seed);
  for (const b of blooms) {
    if (b.kind === "rose") rose(c, b.x, b.y, b.R, b.pal, b.seed ?? 1);
    else if (b.kind === "gyps") gyps(c, b.x, b.y, b.ang, b.len, b.seed ?? 1);
    else posy(c, b.x, b.y, b.R, b.pal, b.seed ?? 1, b.petals ?? 6, b.wid ?? 0.8);
  }
}
function bouquetA() {
  const c = mk(441, 360, 360);
  halo(c, 190, 190, 110, PT.blush[0], 0.2, 1);
  bouquet(c, {
    S: [-6, -6], ang: 45, len: 172, half: 38, bowAt: 0.52, seed: 1,
    greens: [
      { x: 116, y: 116, ang: 20, len: 90, wid: 40 }, { x: 116, y: 116, ang: 70, len: 92, wid: 40 },
      { x: 126, y: 116, ang: -5, len: 100, wid: 28, prof: "lance", pal: PT.leaf, vein: true },
      { x: 116, y: 126, ang: 95, len: 100, wid: 28, prof: "lance", pal: PT.leaf, vein: true },
    ],
    blooms: [
      { kind: "gyps", x: 116, y: 106, ang: -25, len: 90, seed: 1 }, { kind: "gyps", x: 106, y: 116, ang: 115, len: 90, seed: 2 },
      { kind: "rose", x: 162, y: 116, R: 38, pal: PT.rose, seed: 1 },
      { kind: "rose", x: 116, y: 164, R: 36, pal: PT.coral, seed: 2 },
      { kind: "flower", x: 202, y: 162, R: 34, pal: PT.blush, seed: 3, petals: 6, wid: 0.85 },
      { kind: "flower", x: 158, y: 204, R: 33, pal: PT.lilac, seed: 4, petals: 7, wid: 0.7 },
      { kind: "rose", x: 171, y: 164, R: 44, pal: PT.peach, seed: 3 },
      { kind: "flower", x: 224, y: 224, R: 25, pal: PT.cream, seed: 5, petals: 5, wid: 0.9 },
    ],
  });
  sparkle(c, 300, 130, 11, 2);
  sparkle(c, 120, 290, 9, 3, PT.rose);
  heart(c, 318, 222, 16, 14, PT.rose, 2);
  splat(c, 210, 200, 130, 14, PT.rose[1], 2);
  return c;
}
function bouquetB() {
  const c = mk(443, 300, 300);
  halo(c, 160, 160, 90, PT.lilac[0], 0.2, 2);
  bouquet(c, {
    S: [8, 10], ang: 48, len: 120, half: 38, bowAt: 0.5, seed: 2,
    greens: [
      { x: 98, y: 103, ang: 10, len: 76, wid: 30, prof: "lance", pal: PT.leaf, vein: true },
      { x: 98, y: 103, ang: 95, len: 80, wid: 30, prof: "lance", pal: PT.leaf, vein: true },
      { x: 102, y: 104, ang: 48, len: 70, wid: 40 },
    ],
    blooms: [
      { kind: "gyps", x: 98, y: 96, ang: -20, len: 72, seed: 1 },
      { kind: "flower", x: 134, y: 108, R: 32, pal: PT.lilac, seed: 1, petals: 7, wid: 0.7 },
      { kind: "flower", x: 102, y: 146, R: 31, pal: PT.cream, seed: 2, petals: 6, wid: 0.85 },
      { kind: "rose", x: 148, y: 150, R: 38, pal: PT.rose, seed: 2 },
      { kind: "flower", x: 184, y: 184, R: 28, pal: PT.blush, seed: 3, petals: 5, wid: 0.95 },
      { kind: "flower", x: 128, y: 194, R: 25, pal: PT.peach, seed: 4, petals: 6, wid: 0.8 },
    ],
  });
  sparkle(c, 250, 120, 11, 2);
  sparkle(c, 92, 232, 8, 3, PT.rose);
  heart(c, 252, 214, 14, 12, PT.rose, 2);
  splat(c, 170, 170, 100, 12, PT.lilac[1], 2);
  return c;
}
function bouquetS() {
  const c = mk(447, 320, 118);
  // ramillete tumbado: tallos a la izquierda, flores a la derecha
  const S = [6, 62], ang = 0;
  halo(c, 200, 58, 80, PT.blush[0], 0.18, 1);
  bouquet(c, {
    S, ang, len: 120, half: 26, bowAt: 0.52, seed: 3,
    greens: [
      { x: 110, y: 60, ang: -30, len: 64, wid: 24, prof: "lance", pal: PT.leaf },
      { x: 110, y: 64, ang: 30, len: 64, wid: 24, prof: "lance", pal: PT.leaf },
      { x: 120, y: 62, ang: 0, len: 66, wid: 30 },
    ],
    blooms: [
      { kind: "rose", x: 160, y: 50, R: 20, pal: PT.rose, seed: 1 },
      { kind: "flower", x: 162, y: 82, R: 17, pal: PT.lilac, seed: 2, petals: 6, wid: 0.75 },
      { kind: "flower", x: 196, y: 62, R: 20, pal: PT.blush, seed: 3, petals: 6, wid: 0.85 },
      { kind: "rose", x: 232, y: 54, R: 18, pal: PT.coral, seed: 4 },
      { kind: "flower", x: 232, y: 86, R: 15, pal: PT.cream, seed: 5, petals: 5, wid: 0.9 },
      { kind: "gyps", x: 196, y: 40, ang: -20, len: 50, seed: 1 },
    ],
  });
  sparkle(c, 272, 28, 9, 1);
  sparkle(c, 292, 84, 8, 2, PT.rose);
  heart(c, 258, 100, 11, 12, PT.rose, 2);
  return c;
}

/* ------------------------- fotos instantáneas ------------------------- */
function scene(c, t, kind, w, seed) {
  const x0 = -w / 2 + 8, y0 = -w / 2 - 6, s = w - 16;
  const win = polyL([[x0, y0], [x0 + s, y0], [x0 + s, y0 + s], [x0, y0 + s]]);
  const cx = 0, cy = y0 + s / 2;
  if (kind === "heart") {
    fill(c, D(t, win), PT.peach, { axis: axis(t, x0, y0, x0 + s, y0 + s), op: 0.7, kind: "paper", seed });
    heartLocal(c, t, cx, cy + 2, s * 0.5, PT.rose, seed, 0.9);
  } else if (kind === "hills") {
    fill(c, D(t, win), PT.sky, { axis: axis(t, 0, y0, 0, y0 + s), op: 0.66, kind: "paper", seed });
    const sun = t(cx + s * 0.18, y0 + s * 0.3);
    c.shape(blob(sun[0], sun[1], s * 0.14 * t.s, c.rand, { rough: 0.05, n: 14 }), { fill: PT.champ, op: 0.9, kind: "tiny", seed });
    fill(c, D(t, `M ${x0} ${y0 + s * 0.7} C ${x0 + s * 0.3} ${y0 + s * 0.45} ${x0 + s * 0.55} ${y0 + s * 0.6} ${x0 + s} ${y0 + s * 0.52} L ${x0 + s} ${y0 + s} L ${x0} ${y0 + s} Z`), PT.mint, { op: 0.82, kind: "tiny", seed: seed + 1 });
    fill(c, D(t, `M ${x0} ${y0 + s * 0.86} C ${x0 + s * 0.35} ${y0 + s * 0.68} ${x0 + s * 0.7} ${y0 + s * 0.82} ${x0 + s} ${y0 + s * 0.74} L ${x0 + s} ${y0 + s} L ${x0} ${y0 + s} Z`), PT.leaf, { op: 0.8, kind: "tiny", seed: seed + 2 });
  } else if (kind === "couple") {
    fill(c, D(t, win), PT.blush, { axis: axis(t, 0, y0, 0, y0 + s), op: 0.72, kind: "paper", seed });
    for (const [dx, col, hh] of [[-s * 0.14, PT.ink, 1], [s * 0.14, PT.bottle[1], 0.92]]) {
      const hp = t(dx, cy - s * 0.12 * hh);
      c.shape(blob(hp[0], hp[1], s * 0.11 * t.s, c.rand, { rough: 0.04, n: 12 }), { fill: dx < 0 ? "#6b5a52" : "#8a6a52", op: 0.82, kind: "tiny", seed });
      fill(c, D(t, `M ${dx - s * 0.13} ${y0 + s} L ${dx - s * 0.1} ${cy - s * 0.0} Q ${dx} ${cy - s * 0.05} ${dx + s * 0.1} ${cy} L ${dx + s * 0.13} ${y0 + s} Z`), dx < 0 ? [PT.glass[1], PT.ink] : PT.rose, { op: 0.82, kind: "tiny", seed });
      void col;
    }
    heartLocal(c, t, 0, y0 + s * 0.2, s * 0.17, PT.rose, seed, 0.85);
  } else {
    fill(c, D(t, win), PT.mint, { axis: axis(t, 0, y0, 0, y0 + s), op: 0.62, kind: "paper", seed });
    for (const [dx, dy, R, pal] of [[-s * 0.16, s * 0.04, s * 0.17, PT.rose], [s * 0.18, -s * 0.06, s * 0.14, PT.cream], [s * 0.05, s * 0.2, s * 0.12, PT.blush]]) {
      const p = t(dx, cy + dy);
      flowerHead(c, p[0], p[1], R * t.s * 1.4, t.deg, { petals: 5, pal, wid: 0.9, seed, deepCenter: false });
      c.shape(blob(p[0], p[1], R * t.s * 0.28, c.rand, { rough: 0.1, n: 8 }), { fill: PAL.gold[1], op: 0.85, kind: "tiny", seed, edge: false });
    }
  }
}
function polaroid(c, t, kind, seed, w = 88, tape = true) {
  const h = w + 24;
  const frame = polyL([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]);
  // sombra suave y papel
  shade(c, D(T(t(3, 4)[0], t(3, 4)[1], t.deg, t.s), frame), "#7a5a3a", { op: 0.16, kind: "paper" });
  fill(c, D(t, frame), PT.cream, { axis: axis(t, -w / 2, -h / 2, w / 2, h / 2), op: 0.97, kind: "paper", seed });
  scene(c, t, kind, w, seed);
  // «letra» a mano en el margen
  ink(c, D(t, `M ${-w * 0.28} ${h / 2 - 11} C ${-w * 0.16} ${h / 2 - 17} ${-w * 0.08} ${h / 2 - 6} ${w * 0.02} ${h / 2 - 12} S ${w * 0.2} ${h / 2 - 9} ${w * 0.28} ${h / 2 - 12}`), { stroke: PT.ink, w: 1.2, op: 0.4, seed });
  if (tape) {
    const tp = T(...t(0, -h / 2 + 1), t.deg + 4, t.s);
    fill(c, D(tp, rrect(34, 12, 1.5)), PT.rose, { op: 0.5, kind: "paper", seed: seed + 1 });
    ink(c, D(tp, "M -10 -4 L -10 4 M 10 -4 L 10 4"), { stroke: PT.rose[1], w: 0.8, op: 0.3 });
  }
}
function camera(c, t, seed) {
  // foto que asoma por la ranura
  const ph = T(...t(-14, -40), t.deg - 4, t.s);
  fill(c, D(ph, rrect(54, 46, 2)), PT.cream, { op: 0.96, kind: "paper", seed: seed + 3 });
  fill(c, D(ph, rrect(42, 28, 1, 0, -5)), PT.peach, { op: 0.7, kind: "paper", seed: seed + 3 });
  heartLocal(c, ph, 0, -4, 18, PT.rose, seed, 0.85);
  fill(c, D(t, rrect(104, 76, 13)), PT.mint, { axis: axis(t, -52, -38, 52, 38), op: 0.86, seed });
  shade(c, D(t, rrect(40, 76, 13, 32, 0)), "#2d6a58", { op: 0.15, seed });
  fill(c, D(t, "M -52 -24 L 52 -24 L 52 -25 Q 52 -38 39 -38 L -39 -38 Q -52 -38 -52 -25 Z"), PT.cream, { op: 0.92, kind: "petal", seed: seed + 1 });
  fill(c, D(t, rrect(18, 11, 2, -34, -29)), PT.champ, { op: 0.9, kind: "tiny", seed });
  // objetivo
  fill(c, D(t, ell(30, 30, 8, 6) + ell(22, 22, 8, 6)), [PT.bottle[1], PT.bottle[1]], { op: 0.78, kind: "tiny", seed, extra: 'fill-rule="evenodd"' });
  fill(c, D(t, ell(21, 21, 8, 6)), PT.sky, { axis: axis(t, -10, -10, 28, 26), op: 0.82, kind: "tiny", seed: seed + 1 });
  c.shape(blob(...t(1, -3), 5 * t.s, c.rand, { rough: 0.1, n: 10, sx: 1.3 }), { fill: "#ffffff", op: 0.75, kind: "tiny", seed, edge: false });
  const b = t(-32, 4);
  c.shape(blob(b[0], b[1], 5.5 * t.s, c.rand, { rough: 0.05, n: 12 }), { fill: PT.rose, op: 0.85, kind: "tiny", seed });
}
function polaroidA() {
  const c = mk(451, 360, 360);
  halo(c, 150, 150, 110, PT.peach[0], 0.18, 1);
  polaroid(c, T(108, 110, -9, 1.2), "heart", 1);
  polaroid(c, T(236, 150, 8, 1.02), "hills", 2);
  polaroid(c, T(170, 262, -4, 0.92), "couple", 3, 88, true);
  sparkle(c, 290, 66, 12, 1);
  sparkle(c, 40, 230, 9, 2, PT.rose);
  heart(c, 320, 236, 20, 16, PT.rose, 2);
  heart(c, 280, 316, 13, -12, PT.berry, 3);
  splat(c, 190, 170, 130, 14, PT.coral[1], 2);
  return c;
}
function polaroidB() {
  const c = mk(453, 300, 300);
  halo(c, 120, 120, 90, PT.mint[0], 0.2, 2);
  camera(c, T(100, 112, -8, 1.0), 1);
  polaroid(c, T(212, 196, 9, 0.98), "flower", 2, 88, true);
  sparkle(c, 220, 66, 12, 1);
  sparkle(c, 56, 214, 8, 2, PT.rose);
  heart(c, 258, 96, 18, 14, PT.rose, 2);
  heart(c, 118, 250, 13, -10, PT.berry, 3);
  splat(c, 150, 140, 100, 12, PT.mint[1], 3);
  return c;
}
function polaroidS() {
  const c = mk(457, 320, 118);
  // tendedero con tres fotos
  const ctrl = [[6, 10], [100, 38], [220, 38], [314, 10]];
  c.shape(`M${ctrl[0][0]} ${ctrl[0][1] - 1.2}C${ctrl[1][0]} ${ctrl[1][1] - 1.2} ${ctrl[2][0]} ${ctrl[2][1] - 1.2} ${ctrl[3][0]} ${ctrl[3][1] - 1.2}L${ctrl[3][0]} ${ctrl[3][1] + 1.2}C${ctrl[2][0]} ${ctrl[2][1] + 1.2} ${ctrl[1][0]} ${ctrl[1][1] + 1.2} ${ctrl[0][0]} ${ctrl[0][1] + 1.2}Z`, { fill: PAL.stem, op: 0.7, kind: "stem", seed: 1 });
  [[0.2, "heart", -6], [0.5, "hills", 3], [0.8, "couple", 7]].forEach(([u, kind, rot], i) => {
    const p = bez(ctrl, u);
    polaroid(c, T(p.x, p.y + 38, rot, 0.52), kind, 1 + i, 88, false);
    const pg = T(p.x, p.y + 2, rot, 1);
    fill(c, D(pg, rrect(6, 14, 1.5)), PT.kraft, { op: 0.9, kind: "tiny", seed: i + 1 });
  });
  heart(c, 160, 100, 12, 0, PT.rose, 2);
  sparkle(c, 28, 80, 8, 1);
  sparkle(c, 298, 84, 8, 2, PT.rose);
  return c;
}

/* ---------------------------- cartas de amor ---------------------------- */
function envelope(c, t, { w = 112, h = 78, pal = PT.cream, open = false, seal = true, seed = 1, letter = true } = {}) {
  const deep = mix(pal[1], "#7a3a4a", 0.18);
  if (open) {
    // solapa abierta y carta que asoma
    fill(c, D(t, polyL([[-w / 2, -h / 2], [0, -h / 2 - h * 0.62], [w / 2, -h / 2]])), [mix(pal[0], pal[1], 0.35), deep], { op: 0.78, kind: "paper", seed: seed + 1 });
    if (letter) {
      fill(c, D(t, polyL([[-w * 0.4, -h * 0.84], [w * 0.4, -h * 0.84], [w * 0.4, h * 0.2], [-w * 0.4, h * 0.2]])), PT.cream, { op: 0.97, kind: "paper", seed: seed + 2 });
      ink(c, D(t, `M ${-w * 0.28} ${-h * 0.66} L ${w * 0.28} ${-h * 0.66} M ${-w * 0.28} ${-h * 0.5} L ${w * 0.18} ${-h * 0.5} M ${-w * 0.28} ${-h * 0.34} L ${w * 0.24} ${-h * 0.34}`), { stroke: PT.ink, w: 1, op: 0.32, seed });
      heartLocal(c, t, w * 0.2, -h * 0.26, 14, PT.rose, seed, 0.85);
    }
  }
  const body = polyL([[-w / 2, -h / 2], [0, h * 0.06], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]);
  const full = polyL([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]);
  fill(c, D(t, open ? body : full), pal, { axis: axis(t, -w / 2, -h / 2, w / 2, h / 2), op: 0.94, kind: "paper", seed });
  if (!open) {
    // solapa cerrada
    fill(c, D(t, polyL([[-w / 2, -h / 2], [w / 2, -h / 2], [0, h * 0.1]])), [mix(pal[0], pal[1], 0.3), deep], { axis: axis(t, 0, -h / 2, 0, h * 0.1), op: 0.84, kind: "paper", seed: seed + 1 });
  }
  ink(c, D(t, `M ${-w / 2} ${h / 2} L ${-w * 0.08} ${-h * 0.04} M ${w / 2} ${h / 2} L ${w * 0.08} ${-h * 0.04}`), { stroke: deep, w: 1.1, op: 0.4, seed });
  if (seal) heartLocal(c, t, 0, open ? h * 0.1 : h * 0.1, open ? 22 : 24, PT.rose, seed + 2, 0.92);
}
function loveLettersA() {
  const c = mk(461, 360, 360);
  halo(c, 150, 140, 110, PT.rose[0], 0.16, 1);
  envelope(c, T(128, 140, -12, 1.34), { open: true, pal: PT.blush, seed: 1 });
  envelope(c, T(268, 266, 10, 1.0), { pal: PT.peach, seed: 3 });
  // bramante con lazada
  ink(c, "M 214 70 C 250 86 270 110 276 150", { stroke: PT.rose[1], w: 1.4, op: 0.4 });
  heart(c, 262, 60, 26, 14, PT.rose, 2);
  heart(c, 316, 120, 16, -12, PT.berry, 3);
  heart(c, 48, 252, 16, 12, PT.rose, 4);
  sparkle(c, 214, 34, 11, 1);
  sparkle(c, 310, 196, 9, 2, PT.champ);
  sparkle(c, 70, 40, 8, 3, PT.rose);
  splat(c, 190, 180, 130, 14, PT.rose[1], 2);
  return c;
}
function loveLettersB() {
  const c = mk(463, 300, 300);
  halo(c, 130, 130, 90, PT.lilac[0], 0.2, 2);
  envelope(c, T(110, 112, 9, 1.32), { pal: PT.cream, seed: 1 });
  // carta doblada con corazón
  const t2 = T(206, 214, -12, 0.95);
  fill(c, D(t2, rrect(84, 58, 3)), PT.blush, { axis: axis(t2, -42, -29, 42, 29), op: 0.9, kind: "paper", seed: 3 });
  ink(c, D(t2, "M -42 -10 L 42 -10 M -42 10 L 42 10"), { stroke: PT.rose[1], w: 0.9, op: 0.3 });
  heartLocal(c, t2, 0, 0, 22, PT.rose, 3, 0.9);
  heart(c, 252, 90, 18, 14, PT.rose, 2);
  heart(c, 70, 220, 13, -14, PT.berry, 3);
  sparkle(c, 210, 40, 11, 1);
  sparkle(c, 44, 150, 8, 2, PT.champ);
  splat(c, 150, 140, 100, 12, PT.rose[1], 3);
  return c;
}
function loveLettersS() {
  const c = mk(467, 320, 118);
  halo(c, 160, 60, 80, PT.rose[0], 0.14, 1);
  envelope(c, T(160, 64, -4, 0.82), { pal: PT.blush, seed: 1 });
  envelope(c, T(62, 70, -10, 0.52), { pal: PT.cream, seed: 2 });
  envelope(c, T(262, 66, 9, 0.5), { pal: PT.peach, seed: 3 });
  heart(c, 108, 22, 14, -10, PT.rose, 2);
  heart(c, 216, 100, 12, 14, PT.berry, 3);
  sparkle(c, 296, 24, 9, 1);
  sparkle(c, 24, 28, 8, 2, PT.rose);
  return c;
}

/* ------------------------------- catálogo ------------------------------- */
const piece = (motif, key, build, kind) => ({ name: `${motif}-${key}`, kind, alpha: 55, build });
const trio = (motif, a, b, s) => [piece(motif, "a", a, "corner"), piece(motif, "b", b, "corner"), piece(motif, "s", s, "sprig")];

export const PARTY_MOTIFS = [
  ...trio("rings", ringsA, ringsB, ringsS),
  ...trio("toast", toastA, toastB, toastS),
  ...trio("cake", cakeA, cakeB, cakeS),
  ...trio("bouquet", bouquetA, bouquetB, bouquetS),
  ...trio("polaroid", polaroidA, polaroidB, polaroidS),
  ...trio("loveletters", loveLettersA, loveLettersB, loveLettersS),
];
