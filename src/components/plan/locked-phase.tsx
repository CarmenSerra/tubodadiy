import { EyeIcon, LockIcon } from "lucide-react";

import { CARD, CTA_SECONDARY, IconCircle } from "@/components/dashboard/ui";
import type { PlanStep } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Vista previa suave de una fase que aún no toca: títulos difuminados, un
 * mensaje tranquilo y un botón para echar un vistazo igualmente. No bloquea
 * nada: es una invitación a ir paso a paso, no una barrera.
 */
export function LockedPhase({
  previousName,
  steps,
  onReveal,
}: {
  /** Nombre de la fase que la abre ("Lo esencial"). */
  previousName: string;
  steps: PlanStep[];
  onReveal: () => void;
}) {
  return (
    <div className={cn(CARD, "flex flex-col gap-4 p-5 sm:p-6")}>
      <div className="flex items-start gap-4">
        <IconCircle tone="lilac">
          <LockIcon />
        </IconCircle>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[#26413C]">
            Se abre cuando termines «{previousName}». Sin prisa.
          </p>
          <p className="mt-0.5 text-sm text-[#586C64]">
            Mientras tanto, concéntrate en lo de ahora: esto te estará esperando.
          </p>
        </div>
      </div>

      {steps.length > 0 && (
        <>
          {/* Vista previa decorativa: difuminada y fuera del árbol de accesibilidad. */}
          <ul
            aria-hidden="true"
            className="pointer-events-none flex select-none flex-col gap-2 opacity-60 blur-[2px]"
          >
            {steps.map((step) => (
              <li
                key={step.id}
                className="rounded-xl border border-[#E5DDEC] bg-white px-4 py-3 font-display text-base font-semibold text-[#102D28]"
              >
                {step.title}
              </li>
            ))}
          </ul>
          <p className="sr-only">
            Esta fase incluye: {steps.map((s) => s.title).join(", ")}.
          </p>
        </>
      )}

      <div>
        <button type="button" onClick={onReveal} className={CTA_SECONDARY}>
          <EyeIcon className="size-4" aria-hidden="true" />
          Echar un vistazo
        </button>
      </div>
    </div>
  );
}
