import { ART, DOODLE_NAMES, type DoodleName } from "./art";
import { initialsArt } from "./initials";

export type Density = "low" | "mid" | "high";

export const DOODLE_SETS: { party: DoodleName[]; travel: DoodleName[]; romance: DoodleName[]; classic: DoodleName[] } = {
  party: ["coupes", "wineGlass", "flute", "martini", "sodaBottle", "heartCake", "cakeSlice", "tieredCake", "candle", "discoBall", "heel", "loafer", "sparkle", "polaroid", "instantCamera"],
  travel: ["planeWindow", "instantCamera", "polaroid", "sodaBottle", "envelope", "car", "sparkle", "heart", "wineGlass"],
  romance: ["rings", "ring", "handRing", "heart", "heartCake", "bouquet", "flowers", "envelope", "waxSeal", "bow", "sparkle", "wineGlass", "polaroid"],
  classic: ["rings", "bouquet", "flowers", "sprig", "bow", "envelope", "waxSeal", "candle", "tieredCake", "flute", "heart", "sparkle", "ring"],
};

const clean = (s: string) => s.replace(/[<>"&]/g, "");
export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Tinta/acento sustituidos en un cuerpo con tokens. */
export function paint(body: string, ink: string, acc: string): string {
  return body.split("§I").join(ink).split("§A").join(acc);
}

export function artMarkup(name: DoodleName, ink: string, acc: string): string {
  const a = ART[name];
  return `<g fill="none" stroke="${ink}" stroke-width="${a.sw}" stroke-linecap="round" stroke-linejoin="round">${paint(a.body, ink, acc)}</g>`;
}

const SCALE = 4;
function wrapSvg(vw: number, vh: number, inner: string, w = vw * SCALE, h = vh * SCALE): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}" width="${w}" height="${h}">${inner}</svg>`;
}

export function doodleSvg(name: DoodleName, color: string, fill?: string): string {
  const a = ART[name];
  return wrapSvg(a.vw, a.vh, artMarkup(name, clean(color), clean(fill ?? color)));
}

export const DEFAULT_FONT = "Georgia, 'Times New Roman', serif";

export function initialsHeartsSvg(a: string, b: string, color: string, fill?: string, fontFamily?: string): string {
  const ia = initialsArt(a, b, fontFamily ? esc(fontFamily) : DEFAULT_FONT);
  const c = clean(color);
  return wrapSvg(ia.vw, ia.vh, `<g fill="none" stroke="${c}" stroke-width="${ia.sw}" stroke-linecap="round" stroke-linejoin="round">${paint(ia.body, c, clean(fill ?? color))}</g>`);
}

/* ---------- patrón ---------- */

// PRNG determinista
function rng(seed: number) {
  let s = (Math.floor(seed) * 2654435761 + 12345) >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

export const CELL: Record<Density, number> = { low: 170, mid: 124, high: 92 };
const EXCLUDED = new Set<DoodleName>(["threadHands", "couple", "heartCouple", "car", "cornerSwirl"]);
export const DEFAULT_PATTERN_NAMES: DoodleName[] = DOODLE_NAMES.filter((n) => !EXCLUDED.has(n));

type Item = { name: DoodleName | "initials"; x: number; y: number; rot: number };

function layout(w: number, h: number, seed: number, density: Density, names: readonly DoodleName[], hasInitials: boolean, wrap: boolean): Item[] {
  const r = rng(seed);
  const s = CELL[density];
  const cols = wrap ? Math.max(2, Math.round(w / s)) : Math.ceil(w / s) + 2;
  const rows = wrap ? Math.max(2, Math.round(h / s)) : Math.ceil(h / s) + 2;
  const cw = wrap ? w / cols : s;
  const ch = wrap ? h / rows : s * 0.92;
  const pool = names.length ? names : DEFAULT_PATTERN_NAMES;
  let deck: DoodleName[] = [];
  const draw = (avoid: Set<string>): DoodleName => {
    for (let tries = 0; tries < 8; tries++) {
      if (!deck.length) {
        deck = [...pool];
        for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
      }
      const idx = deck.findIndex((d) => !avoid.has(d));
      if (idx >= 0) return deck.splice(idx, 1)[0];
      if (tries === 7) return deck.pop() as DoodleName;
      deck = [];
    }
    return pool[0];
  };
  const grid: string[][] = [];
  const items: Item[] = [];
  const initEvery = hasInitials ? 7 : 0;
  let n = 0;
  for (let j = 0; j < rows; j++) {
    grid[j] = [];
    for (let i = 0; i < cols; i++) {
      const off = j % 2 ? 0.5 : 0;
      const jx = (r() - 0.5) * cw * 0.16;
      const jy = (r() - 0.5) * ch * 0.16;
      const x = (i + 0.5 + off) * cw - (wrap ? 0 : cw) + jx;
      const y = (j + 0.5) * ch - (wrap ? 0 : ch) + jy;
      const rot = (r() - 0.5) * 56;
      const avoid = new Set<string>([grid[j][i - 1], grid[j - 1]?.[i], grid[j - 1]?.[i + 1], grid[j - 1]?.[i - 1]].filter(Boolean) as string[]);
      const isInit = initEvery > 0 && (n + (j % 2) * 2) % initEvery === 2;
      n++;
      const name: DoodleName | "initials" = isInit ? "initials" : draw(avoid);
      grid[j][i] = name;
      items.push({ name, x, y, rot });
      if (wrap && x + cw * 0.5 > w) items.push({ name, x: x - w, y, rot });
    }
  }
  return items;
}

export function patternBody(w: number, h: number, seed: number, density: Density, names: readonly DoodleName[] | undefined, initials: { a: string; b: string } | undefined, wrap: boolean, font: string, ink: string, acc: string): string {
  const s = CELL[density];
  const ia = initials ? initialsArt(initials.a, initials.b, font) : null;
  const items = layout(w, h, seed, density, names ?? DEFAULT_PATTERN_NAMES, !!ia, wrap);
  let out = "";
  for (const it of items) {
    const a = it.name === "initials" ? (ia as NonNullable<typeof ia>) : ART[it.name];
    const k = (s * 0.66 * a.k) / Math.max(a.vw, a.vh);
    const body = paint(a.body, ink, acc);
    const sw = Math.max(a.sw, (s * 0.014) / k).toFixed(2);
    out += `<g transform="translate(${it.x.toFixed(1)} ${it.y.toFixed(1)}) rotate(${it.rot.toFixed(1)}) scale(${k.toFixed(3)}) translate(${-a.vw / 2} ${-a.vh / 2})" fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;
  }
  return out;
}

export function doodlePatternSvg(opts: { width: number; height: number; color: string; fill?: string; seed?: number; density?: Density; initials?: { a: string; b: string }; fontFamily?: string }): string {
  const color = clean(opts.color);
  const fill = clean(opts.fill ?? opts.color);
  const inner = patternBody(opts.width, opts.height, opts.seed ?? 1, opts.density ?? "mid", undefined, opts.initials, false, opts.fontFamily ? esc(opts.fontFamily) : DEFAULT_FONT, color, fill);
  return wrapSvg(opts.width, opts.height, `<g>${inner}</g>`, opts.width, opts.height);
}
