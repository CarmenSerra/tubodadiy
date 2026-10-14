import type { CSSProperties } from "react";
import { BLANK_DOODLE_ART, BLANK_DOODLE_NAMES, isBlankDoodleName, type BlankDoodleName } from "./art";

export { BLANK_DOODLE_NAMES, isBlankDoodleName };
export type { BlankDoodleName };

/** Dibujo del catálogo «Desde cero»: un solo trazado relleno con `currentColor` (usa el color del texto). */
export function BlankDoodle({ name, className, style, title }: { name: BlankDoodleName; className?: string; style?: CSSProperties; title?: string }) {
  const a = BLANK_DOODLE_ART[name];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${a.vw} ${a.vh}`}
      className={className}
      style={style}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <path d={a.d} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}
