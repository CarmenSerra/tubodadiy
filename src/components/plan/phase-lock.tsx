"use client";

import * as React from "react";
import { LockIcon, WandSparklesIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { FOCUS } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";

/**
 * Candado centrado sobre el contenido difuminado de una fase aún sin
 * desbloquear. Es un botón (círculo lila como los iconos de la landing):
 * al pasar el ratón por encima o enfocarlo con el teclado aparece una tarjeta
 * con la recomendación; pulsarlo (o la tarjeta) desbloquea la fase. En
 * pantallas táctiles, que no tienen "hover", la tarjeta se ve siempre.
 * Escape la cierra sin mover el foco (WCAG 1.4.13).
 */
export function PhaseLock({
  phaseName,
  onUnlock,
}: {
  phaseName: string;
  onUnlock: () => void;
}) {
  const { t } = useTranslation("plan");
  const tipId = React.useId();
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);
  const open = (hovered || focused) && !dismissed;

  return (
    <div
      className="pointer-events-none absolute inset-0 flex justify-center"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) setDismissed(true);
      }}
    >
      {/* sticky: con fases largas, el candado acompaña a la vista. */}
      <div
        className="pointer-events-auto sticky top-[35vh] mt-10 flex h-fit flex-col items-center gap-3"
        onPointerEnter={() => {
          setHovered(true);
          setDismissed(false);
        }}
        onPointerLeave={() => setHovered(false)}
      >
        <button
          type="button"
          aria-label={t("lock.unlockAria", { name: phaseName })}
          aria-describedby={tipId}
          onClick={onUnlock}
          onFocus={() => {
            setFocused(true);
            setDismissed(false);
          }}
          onBlur={() => setFocused(false)}
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full bg-lilac-mid shadow-float ring-1 ring-lilac-edge",
            "transition-transform duration-200 ease-out hover:scale-110 motion-reduce:transform-none motion-reduce:transition-none",
            FOCUS
          )}
        >
          <LockIcon className="size-5 text-ink-on-tint" aria-hidden="true" />
        </button>

        {/* Pulsar la tarjeta también desbloquea (comodidad con ratón; con teclado está el botón). */}
        <div
          id={tipId}
          role="tooltip"
          data-open={open}
          onClick={onUnlock}
          className={cn(
            "z-10 w-72 max-w-[calc(100vw-3rem)] cursor-pointer rounded-xl bg-surface px-4 py-3 text-sm text-ink ring-1 ring-lilac-edge shadow-float",
            "absolute left-1/2 top-full mt-3 -translate-x-1/2",
            "invisible opacity-0 transition-[opacity,visibility] duration-150 motion-reduce:transition-none",
            "data-[open=true]:visible data-[open=true]:opacity-100",
            // Sin hover (táctil): siempre visible y dentro del flujo.
            "[@media(hover:none)]:visible [@media(hover:none)]:static [@media(hover:none)]:translate-x-0 [@media(hover:none)]:opacity-100"
          )}
        >
          <p>
            {t("lock.tip")}{" "}
            <span className="inline-flex items-center gap-1 font-semibold text-ink-strong">
              {t("lock.tipAction")}
              <WandSparklesIcon className="size-4" aria-hidden="true" />
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
