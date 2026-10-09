// Catálogo de motivos de acuarela. Cada función devuelve un Canvas (SVG) con
// semilla fija, así que el resultado es reproducible. Las unidades son px del
// WebP final; en la app se muestran a ~60 % de ese tamaño (nitidez en pantallas 1.6x+).
import { Canvas, PAL, bez, blob, f, heartPath, leaf, mix, rng, smooth, stemPath, veins } from "./lib.mjs";

const lerp = (a, b, t) => a + (b - a) * t;
const DEG = Math.PI / 180;

/** Pinta una hoja: lavado en degradado, sombreado de media hoja, nervio y nervios laterales. */
function paintLeaf(c, lf, { pal, op = 0.66, seed, kind = "leaf", vein = true, nVeins = 4, shade = true, tone }) {
  const r = c.rand;
  const t0 = tone ?? r.range(0, 0.4);
  const c1 = mix(pal[0], pal[1], t0);
  const c2 = mix(pal[0], pal[1], Math.min(1, t0 + r.range(0.45, 0.7)));
  const rev = r() < 0.5;
  const [a, b] = rev ? [lf.tip, lf.base] : [lf.base, lf.tip];
  c.shape(lf.d, { fill: [c1, c2], axis: [a[0], a[1], b[0], b[1]], op, kind, seed });
  if (shade) {
    c.shape(r() < 0.5 ? lf.halfL : lf.halfR, { fill: mix(pal[1], "#2f4a40", 0.25), op: 0.2, kind, seed, edge: false });
  }
  if (vein) {
    const deep = mix(pal[1], "#2f4a40", 0.45);
    c.line(lf.mid, { stroke: deep, w: 1.3, op: 0.42, seed });
    if (nVeins) c.line(veins(lf, nVeins), { stroke: deep, w: 0.9, op: 0.22, seed: seed + 1 });
  }
}

/** Rama: tallo que adelgaza + hojas conectadas por peciolo. */
function branch(c, ctrl, leaves, { stem = [6, 2], stemPal = PAL.stem, stemOp = 0.72, seed = 1, nVeins = 4, vein = true } = {}) {
  c.shape(stemPath(ctrl, stem[0], stem[1]), { fill: stemPal, axis: [ctrl[0][0], ctrl[0][1], ctrl[3][0], ctrl[3][1]], op: stemOp, kind: "stem", seed });
  const placed = leaves.map((L, i) => {
    const p = bez(ctrl, L.t);
    const ang = L.ang === undefined ? p.ang + L.side * L.rel : L.ang;
    const a = ang * DEG;
    const pet = L.pet ?? 5;
    const x = p.x + Math.cos(a) * pet;
    const y = p.y + Math.sin(a) * pet;
    const lf = leaf({ x, y, ang, len: L.len, wid: L.wid, bend: L.bend ?? 0, prof: L.prof ?? "lance", asym: L.asym ?? 0 });
    return { L, p, lf, i };
  });
  // Pecíolos primero (por debajo de las hojas)
  for (const { L, p, lf, i } of placed) {
    const pet = L.pet ?? 5;
    if (pet > 0.5) {
      const d = `M${f(p.x)} ${f(p.y)}L${f(lf.base[0])} ${f(lf.base[1])}`;
      c.line(d, { stroke: PAL.stem[1], w: 2.2, op: 0.6, seed: 40 + i });
    }
  }
  for (const { L, lf, i } of placed) {
    paintLeaf(c, lf, { pal: L.pal, op: L.op ?? 0.66, seed: 1 + ((seed + i) % 5), nVeins, vein, tone: L.tone });
  }
}

/* ----------------------------- ramas ----------------------------- */
function eucalyptusRound() {
  const r = rng(11);
  const c = new Canvas(300, 430, r);
  const ctrl = [[76, 424], [56, 300], [104, 160], [226, 40]];
  const leaves = [];
  const pals = [PAL.eucal, PAL.sage, PAL.teal];
  for (let k = 0; k < 7; k++) {
    const t = 0.2 + 0.115 * k;
    const size = lerp(56, 25, (t - 0.2) / 0.72);
    for (const side of [-1, 1]) {
      const len = size * r.range(0.88, 1.1);
      leaves.push({ t: t + (side > 0 ? 0.025 : 0), side, rel: r.range(52, 72), len, wid: len * r.range(0.92, 1.06), prof: "round", bend: r.range(-0.05, 0.05), asym: r.range(-0.06, 0.06), pet: 5 + r() * 2, pal: r.pick(pals) });
    }
  }
  leaves.push({ t: 1, ang: bez(ctrl, 1).ang, len: 24, wid: 22, prof: "round", pet: 2, pal: PAL.eucal, side: 0, rel: 0 });
  branch(c, ctrl, leaves, { stem: [6, 2.2], seed: 2, nVeins: 0 });
  return c;
}

function eucalyptusWillow() {
  const r = rng(23);
  const c = new Canvas(270, 440, r);
  const ctrl = [[56, 432], [44, 250], [74, 96], [196, 52]];
  const leaves = [];
  for (let k = 0; k < 14; k++) {
    const t = 0.16 + 0.058 * k;
    const side = k % 2 ? 1 : -1;
    const len = lerp(92, 56, k / 13) * r.range(0.9, 1.08);
    leaves.push({ t, side, rel: r.range(34, 50), len, wid: len * r.range(0.2, 0.26), prof: "lance", bend: -side * r.range(0.04, 0.12), asym: r.range(-0.1, 0.1), pet: 4, pal: r.pick([PAL.eucal, PAL.sage, PAL.sageDeep]) });
  }
  leaves.push({ t: 1, ang: bez(ctrl, 1).ang, len: 56, wid: 14, prof: "lance", pet: 1, bend: 0.1, pal: PAL.eucal, side: 0, rel: 0 });
  branch(c, ctrl, leaves, { stem: [5.5, 1.8], seed: 3, nVeins: 0 });
  return c;
}

function olive() {
  const r = rng(37);
  const c = new Canvas(250, 440, r);
  const ctrl = [[108, 434], [84, 330], [152, 220], [126, 76]];
  const leaves = [];
  for (let k = 0; k < 8; k++) {
    const t = 0.14 + 0.105 * k;
    const len = lerp(70, 44, k / 7) * r.range(0.92, 1.06);
    for (const side of [-1, 1]) {
      leaves.push({ t: t + (side > 0 ? 0.03 : 0), side, rel: r.range(42, 54), len, wid: len * r.range(0.24, 0.3), prof: "lance", bend: -side * r.range(0.04, 0.12), asym: r.range(-0.08, 0.08), pet: 4, pal: r.pick([PAL.olive, PAL.sageDeep, PAL.sage]) });
    }
  }
  leaves.push({ t: 1, ang: bez(ctrl, 1).ang, len: 50, wid: 14, prof: "lance", pet: 1, pal: PAL.olive, side: 0, rel: 0 });
  branch(c, ctrl, leaves, { stem: [5.5, 1.8], seed: 1, nVeins: 3 });
  return c;
}

function berrySprig() {
  const r = rng(53);
  const c = new Canvas(260, 400, r);
  const ctrl = [[62, 394], [96, 280], [30, 170], [148, 38]];
  const leaves = [];
  for (let k = 0; k < 8; k++) {
    const t = 0.16 + 0.1 * k;
    const side = k % 2 ? 1 : -1;
    const len = lerp(60, 34, k / 7) * r.range(0.92, 1.08);
    leaves.push({ t, side, rel: r.range(46, 62), len, wid: len * r.range(0.5, 0.58), prof: "ovate", bend: side * r.range(0.02, 0.1), asym: r.range(-0.07, 0.07), pet: 5, pal: r.pick([PAL.sage, PAL.sageDeep, PAL.eucal]) });
  }
  leaves.push({ t: 1, ang: bez(ctrl, 1).ang, len: 40, wid: 21, prof: "ovate", pet: 2, pal: PAL.sage, side: 0, rel: 0 });
  // los frutos van por debajo de las hojas finales: se pintan después, con tallitos propios
  branch(c, ctrl, leaves, { stem: [5.5, 1.8], seed: 4, nVeins: 3 });
  const berries = [[0.34, -1, 44], [0.5, 1, 52], [0.66, -1, 40], [0.5, -1, 30]];
  berries.forEach(([t, side, L], i) => {
    const p = bez(ctrl, t);
    const a = (p.ang + side * 70) * DEG;
    const end = [p.x + Math.cos(a) * L, p.y + Math.sin(a) * L + 6];
    const sc = [[p.x, p.y], [p.x + Math.cos(a) * L * 0.4, p.y + Math.sin(a) * L * 0.4 - 6], [end[0] - side * 4, end[1] - 14], end];
    c.shape(stemPath(sc, 2.4, 1.6), { fill: PAL.stem, op: 0.7, kind: "stem", seed: 6 + i });
    const rr = r.range(8.5, 11);
    c.shape(blob(end[0], end[1] + rr * 0.7, rr, r, { rough: 0.04, n: 14 }), { fill: [mix(PAL.lilacDeep[0], PAL.violet[1], 0.3), PAL.violet[1]], axis: [end[0] - rr, end[1] - rr, end[0] + rr, end[1] + rr * 2], op: 0.78, kind: "petal", seed: 2 + i });
    c.shape(blob(end[0] - rr * 0.35, end[1] + rr * 0.15, rr * 0.28, r, { rough: 0.05, n: 10 }), { fill: "#ffffff", op: 0.5, kind: "tiny", seed: 3 + i, edge: false });
  });
  return c;
}

function fern() {
  const r = rng(71);
  const c = new Canvas(240, 430, r);
  const ctrl = [[68, 424], [58, 300], [98, 172], [198, 40]];
  const leaves = [];
  for (let k = 0; k < 20; k++) {
    const t = 0.12 + 0.043 * k;
    const len = (60 * (1 - t) ** 0.65 + 12) * r.range(0.92, 1.06);
    for (const side of [-1, 1]) {
      leaves.push({ t: t + (side > 0 ? 0.012 : 0), side, rel: lerp(78, 52, t), len, wid: len * r.range(0.27, 0.33), prof: "lance", bend: -side * 0.05, pet: 1.5, pal: r.pick([PAL.sage, PAL.sageDeep, PAL.olive]), op: 0.62 });
    }
  }
  leaves.push({ t: 1, ang: bez(ctrl, 1).ang, len: 18, wid: 6, prof: "lance", pet: 0, pal: PAL.sage, side: 0, rel: 0 });
  branch(c, ctrl, leaves, { stem: [4.6, 1.4], seed: 1, vein: false, nVeins: 0 });
  return c;
}

/* ------------------------- hojas sueltas ------------------------- */
function leafLarge() {
  const r = rng(83);
  const c = new Canvas(210, 340, r);
  const stem = [[106, 336], [104, 318], [106, 302], [104, 288]];
  c.shape(stemPath(stem, 4.6, 3), { fill: PAL.stem, op: 0.7, kind: "stem", seed: 1 });
  const lf = leaf({ x: 104, y: 290, ang: -92, len: 272, wid: 128, bend: 0.1, prof: "ovate", asym: 0.07, n: 20 });
  paintLeaf(c, lf, { pal: PAL.sageDeep, op: 0.7, seed: 2, nVeins: 7, tone: 0.2 });
  return c;
}

function leafSlender() {
  const r = rng(97);
  const c = new Canvas(170, 340, r);
  const stem = [[40, 336], [42, 322], [48, 308], [52, 296]];
  c.shape(stemPath(stem, 3.8, 2.6), { fill: PAL.stem, op: 0.7, kind: "stem", seed: 3 });
  const lf = leaf({ x: 52, y: 298, ang: -80, len: 285, wid: 78, bend: 0.2, prof: "lance", asym: -0.05, n: 22 });
  paintLeaf(c, lf, { pal: PAL.teal, op: 0.68, seed: 4, nVeins: 8, tone: 0.1 });
  return c;
}

/* ------------------------------ flores ------------------------------ */
function flowerHead(c, cx, cy, R, rot, { petals = 5, pal = PAL.lilac, wid = 0.95, seed = 1, deepCenter = true } = {}) {
  const r = c.rand;
  for (let i = 0; i < petals; i++) {
    const ang = rot + (i * 360) / petals + r.range(-5, 5);
    const a = ang * DEG;
    const len = R * r.range(0.9, 1.05);
    const lf = leaf({ x: cx + Math.cos(a) * R * 0.07, y: cy + Math.sin(a) * R * 0.07, ang, len, wid: len * wid * r.range(0.9, 1.05), bend: r.range(-0.04, 0.04), prof: "petal", asym: r.range(-0.06, 0.06), n: 14 });
    const light = mix(pal[0], pal[1], r.range(0, 0.35));
    const deep = mix(pal[0], pal[1], r.range(0.65, 1));
    c.shape(lf.d, { fill: [deep, light], axis: [lf.base[0], lf.base[1], lf.tip[0], lf.tip[1]], op: 0.58, kind: "petal", seed: 1 + ((seed + i) % 5) });
    c.line(lf.mid, { stroke: pal[1], w: 1, op: 0.28, seed: seed + i });
  }
  if (deepCenter) {
    c.shape(blob(cx, cy, R * 0.13, r, { rough: 0.08, n: 12 }), { fill: mix(pal[1], "#4b3a70", 0.35), op: 0.75, kind: "tiny", seed });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + r.range(-0.2, 0.2);
      const l1 = R * 0.14, l2 = R * r.range(0.26, 0.34);
      const x1 = cx + Math.cos(a) * l1, y1 = cy + Math.sin(a) * l1, x2 = cx + Math.cos(a) * l2, y2 = cy + Math.sin(a) * l2;
      c.line(`M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}`, { stroke: "#9b7fc0", w: 1, op: 0.6, seed: seed + i });
      c.shape(blob(x2, y2, R * 0.035, r, { rough: 0.05, n: 8 }), { fill: "#c9a85a", op: 0.85, kind: "tiny", seed: seed + i, edge: false });
    }
  }
}

function bud(c, x, y, ang, len, seed, pal = PAL.violet) {
  const lf = leaf({ x, y, ang, len, wid: len * 0.62, prof: "floret", n: 10 });
  c.shape(lf.d, { fill: [pal[0], pal[1]], axis: [lf.base[0], lf.base[1], lf.tip[0], lf.tip[1]], op: 0.7, kind: "tiny", seed });
  const a = ang * DEG;
  for (const s of [-1, 1]) {
    const cl = leaf({ x, y, ang: ang + 180 + s * 38, len: len * 0.5, wid: len * 0.22, prof: "lance", n: 8 });
    c.shape(cl.d, { fill: PAL.sage[1], op: 0.6, kind: "tiny", seed: seed + 1, edge: false });
  }
  return a;
}

function blossomCluster() {
  const r = rng(101);
  const c = new Canvas(300, 390, r);
  const main = [[112, 384], [100, 270], [150, 180], [168, 100]];
  const mk = (t, end, bendx, bendy) => {
    const p = bez(main, t);
    return [[p.x, p.y], [p.x + bendx, p.y + bendy], [end[0] - bendx * 0.2, end[1] + 28], end];
  };
  const sB = mk(0.58, [72, 156], -10, -30);
  const sC = mk(0.42, [236, 196], 20, -22);
  const sD = mk(0.8, [112, 62], -10, -16);
  const sE = mk(0.7, [226, 112], 14, -26);
  const stems = [[main, 6.2, 3], [sB, 3.6, 2.4], [sC, 3.6, 2.4], [sD, 2.8, 2], [sE, 2.8, 2]];
  stems.forEach(([s, a, b], i) => c.shape(stemPath(s, a, b), { fill: PAL.stem, axis: [s[0][0], s[0][1], s[3][0], s[3][1]], op: 0.72, kind: "stem", seed: 1 + i }));
  // Hojas
  const mkLeaf = (curve, t, side, rel, len, wid, pal, i) => {
    const p = bez(curve, t);
    const ang = p.ang + side * rel;
    const a = ang * DEG;
    const lf = leaf({ x: p.x + Math.cos(a) * 4, y: p.y + Math.sin(a) * 4, ang, len, wid, prof: "ovate", bend: side * 0.08 });
    c.line(`M${f(p.x)} ${f(p.y)}L${f(lf.base[0])} ${f(lf.base[1])}`, { stroke: PAL.stem[1], w: 2, op: 0.55, seed: 50 + i });
    paintLeaf(c, lf, { pal, op: 0.64, seed: 1 + (i % 5), nVeins: 3 });
  };
  mkLeaf(main, 0.2, -1, 58, 70, 32, PAL.sage, 1);
  mkLeaf(main, 0.3, 1, 56, 64, 30, PAL.sageDeep, 2);
  mkLeaf(main, 0.46, -1, 52, 52, 25, PAL.sage, 3);
  mkLeaf(sC, 0.5, -1, 50, 38, 19, PAL.sage, 5);
  // Capullos y flores
  bud(c, 112, 62, -105, 24, 3);
  bud(c, 226, 112, -62, 22, 4);
  flowerHead(c, 168, 98, 46, -90, { seed: 1 });
  flowerHead(c, 72, 156, 36, -50, { seed: 2 });
  flowerHead(c, 236, 198, 31, 10, { seed: 3 });
  return c;
}

function lavender() {
  const r = rng(113);
  const c = new Canvas(290, 430, r);
  const stems = [
    [[140, 426], [132, 330], [88, 190], [74, 60]],
    [[142, 426], [146, 300], [160, 160], [150, 26]],
    [[144, 426], [160, 340], [212, 220], [226, 84]],
    [[141, 426], [128, 360], [60, 300], [34, 190]],
  ];
  // Hojas basales largas y estrechas
  for (const [x, ang, len, bend] of [[138, -112, 150, 0.12], [146, -70, 140, -0.12], [142, -128, 110, 0.1]]) {
    const lf = leaf({ x, y: 424, ang, len, wid: 14, prof: "needle", bend });
    paintLeaf(c, lf, { pal: PAL.eucal, op: 0.6, seed: 2, nVeins: 0 });
  }
  stems.forEach((s, i) => c.shape(stemPath(s, 3.4, 1.8), { fill: PAL.stem, axis: [s[0][0], s[0][1], s[3][0], s[3][1]], op: 0.7, kind: "stem", seed: 1 + i }));
  stems.forEach((s, si) => {
    const n = 11;
    for (let k = 0; k < n; k++) {
      const t = 0.56 + 0.44 * (k / n);
      const p = bez(s, t);
      const len = lerp(21, 12, k / n);
      for (const side of [-1, 1]) {
        const ang = p.ang + side * r.range(28, 46);
        const lf = leaf({ x: p.x, y: p.y, ang, len: len * r.range(0.9, 1.1), wid: len * 0.55, prof: "floret", n: 10 });
        const pal = r.pick([PAL.violet, PAL.lilacDeep, PAL.lilacDeep]);
        c.shape(lf.d, { fill: [mix(pal[0], pal[1], 0.2), mix(pal[0], pal[1], 0.85)], axis: [lf.base[0], lf.base[1], lf.tip[0], lf.tip[1]], op: 0.68, kind: "tiny", seed: 1 + ((si + k) % 5) });
      }
    }
    const tip = bez(s, 1);
    const lf = leaf({ x: tip.x, y: tip.y, ang: tip.ang, len: 13, wid: 7, prof: "floret", n: 8 });
    c.shape(lf.d, { fill: PAL.violet[1], op: 0.7, kind: "tiny", seed: si + 2 });
  });
  return c;
}

function bloom() {
  const r = rng(127);
  const c = new Canvas(270, 370, r);
  const stem = [[132, 364], [122, 290], [142, 220], [132, 148]];
  c.shape(stemPath(stem, 6, 4.4), { fill: PAL.stem, op: 0.72, kind: "stem", seed: 2 });
  const mkLeaf = (t, side, len, wid, pal, i) => {
    const p = bez(stem, t);
    const ang = p.ang + side * 52;
    const a = ang * DEG;
    const lf = leaf({ x: p.x + Math.cos(a) * 5, y: p.y + Math.sin(a) * 5, ang, len, wid, prof: "ovate", bend: side * 0.1 });
    c.line(`M${f(p.x)} ${f(p.y)}L${f(lf.base[0])} ${f(lf.base[1])}`, { stroke: PAL.stem[1], w: 2.2, op: 0.55, seed: 20 + i });
    paintLeaf(c, lf, { pal, op: 0.66, seed: 1 + i, nVeins: 4 });
  };
  mkLeaf(0.3, -1, 92, 40, PAL.sageDeep, 1);
  mkLeaf(0.5, 1, 78, 34, PAL.sage, 2);
  flowerHead(c, 132, 122, 84, -90, { petals: 8, pal: PAL.lilac, wid: 0.78, seed: 1, deepCenter: false });
  flowerHead(c, 132, 122, 56, -68, { petals: 6, pal: PAL.lilacDeep, wid: 0.82, seed: 3, deepCenter: true });
  return c;
}

/* ----------------------------- alianzas ----------------------------- */
function ellipseBand(cx, cy, rx, ry, th, rot) {
  const e = (a, b) => `M${f(-a)} 0a${f(a)} ${f(b)} 0 1 0 ${f(2 * a)} 0a${f(a)} ${f(b)} 0 1 0 ${f(-2 * a)} 0Z`;
  return { d: e(rx, ry) + e(rx - th, ry - th * 0.9), tf: `translate(${cx} ${cy}) rotate(${rot})`, outer: e(rx, ry) };
}

function ringPaint(c, cx, cy, rx, ry, th, rot, seed, clip) {
  const b = ellipseBand(cx, cy, rx, ry, th, rot);
  const g = c.grad(cx - rx, cy - ry, cx + rx, cy + ry, PAL.gold[0], PAL.gold[1]);
  const fid = c.filter("band", seed, true);
  const body = `<g filter="url(#${fid})"><path transform="${b.tf}" d="${b.d}" fill-rule="evenodd" fill="url(#${g})" fill-opacity="0.86"/></g>`;
  if (clip) {
    const cid = `clip${c.n++}`;
    c.defs.push(`<clipPath id="${cid}"><circle cx="${f(clip[0])}" cy="${f(clip[1])}" r="${f(th * 1.5)}"/></clipPath>`);
    c.body.push(`<g clip-path="url(#${cid})">${body}</g>`);
  } else c.body.push(body);
  // Brillo arriba-izquierda y sombra abajo-derecha
  const rot0 = (rot * Math.PI) / 180;
  const arc = (a0, a1, rr) => {
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const a = a0 + ((a1 - a0) * i) / 14;
      const x = Math.cos(a) * rr[0], y = Math.sin(a) * rr[1];
      pts.push([cx + x * Math.cos(rot0) - y * Math.sin(rot0), cy + x * Math.sin(rot0) + y * Math.cos(rot0)]);
    }
    return smooth(pts, false);
  };
  const midr = [rx - th * 0.5, ry - th * 0.45];
  if (!clip) {
    c.line(arc(Math.PI * 1.05, Math.PI * 1.55, midr), { stroke: "#fffaf0", w: th * 0.2, op: 0.8, seed: seed + 1 });
    c.line(arc(Math.PI * 0.1, Math.PI * 0.5, midr), { stroke: "#7d5f2a", w: th * 0.22, op: 0.28, seed: seed + 2 });
  }
}

/** Puntos donde se cruzan las líneas centrales de dos alianzas elípticas. */
function crossings(A, B) {
  const pt = (E, a) => {
    const r = (E.rot * Math.PI) / 180;
    const x = Math.cos(a) * (E.rx - E.th / 2), y = Math.sin(a) * (E.ry - E.th * 0.45);
    return [E.cx + x * Math.cos(r) - y * Math.sin(r), E.cy + x * Math.sin(r) + y * Math.cos(r)];
  };
  const val = (E, p) => {
    const r = (-E.rot * Math.PI) / 180;
    const dx = p[0] - E.cx, dy = p[1] - E.cy;
    const x = dx * Math.cos(r) - dy * Math.sin(r), y = dx * Math.sin(r) + dy * Math.cos(r);
    return (x / (E.rx - E.th / 2)) ** 2 + (y / (E.ry - E.th * 0.45)) ** 2 - 1;
  };
  const out = [];
  let prev = val(B, pt(A, 0));
  for (let i = 1; i <= 720; i++) {
    const p = pt(A, (i / 720) * Math.PI * 2);
    const v = val(B, p);
    if (prev * v < 0) out.push(p);
    prev = v;
  }
  return out;
}

function rings() {
  const r = rng(131);
  const c = new Canvas(330, 260, r);
  const A = { cx: 120, cy: 138, rx: 76, ry: 94, th: 21, rot: -16 };
  const B = { cx: 208, cy: 132, rx: 76, ry: 94, th: 21, rot: 18 };
  ringPaint(c, A.cx, A.cy, A.rx, A.ry, A.th, A.rot, 1);
  ringPaint(c, B.cx, B.cy, B.rx, B.ry, B.th, B.rot, 3);
  // Entrelazado: en el cruce de arriba pasa A por encima, en el de abajo, B.
  const xs = crossings(A, B).sort((p, q) => p[1] - q[1]);
  if (xs.length >= 2) {
    ringPaint(c, A.cx, A.cy, A.rx, A.ry, A.th, A.rot, 1, xs[0]);
    ringPaint(c, B.cx, B.cy, B.rx, B.ry, B.th, B.rot, 3, xs[xs.length - 1]);
  }
  c.line("M164 20L164 42M152 31L176 31M155 22L173 40M173 22L155 40", { stroke: "#a38ed2", w: 1.6, op: 0.5, seed: 4 });
  return c;
}

const poly = (pts) => "M" + pts.map((p) => `${f(p[0])} ${f(p[1])}`).join("L") + "Z";

function ringStone() {
  const r = rng(137);
  const c = new Canvas(230, 290, r);
  ringPaint(c, 114, 190, 62, 82, 21, 0, 2);
  // Engaste y piedra (talla brillante vista de frente), apoyada en lo alto de la alianza
  const cx = 114, cy = 84;
  c.shape(blob(cx, cy + 26, 22, r, { rough: 0.03, n: 12, sy: 0.45 }), { fill: PAL.gold, axis: [cx - 22, cy, cx + 22, cy + 30], op: 0.85, kind: "tiny", seed: 3 });
  const g = (x, y) => [cx + x, cy + y];
  const facets = [
    [[g(-13, -14), g(13, -14), g(8, -2), g(-8, -2)], ["#F6F4FD", "#E2DAF4"]],
    [[g(-13, -14), g(-8, -2), g(-23, -2)], ["#D9E1F3", "#B9C2E6"]],
    [[g(13, -14), g(23, -2), g(8, -2)], ["#DDD3F2", "#B7A6DE"]],
    [[g(-23, -2), g(-8, -2), g(0, 26)], ["#BBC7E8", "#9A90CF"]],
    [[g(-8, -2), g(8, -2), g(0, 26)], ["#E9E4F8", "#C5B8EA"]],
    [[g(8, -2), g(23, -2), g(0, 26)], ["#B3A5DD", "#8C78C2"]],
  ];
  facets.forEach(([pts, cols], i) => c.shape(poly(pts), { fill: cols, axis: [cx - 20, cy - 14, cx + 20, cy + 26], op: 0.82, kind: "tiny", seed: 1 + i, edge: false }));
  c.line(poly([g(-13, -14), g(13, -14), g(23, -2), g(0, 26), g(-23, -2)]) + `M${f(cx - 23)} ${f(cy - 2)}L${f(cx + 23)} ${f(cy - 2)}M${f(cx - 8)} ${f(cy - 2)}L${f(cx - 13)} ${f(cy - 14)}M${f(cx + 8)} ${f(cy - 2)}L${f(cx + 13)} ${f(cy - 14)}M${f(cx - 8)} ${f(cy - 2)}L${f(cx)} ${f(cy + 26)}M${f(cx + 8)} ${f(cy - 2)}L${f(cx)} ${f(cy + 26)}`, { stroke: "#6f5a9c", w: 1.1, op: 0.55, seed: 6 });
  c.line("M178 30L178 56M165 43L191 43M169 34L187 52M187 34L169 52", { stroke: "#a38ed2", w: 1.8, op: 0.55, seed: 8 });
  c.line("M48 52L48 66M41 59L55 59", { stroke: "#a38ed2", w: 1.5, op: 0.45, seed: 9 });
  return c;
}

/* ----------------------------- corazones ----------------------------- */
function heartLilac() {
  const r = rng(149);
  const c = new Canvas(210, 200, r);
  c.shape(heartPath(105, 98, 150, -8), { fill: PAL.lilac, axis: [40, 20, 170, 170], op: 0.8, kind: "heart", seed: 2 });
  c.shape(heartPath(110, 108, 96, -8), { fill: PAL.lilacDeep[1], op: 0.18, kind: "heart", seed: 2, edge: false });
  c.shape(blob(71, 64, 11, r, { rough: 0.15, n: 12, sx: 1.5 }), { fill: "#ffffff", op: 0.4, kind: "tiny", seed: 4, edge: false });
  return c;
}

function heartsPair() {
  const r = rng(151);
  const c = new Canvas(250, 210, r);
  c.shape(heartPath(96, 108, 128, -14), { fill: PAL.lilacDeep, axis: [40, 40, 150, 170], op: 0.74, kind: "heart", seed: 1 });
  c.shape(heartPath(172, 78, 74, 16), { fill: PAL.sage, axis: [140, 40, 210, 120], op: 0.76, kind: "heart", seed: 3 });
  c.shape(heartPath(198, 162, 40, -6), { fill: PAL.lilac, op: 0.82, kind: "petal", seed: 3 });
  c.shape(blob(64, 74, 9, r, { rough: 0.15, n: 12, sx: 1.5 }), { fill: "#ffffff", op: 0.35, kind: "tiny", seed: 4, edge: false });
  return c;
}

/* ------------------------------ manchas ------------------------------ */
function wash(seed, w, h, layers, drops = 0) {
  const r = rng(seed);
  const c = new Canvas(w, h, r);
  layers.forEach(([cx, cy, rad, pal, op, rough, sx = 1, sy = 1], i) => {
    c.shape(blob(cx, cy, rad, r, { rough, n: 30, sx, sy }), { fill: pal, axis: [cx - rad, cy - rad, cx + rad, cy + rad], op, kind: "wash", seed: 1 + ((seed + i) % 5) });
  });
  if (drops) {
    let inner = "";
    for (let i = 0; i < drops; i++) {
      const a = r.range(0, Math.PI * 2);
      const dist = r.range(0.6, 0.97) * (Math.min(w, h) / 2 - 8);
      const rr = r.range(1.6, 6.5) * (r() < 0.2 ? 1.6 : 1);
      const col = r.pick([PAL.lilacDeep[0], PAL.sage[1], PAL.violet[0], PAL.sage[0]]);
      inner += `<circle cx="${f(w / 2 + Math.cos(a) * dist * 1.15)}" cy="${f(h / 2 + Math.sin(a) * dist)}" r="${f(rr)}" fill="${col}" fill-opacity="0.7"/>`;
    }
    c.group(inner, { kind: "tiny", seed: 3, edge: true });
  }
  return c;
}
const washLilac = () => wash(163, 400, 340, [[200, 170, 125, PAL.lilac, 0.62, 0.3, 1.15, 0.92], [225, 190, 86, PAL.lilacDeep, 0.3, 0.28, 1, 1], [150, 140, 60, PAL.lilac, 0.28, 0.3]]);
const washSage = () => wash(167, 400, 340, [[200, 170, 125, PAL.sage, 0.62, 0.3, 1.1, 0.95], [170, 160, 85, PAL.sageDeep, 0.3, 0.26], [240, 210, 58, PAL.eucal, 0.3, 0.3]]);
const splash = () => wash(173, 380, 340, [[170, 160, 100, PAL.lilac, 0.62, 0.3, 1.1], [215, 185, 78, PAL.sage, 0.5, 0.3], [180, 140, 52, PAL.lilacDeep, 0.28, 0.3]], 20);

/* -------------------------- mini ramita (logo) -------------------------- */
function sprigMini() {
  const r = rng(181);
  const c = new Canvas(136, 68, r, 0.55);
  const ctrl = [[6, 54], [34, 62], [76, 52], [110, 22]];
  const leaves = [];
  for (let k = 0; k < 5; k++) {
    const t = 0.2 + 0.15 * k;
    const side = k % 2 ? -1 : 1;
    const len = lerp(27, 17, k / 4);
    leaves.push({ t, side, rel: 50, len, wid: len * 0.5, prof: "ovate", bend: side * 0.06, pet: 3, pal: k % 2 ? PAL.sageDeep : PAL.sage });
  }
  branch(c, ctrl, leaves, { stem: [3, 1.4], seed: 2, nVeins: 0, vein: false });
  bud(c, 110, 22, bez(ctrl, 1).ang - 5, 20, 3);
  return c;
}

export const MOTIFS = [
  { name: "branch-eucalyptus-round", down: 0.92, kind: "branch", build: eucalyptusRound },
  { name: "branch-eucalyptus-willow", down: 0.88, kind: "branch", build: eucalyptusWillow },
  { name: "branch-olive", down: 0.92, kind: "branch", build: olive },
  { name: "branch-berries", kind: "branch", build: berrySprig },
  { name: "branch-fern", down: 0.84, kind: "branch", build: fern },
  { name: "leaf-large", alpha: 55, kind: "leaf", build: leafLarge },
  { name: "leaf-slender", alpha: 55, kind: "leaf", build: leafSlender },
  { name: "flower-blossoms", down: 0.86, kind: "flower", build: blossomCluster },
  { name: "flower-lavender", down: 0.78, kind: "flower", build: lavender },
  { name: "flower-bloom", down: 0.95, kind: "flower", build: bloom },
  { name: "rings", kind: "ring", build: rings },
  { name: "ring-stone", kind: "ring", build: ringStone },
  { name: "heart-lilac", alpha: 55, kind: "heart", build: heartLilac },
  { name: "hearts-pair", alpha: 55, kind: "heart", build: heartsPair },
  { name: "wash-lilac", alpha: 70, kind: "wash", down: 0.7, build: washLilac },
  { name: "wash-sage", alpha: 70, kind: "wash", down: 0.7, build: washSage },
  { name: "splash", alpha: 70, kind: "wash", down: 0.7, build: splash },
  { name: "sprig-mini", kind: "mini", build: sprigMini },
];
