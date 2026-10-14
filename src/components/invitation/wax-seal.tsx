import { contrast, isHex, luminance, mix, normalizeHex, type PaletteColors } from "@/components/invitation/invitation-theme";

import "./invitation.css";

/** Último recurso si nada de la paleta sirve: el color del sobre, muy oscurecido. */
const WAX_FALLBACK_SHADE = 0.5;
/** Contraste mínimo entre el lacre y el papel del sobre para que el sello destaque. */
const MIN_CONTRAST = 2.1;

/**
 * Color del lacre: sale de la paleta de la invitación (acento, principal u oscuro) y
 * es el que más se separa del sobre, para que el sello se vea y a la vez combine
 * (mismo tono que la invitación). Si queda demasiado parecido al papel se acerca a
 * negro (sobre claro) o a blanco (sobre oscuro) hasta ganar contraste; si la paleta
 * no ofrece nada, es el propio color del sobre oscurecido.
 */
export function resolveSealColor(envelope: string, colors: PaletteColors): string {
  const paper = normalizeHex(envelope) ?? "#7a8a5a";
  const candidates = [colors.accent, colors.primary, colors.dark].filter(isHex);
  let best: string | null = null;
  let bestContrast = 0;
  for (const candidate of candidates) {
    const c = contrast(candidate, paper);
    if (c > bestContrast + 1e-6) {
      best = candidate;
      bestContrast = c;
    }
  }
  // El lacre es algo más profundo que el color de la paleta.
  let wax = best ? mix(best, "#000000", 0.14) : mix(paper, "#000000", WAX_FALLBACK_SHADE);
  const toward = luminance(paper) > 0.3 ? "#000000" : "#ffffff";
  for (let step = 0; step < 8 && contrast(wax, paper) < MIN_CONTRAST; step++) wax = mix(wax, toward, 0.12);
  return wax;
}

/** Contorno irregular del lacre (una gota de cera aplastada, con el borde ondulado). */
const BLOB =
  "M50 5 C62 3 71 8 79 14 C89 17 95 27 94 38 C99 47 97 58 92 66 C91 78 82 88 71 90 C63 97 52 98 44 94 C33 97 22 91 17 82 C7 77 3 65 7 55 C2 46 5 34 12 27 C13 16 23 9 33 9 C38 5 44 5 50 5 Z";
/** Corazón centrado en (50, 52), de unos 38 de ancho. */
const HEART =
  "M50 72 C36 63 26 54 26 43 C26 35 32 30 39 30 C44 30 48 33 50 37 C52 33 56 30 61 30 C68 30 74 35 74 43 C74 54 64 63 50 72 Z";

/**
 * Sello de lacre con un corazón en relieve. Dibujo SVG sin hooks (vale para servidor
 * y cliente); el botón que lo rodea lo pone quien lo usa. `color` ya viene resuelto
 * (ver `resolveSealColor`).
 */
export function WaxSeal({ color, className }: { color: string; className?: string }) {
  const base = normalizeHex(color) ?? "#8a3a3a";
  const uid = `seal-${base.slice(1)}`;
  const rim = mix(base, "#000000", 0.28);
  const shine = mix(base, "#ffffff", 0.32);
  const deep = mix(base, "#000000", 0.42);
  const hi = mix(base, "#ffffff", 0.34);

  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className={className}>
      <defs>
        <radialGradient id={`${uid}-wax`} cx="36%" cy="30%" r="82%">
          <stop offset="0" stopColor={shine} />
          <stop offset="0.45" stopColor={base} />
          <stop offset="1" stopColor={rim} />
        </radialGradient>
        <linearGradient id={`${uid}-dish`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor={deep} stopOpacity="0.55" />
          <stop offset="0.55" stopColor={base} stopOpacity="0" />
          <stop offset="1" stopColor={shine} stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <path d={BLOB} fill={`url(#${uid}-wax)`} />
      <path d={BLOB} fill="none" stroke={deep} strokeOpacity="0.35" strokeWidth="1.2" />
      {/* Borde elevado y hueco interior, como el que deja el sello al presionar */}
      <circle cx="50" cy="50" r="33" fill={`url(#${uid}-dish)`} stroke={deep} strokeOpacity="0.5" strokeWidth="1.6" />
      <circle cx="50" cy="50" r="35.2" fill="none" stroke={hi} strokeOpacity="0.38" strokeWidth="1" />
      {/* Corazón en relieve: luz arriba a la izquierda, sombra abajo a la derecha */}
      <path d={HEART} fill={deep} opacity="0.75" transform="translate(1.6 1.8)" />
      <path d={HEART} fill={hi} opacity="0.7" transform="translate(-1.2 -1.3)" />
      <path d={HEART} fill={base} />
      <path d="M33 38 C35 34 39 33 42 34" fill="none" stroke={hi} strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
