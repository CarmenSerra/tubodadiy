import type { CSSProperties, ReactNode } from "react";

import { FALLBACK_ENVELOPE, mix, normalizeHex } from "@/components/invitation/invitation-theme";
import { cn } from "@/lib/utils";

import "./invitation.css";

/**
 * Sobre abierto de papel texturizado, dibujado con SVG (sin imágenes): el color
 * (ya resuelto: a mano o el de la paleta) llega por `color` y la textura es ruido `feTurbulence` (grano + fibras).
 * Es solo presentación (sin hooks), así que vale para servidor y cliente.
 *
 * Con `animated` (la apertura de la página pública) se dibuja además la solapa
 * CERRADA (`.inv-envShutFlap`) y cada solapa va en su propio grupo, para que el CSS
 * pueda cerrarlas y abrirlas (`.inv-envOpenFlap`, `.inv-envShutFlap`) sin repintar
 * el papel entero en cada fotograma. En reposo (solapa cerrada oculta) se ve igual
 * que el sobre abierto de siempre.
 */
export function InvitationEnvelope({
  color,
  className,
  style,
  animated = false,
}: {
  color?: string;
  className?: string;
  style?: CSSProperties;
  animated?: boolean;
}) {
  const base = normalizeHex(color) ?? FALLBACK_ENVELOPE;
  // El id depende del color: dos sobres iguales en la página comparten defs idénticas.
  const uid = `env-${base.slice(1)}`;
  const dark = mix(base, "#000000", 0.32);
  const back = mix(base, "#000000", 0.26);
  const flap = mix(base, "#ffffff", 0.1);
  const left = mix(base, "#000000", 0.05);
  const right = mix(base, "#000000", 0.12);
  const bottom = mix(base, "#ffffff", 0.07);
  const crease = mix(base, "#000000", 0.4);
  const light = mix(base, "#ffffff", 0.45);
  const join = (fill: string) => ({ fill, stroke: fill, strokeWidth: 9, strokeLinejoin: "round" as const });
  const paper = `url(#${uid}-paper)`;

  const openFlap = (
    <>
      {/* Solapa abierta, doblada hacia atrás */}
      <path d="M60 252 L500 34 L940 252 Z" {...join(`url(#${uid}-flap)`)} stroke={flap} />
      <path d="M60 252 L500 34 L940 252" fill="none" stroke={light} strokeOpacity="0.5" strokeWidth="3" strokeLinejoin="round" />
    </>
  );
  const body = (
    <>
      {/* Interior del sobre (se ve por la boca) */}
      <rect x="60" y="252" width="880" height="430" rx="14" fill={`url(#${uid}-mouth)`} />
      {/* Solapas laterales e inferior */}
      <path d="M60 252 L500 500 L60 682 Z" {...join(left)} />
      <path d="M940 252 L500 500 L940 682 Z" {...join(right)} />
      <path d="M60 682 L500 468 L940 682 Z" {...join(`url(#${uid}-bottom)`)} stroke={bottom} />
      {/* Pliegues */}
      <path d="M60 252 L500 500 L940 252" fill="none" stroke={crease} strokeOpacity="0.55" strokeWidth="4" strokeLinejoin="round" />
      <path d="M60 682 L500 468 L940 682" fill="none" stroke={crease} strokeOpacity="0.5" strokeWidth="4" strokeLinejoin="round" />
      <path d="M60 686 L500 472 L940 686" fill="none" stroke={light} strokeOpacity="0.55" strokeWidth="3" strokeLinejoin="round" />
    </>
  );

  return (
    <svg
      viewBox="0 0 1000 720"
      aria-hidden="true"
      focusable="false"
      className={cn("inv-envelope", className)}
      style={style}
    >
      <defs>
        <filter id={`${uid}-paper`} x="-4%" y="-4%" width="108%" height="108%" colorInterpolationFilters="sRGB">
          {/* Grano fino del papel */}
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="5" result="grain" />
          <feColorMatrix
            in="grain"
            type="matrix"
            values="0 0 0 0 0.18  0 0 0 0 0.14  0 0 0 0 0.1  0 0 0 0.9 -0.34"
            result="speck"
          />
          {/* Fibras: ruido muy estirado en un sentido */}
          <feTurbulence type="fractalNoise" baseFrequency="0.014 0.5" numOctaves="2" seed="12" result="fibre" />
          <feColorMatrix
            in="fibre"
            type="matrix"
            values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.1 -0.5"
            result="fibreLight"
          />
          {/* Manchas grandes y suaves, como papel de algodón */}
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="21" result="cloud" />
          <feColorMatrix
            in="cloud"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 -0.2"
            result="cloudDark"
          />
          <feComposite in="speck" in2="SourceAlpha" operator="in" result="s1" />
          <feComposite in="fibreLight" in2="SourceAlpha" operator="in" result="f1" />
          <feComposite in="cloudDark" in2="SourceAlpha" operator="in" result="c1" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="c1" />
            <feMergeNode in="f1" />
            <feMergeNode in="s1" />
          </feMerge>
        </filter>
        <linearGradient id={`${uid}-flap`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={flap} />
          <stop offset="1" stopColor={mix(flap, base, 0.55)} />
        </linearGradient>
        <linearGradient id={`${uid}-shut`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mix(flap, "#ffffff", 0.06)} />
          <stop offset="1" stopColor={mix(base, "#000000", 0.03)} />
        </linearGradient>
        <linearGradient id={`${uid}-mouth`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={dark} />
          <stop offset="1" stopColor={back} />
        </linearGradient>
        <linearGradient id={`${uid}-bottom`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={bottom} />
          <stop offset="1" stopColor={mix(bottom, base, 0.5)} />
        </linearGradient>
      </defs>

      {animated ? (
        <>
          <g className="inv-envOpenFlap">
            <g filter={paper}>{openFlap}</g>
          </g>
          <g filter={paper}>{body}</g>
          {/* Solapa cerrada, encima de todo: el CSS la «abre» encogiéndola hasta la bisagra */}
          <g className="inv-envShutFlap">
            <g filter={paper}>
              <path d="M60 252 L500 500 L940 252 Z" {...join(`url(#${uid}-shut)`)} stroke={flap} />
              <path d="M60 252 L500 500 L940 252" fill="none" stroke={crease} strokeOpacity="0.55" strokeWidth="4" strokeLinejoin="round" />
              <path d="M62 256 L500 504 L938 256" fill="none" stroke={light} strokeOpacity="0.45" strokeWidth="3" strokeLinejoin="round" />
            </g>
          </g>
        </>
      ) : (
        <g filter={paper}>
          {openFlap}
          {body}
        </g>
      )}
    </svg>
  );
}

/**
 * Tarjeta sobre un sobre abierto (la composición de «Reserva la fecha»): el
 * contenido va ligeramente girado, con sombra, encima de un sobre del color
 * elegido y sobre el fondo de papel indicado.
 */
export function EnvelopeFrame({
  color,
  background,
  children,
  className,
}: {
  color?: string;
  background: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("inv-envFrame", className)} style={{ background }}>
      <InvitationEnvelope color={color} className="inv-envFrameSvg" />
      <div className="inv-envFrameCard">{children}</div>
    </div>
  );
}
