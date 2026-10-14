import type { CSSProperties } from "react";
import { ART, DOODLE_NAMES, type DoodleName } from "./art";
import { initialsArt } from "./initials";
import { CELL, DEFAULT_FONT, DOODLE_SETS, artMarkup, doodlePatternSvg, doodleSvg, esc, initialsHeartsSvg, paint, patternBody, type Density } from "./svg";

export { DOODLE_NAMES, DOODLE_SETS, doodlePatternSvg, doodleSvg, initialsHeartsSvg };
export type { DoodleName };

const INK = "currentColor";
const ACC = "var(--doodle-fill, currentColor)";
const NS = "http://www.w3.org/2000/svg";

export function Doodle({ name, className, style, title }: { name: DoodleName; className?: string; style?: CSSProperties; title?: string }) {
  const a = ART[name];
  const html = (title ? `<title>${esc(title)}</title>` : "") + artMarkup(name, INK, ACC);
  return (
    <svg
      xmlns={NS}
      viewBox={`0 0 ${a.vw} ${a.vh}`}
      className={className}
      style={style}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function InitialsHearts({ a, b, className }: { a: string; b: string; className?: string }) {
  const ia = initialsArt(a, b, "var(--font-display), " + DEFAULT_FONT);
  const html = `<g fill="none" stroke="${INK}" stroke-width="${ia.sw}" stroke-linecap="round" stroke-linejoin="round">${paint(ia.body, INK, ACC)}</g>`;
  return (
    <svg xmlns={NS} viewBox={`0 0 ${ia.vw} ${ia.vh}`} className={className} aria-hidden focusable="false" dangerouslySetInnerHTML={{ __html: html }} />
  );
}

function hash(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function DoodlePattern({ names, seed = 1, density = "mid", initials, className }: { names?: readonly DoodleName[]; seed?: number; density?: Density; initials?: { a: string; b: string }; className?: string }) {
  const tile = CELL[density] * 4;
  const font = "var(--font-display), " + DEFAULT_FONT;
  const id = `dp-${seed}-${density}-${hash((names ?? []).join(",") + "|" + (initials ? initials.a + initials.b : ""))}`;
  const inner = patternBody(tile, tile, seed, density, names, initials, true, font, INK, ACC);
  const html = `<defs><pattern id="${id}" width="${tile}" height="${tile}" patternUnits="userSpaceOnUse">${inner}</pattern></defs><rect width="100%" height="100%" fill="url(#${id})"/>`;
  return (
    <div aria-hidden className={className} style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <svg xmlns={NS} width="100%" height="100%" focusable="false" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
