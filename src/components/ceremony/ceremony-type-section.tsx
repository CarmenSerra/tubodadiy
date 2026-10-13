"use client";

import { InfoIcon, LandmarkIcon, ShieldCheckIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { CeremonySection } from "@/components/ceremony/section";
import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import { CEREMONY_OPTIONS, type CeremonyOption } from "@/components/plan-tools/ceremony-model";
import { usePlanContext } from "@/lib/context/plan-context";

/** «Tipo de ceremonia»: la elección con su explicación y un botón para cambiarla. */
export function CeremonyTypeSection({ onPick }: { onPick: () => void }) {
  const { t } = useTranslation("ceremony");
  const { plan } = usePlanContext();
  const option = CEREMONY_OPTIONS.find((o) => o.value === plan?.ceremonyType) ?? null;

  // Textos de cada tipo: se traducen por su valor (lo guardado en el plan es `option.value`).
  const label = (o: CeremonyOption) => t(`type.options.${o.value}.label`, { defaultValue: o.label });
  const tagline = (o: CeremonyOption) =>
    t(`type.options.${o.value}.tagline`, { defaultValue: o.tagline });

  return (
    <CeremonySection
      id="tipo"
      icon={<LandmarkIcon />}
      title={t("type.title")}
      description={t("type.description")}
      action={
        option ? (
          <button type="button" onClick={onPick} className={CTA_SECONDARY}>
            {t("type.change")}
          </button>
        ) : undefined
      }
    >
      {option ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="font-display text-2xl font-semibold leading-tight text-ink">{label(option)}</p>
            <p className="text-sm text-ink-strong">{tagline(option)}</p>
          </div>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-ink-muted marker:text-lilac">
            {option.implies.map((line, i) => (
              <li key={line}>
                {t(`type.options.${option.value}.implies.${i}`, { defaultValue: line })}
              </li>
            ))}
          </ul>
          <p className="flex items-start gap-2 rounded-xl border border-line bg-field px-3 py-2.5 text-sm text-ink">
            {option.legalByItself ? (
              <ShieldCheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            ) : (
              <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            )}
            <span>
              <span className="font-medium">
                {t(`type.options.${option.value}.legalBadge`, { defaultValue: option.legalBadge })}.{" "}
              </span>
              {t(`type.options.${option.value}.legal`, { defaultValue: option.legal })}
            </span>
          </p>
          <p className="flex items-start gap-2 text-sm text-ink-muted">
            <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>
              {t("type.disclaimer")}
            </span>
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
            {CEREMONY_OPTIONS.map((o) => (
              <li key={o.value} className="flex flex-col gap-0.5 px-4 py-3">
                <span className="font-display text-lg font-semibold text-ink">{label(o)}</span>
                <span className="text-sm text-ink-muted">{tagline(o)}</span>
              </li>
            ))}
          </ul>
          <div>
            <button type="button" onClick={onPick} className={CTA_PRIMARY}>
              <LandmarkIcon aria-hidden="true" className="size-4" />
              {t("type.choose")}
            </button>
          </div>
        </div>
      )}
    </CeremonySection>
  );
}
