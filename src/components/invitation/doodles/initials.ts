import type { Art } from "./art";
import { H, P, G, heartPts, scallop, seedDraw } from "./draw";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Dos corazones festoneados con una inicial cada uno. `font` ya va escapado para atributo. */
export function initialsArt(a: string, b: string, font: string): Art {
  seedDraw(77);
  const L = (s: string) => esc((s.trim().charAt(0) || "·").toUpperCase());
  const heart = (cx: number, rot: number, letter: string) =>
    G(
      `rotate(${rot} ${cx} 50)`,
      P(scallop(heartPts(cx, 50, 82, 22), 0.94)) +
        P(H(cx, 50, 64, { j: 0.25 })) +
        `<text x="${cx}" y="${50 + 13}" text-anchor="middle" font-family="${font}" font-size="40" font-weight="700" fill="§I" stroke="none">${letter}</text>`,
    );
  return { vw: 190, vh: 100, sw: 2, k: 1.5, body: heart(52, -8, L(a)) + heart(138, 8, L(b)) };
}
