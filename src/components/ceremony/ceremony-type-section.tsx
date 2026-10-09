"use client";

import { InfoIcon, LandmarkIcon, ShieldCheckIcon } from "lucide-react";

import { CeremonySection } from "@/components/ceremony/section";
import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import { CEREMONY_OPTIONS } from "@/components/plan-tools/ceremony-model";
import { usePlanContext } from "@/lib/context/plan-context";

/** «Tipo de ceremonia»: la elección con su explicación y un botón para cambiarla. */
export function CeremonyTypeSection({ onPick }: { onPick: () => void }) {
  const { plan } = usePlanContext();
  const option = CEREMONY_OPTIONS.find((o) => o.value === plan?.ceremonyType) ?? null;

  return (
    <CeremonySection
      id="tipo"
      icon={<LandmarkIcon />}
      title="Tipo de ceremonia"
      description="Cómo os queréis casar. Puedes cambiarlo cuando quieras."
      action={
        option ? (
          <button type="button" onClick={onPick} className={CTA_SECONDARY}>
            Cambiar tipo
          </button>
        ) : undefined
      }
    >
      {option ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="font-display text-2xl font-semibold leading-tight text-ink">{option.label}</p>
            <p className="text-sm text-ink-strong">{option.tagline}</p>
          </div>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-ink-muted marker:text-lilac">
            {option.implies.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="flex items-start gap-2 rounded-xl border border-line bg-field px-3 py-2.5 text-sm text-ink">
            {option.legalByItself ? (
              <ShieldCheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            ) : (
              <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            )}
            <span>
              <span className="font-medium">{option.legalBadge}. </span>
              {option.legal}
            </span>
          </p>
          <p className="flex items-start gap-2 text-sm text-ink-muted">
            <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>
              Es orientativo y puede cambiar según el municipio o la comunidad. Confirma los detalles en
              tu Registro Civil, notaría o parroquia.
            </span>
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
            {CEREMONY_OPTIONS.map((o) => (
              <li key={o.value} className="flex flex-col gap-0.5 px-4 py-3">
                <span className="font-display text-lg font-semibold text-ink">{o.label}</span>
                <span className="text-sm text-ink-muted">{o.tagline}</span>
              </li>
            ))}
          </ul>
          <div>
            <button type="button" onClick={onPick} className={CTA_PRIMARY}>
              <LandmarkIcon aria-hidden="true" className="size-4" />
              Elegir tipo de ceremonia
            </button>
          </div>
        </div>
      )}
    </CeremonySection>
  );
}
