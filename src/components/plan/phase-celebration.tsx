"use client";

import * as React from "react";
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Duración total de la tarjeta de celebración (entrada, pausa y salida). */
export const CELEBRATION_MS = 2800;
/** Momento en que se pasa a la fase siguiente, con el candado ya abierto. */
export const CELEBRATION_SWITCH_MS = 1750;

/**
 * Fotogramas propios de la celebración. Viven aquí (no en globals.css) y solo
 * se aplican si la persona no ha pedido reducir el movimiento: con
 * prefers-reduced-motion no se pinta nada animado (ver `PlanOverview`).
 * `href` + `precedence` hace que React pinte la hoja una sola vez.
 */
function CelebrationStyles() {
  return (
    <style href="phase-celebration" precedence="default">{`
      @media (prefers-reduced-motion: no-preference) {
        @keyframes pc-card {
          0% { opacity: 0; transform: translateY(18px) scale(0.92); }
          12% { opacity: 1; transform: translateY(0) scale(1); }
          80% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-10px) scale(0.98); }
        }
        @keyframes pc-shackle {
          0%, 14% { transform: translate(0, 0) rotate(0deg); }
          46% { transform: translate(0, -2.4px) rotate(0deg); }
          100% { transform: translate(0, -2.4px) rotate(-34deg); }
        }
        @keyframes pc-body {
          0%, 40% { transform: scale(1); }
          58% { transform: scale(1.07); }
          100% { transform: scale(1); }
        }
        @keyframes pc-ring {
          0% { opacity: 0.55; transform: scale(0.7); }
          100% { opacity: 0; transform: scale(1.9); }
        }
        @keyframes pc-spark {
          0% { opacity: 0; transform: translate(0, 0) scale(0.4); }
          25% { opacity: 1; }
          100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(1); }
        }
        @keyframes pc-tab-lock {
          0%, 78% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-3px); }
        }
        @keyframes pc-tab-pulse {
          0% { box-shadow: 0 0 0 0 color-mix(in oklab, var(--green-solid) 60%, transparent); }
          100% { box-shadow: 0 0 0 12px transparent; }
        }
      }
    `}</style>
  );
}

/**
 * Candado dibujado a mano para poder abrir el arco (el de lucide es una sola
 * pieza): el arco sube y gira sobre su pata derecha. Parte cerrado; `delay`
 * (ms) espera antes de abrirse.
 */
export function AnimatedLock({
  className,
  delay = 0,
}: {
  className?: string;
  delay?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0 overflow-visible", className)}
    >
      <path
        d="M8 11V7.5a4 4 0 0 1 8 0V11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          transformOrigin: "16px 11px",
          animation: `pc-shackle 750ms var(--ease-soft, ease-out) ${delay + 350}ms both`,
        }}
      />
      <g style={{ transformOrigin: "12px 16px", animation: `pc-body 750ms ease-out ${delay}ms both` }}>
        <rect x="4.5" y="11" width="15" height="10.5" rx="2.5" fill="currentColor" />
        <circle cx="12" cy="15.6" r="1.5" style={{ fill: "var(--sage-pale)" }} />
        <path d="M12 16.5v2" strokeWidth="1.8" strokeLinecap="round" style={{ stroke: "var(--sage-pale)" }} />
      </g>
    </svg>
  );
}

/** Candado pequeño que se abre en la pestaña de la fase que se desbloquea. */
export function TabUnlock() {
  return (
    <>
      <CelebrationStyles />
      <span
        aria-hidden="true"
        className="inline-flex"
        style={{ animation: "pc-tab-lock 1900ms ease-out 0ms both" }}
      >
        <AnimatedLock className="size-3.5 text-green" delay={150} />
      </span>
    </>
  );
}

/** Chispas que salen del candado al abrirse (posiciones fijas: no hay azar en el render). */
const SPARKS = [
  { dx: "-46px", dy: "-34px", size: 6, delay: 760 },
  { dx: "44px", dy: "-40px", size: 5, delay: 800 },
  { dx: "-52px", dy: "8px", size: 4, delay: 840 },
  { dx: "54px", dy: "4px", size: 6, delay: 780 },
  { dx: "-22px", dy: "-54px", size: 4, delay: 880 },
  { dx: "26px", dy: "-56px", size: 5, delay: 820 },
];

/**
 * Tarjeta flotante de «fase completada»: un candado que se abre, el mensaje y
 * un breve destello. No bloquea clics (pointer-events-none) y se anuncia a
 * lectores de pantalla con role="status". El padre la monta y la retira.
 */
export function PhaseCelebration({
  title,
  detail,
  finale = false,
}: {
  title: string;
  detail: string;
  /** No hay fase siguiente: en vez de un candado, un check. */
  finale?: boolean;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[22vh] z-50 flex justify-center px-4">
      <CelebrationStyles />
      <div
        role="status"
        data-testid="phase-celebration"
        className="flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl bg-surface px-6 pb-6 pt-7 text-center shadow-float ring-1 ring-sage-light dark:ring-green-solid"
        style={{ animation: `pc-card ${CELEBRATION_MS}ms var(--ease-soft, ease-out) both` }}
      >
        <div className="relative flex size-20 items-center justify-center">
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-green-solid"
            style={{ animation: "pc-ring 1000ms ease-out 700ms both" }}
          />
          <span className="relative flex size-20 items-center justify-center rounded-full bg-sage-pale text-green ring-1 ring-sage-light dark:ring-green-solid">
            {finale ? (
              <CheckIcon className="size-9" aria-hidden="true" />
            ) : (
              <AnimatedLock className="size-10" delay={250} />
            )}
          </span>
          {SPARKS.map((s, i) => (
            <span
              key={i}
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 rounded-full bg-green-solid"
              style={
                {
                  width: s.size,
                  height: s.size,
                  marginLeft: -s.size / 2,
                  marginTop: -s.size / 2,
                  "--dx": s.dx,
                  "--dy": s.dy,
                  animation: `pc-spark 900ms ease-out ${s.delay}ms both`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
        <p className="font-display text-xl font-semibold leading-snug text-ink-strong">{title}</p>
        <p className="text-sm text-ink">{detail}</p>
      </div>
    </div>
  );
}
