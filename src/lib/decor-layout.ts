import { WATERCOLOR, type WatercolorKind, type WatercolorName } from "@/components/brand/watercolor-assets";

// Reparto aleatorio (pero estable) de las acuarelas del fondo de la app: la semilla es
// la ruta, así que cada página tiene su propia composición, no cambia al volver a ella y
// el servidor y el cliente pintan lo mismo (sin desajustes de hidratación).
//
// Todo va a los márgenes: cada motivo se ancla a un borde (izquierdo, derecho o inferior,
// solo en las esquinas) y se sale un poco de la pantalla, para que el contenido central y
// los títulos queden libres. Los 4 primeros son los que se ven en móvil.

export type DecorItem = {
  name: WatercolorName;
  side: "l" | "r" | "b";
  /** % a lo largo del borde (vertical en l/r, horizontal en b). */
  pos: number;
  /** Ancho en px en escritorio (en móvil se escala con --decor-scale). */
  width: number;
  /** Fracción del motivo que se sale de la pantalla (0-1). */
  bleed: number;
  rot: number;
  flip: boolean;
  opacity: number;
  mobile: boolean;
};

function hash(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const names = (kind: WatercolorKind) =>
  (Object.keys(WATERCOLOR) as WatercolorName[]).filter((n) => WATERCOLOR[n].kind === kind);

const POOLS = {
  wash: names("wash"),
  plant: [...names("branch"), ...names("leaf")],
  flower: names("flower"),
  small: [...names("ring"), ...names("heart")],
};

// Ancho en escritorio por familia [mín, máx] y opacidad [mín, máx].
const SIZE: Record<WatercolorKind, [number, number]> = {
  branch: [145, 195],
  leaf: [95, 135],
  flower: [120, 160],
  ring: [95, 130],
  heart: [70, 95],
  wash: [320, 440],
  mini: [60, 60],
};
const OPACITY: Record<WatercolorKind, [number, number]> = {
  branch: [0.55, 0.72],
  leaf: [0.5, 0.65],
  flower: [0.6, 0.78],
  ring: [0.55, 0.7],
  heart: [0.55, 0.7],
  wash: [0.6, 0.85],
  mini: [0.7, 0.7],
};

type Slot = { side: DecorItem["side"]; pos: number };
// El borde izquierdo no empieza hasta el 44 %: arriba a la izquierda van los títulos.
const EDGE: Slot[] = [
  ...[44, 68, 90].map((pos) => ({ side: "l" as const, pos })),
  ...[20, 46, 70, 92].map((pos) => ({ side: "r" as const, pos })),
  ...[7, 20].map((pos) => ({ side: "b" as const, pos })),
  ...[80, 93].map((pos) => ({ side: "b" as const, pos })),
];
const WASH_SLOTS: Slot[] = [
  { side: "r", pos: 4 },
  { side: "l", pos: 96 },
  { side: "l", pos: 40 },
  { side: "r", pos: 62 },
];

export function decorLayout(seed: string): DecorItem[] {
  const rand = mulberry32(hash(seed));
  const range = (lo: number, hi: number) => lo + (hi - lo) * rand();
  const shuffle = <T,>(arr: readonly T[]) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const pools = {
    wash: shuffle(POOLS.wash),
    plant: shuffle(POOLS.plant),
    flower: shuffle(POOLS.flower),
    small: shuffle(POOLS.small),
  };
  const used: Slot[] = [];
  const near = (a: Slot, b: Slot) => a.side === b.side && Math.abs(a.pos - b.pos) < 26;
  const take = (cands: Slot[]): Slot | undefined => {
    const free = shuffle(cands).find((s) => !used.some((u) => near(u, s)));
    if (free) used.push(free);
    return free;
  };

  const out: DecorItem[] = [];
  const add = (name: WatercolorName | undefined, slot: Slot | undefined, mobile: boolean) => {
    if (!name || !slot) return;
    const kind = WATERCOLOR[name].kind;
    const { w, h } = WATERCOLOR[name];
    const [w0, w1] = SIZE[kind];
    // Hacia dentro: los motivos del borde izquierdo se inclinan a la derecha y viceversa.
    const lean = slot.side === "l" ? 1 : slot.side === "r" ? -1 : 0;
    const small = kind === "ring" || kind === "heart";
    const rot =
      kind === "wash" ? range(-25, 25) : slot.side === "b" ? range(-22, 22) : small ? range(-30, 30) : lean * range(4, 22) + range(-5, 5);
    out.push({
      name,
      side: slot.side,
      pos: Math.min(97, Math.max(3, slot.pos + range(-3, 3))),
      width: Math.round(range(w0, w1)),
      bleed: kind === "wash" ? range(0.25, 0.42) : slot.side === "b" ? range(0.05, 0.18) * (h / w) : range(0.14, 0.36),
      rot: Math.round(rot),
      flip: rand() < 0.5,
      opacity: Number(range(...OPACITY[kind]).toFixed(2)),
      mobile,
    });
  };

  const edgeL = EDGE.filter((s) => s.side === "l");
  const edgeR = EDGE.filter((s) => s.side === "r");
  const bottom = EDGE.filter((s) => s.side === "b");
  const lower = (s: Slot) => s.side === "b" || s.pos >= 50;

  // --- Móvil (los 4 primeros): mancha, una planta, una flor abajo y un detalle arriba ---
  const mainSide = rand() < 0.5 ? "l" : "r";
  add(pools.wash.pop(), take(WASH_SLOTS.filter((s) => s.pos > 50 || s.side === "r").slice(0, 2)), true);
  add(pools.plant.pop(), take((mainSide === "l" ? edgeL : edgeR).filter(lower)), true);
  add(pools.flower.pop(), take(bottom.filter((s) => (mainSide === "l" ? s.pos > 50 : s.pos < 50))), true);
  add(pools.small.pop(), take(mainSide === "l" ? edgeR.filter((s) => s.pos < 50) : edgeL.slice(0, 1)), true);

  // --- Solo escritorio: otra mancha y 3-5 más entre plantas, flores y detalles ---
  add(pools.wash.pop(), take(WASH_SLOTS.slice(2)), false);
  const extra = 2 + Math.floor(rand() * 3);
  const order: (keyof typeof pools)[] = shuffle(["plant", "plant", "flower", "small", "plant", "flower"] as const).slice(0, extra);
  for (const k of order) add(pools[k].pop(), take(EDGE), false);

  return out;
}
