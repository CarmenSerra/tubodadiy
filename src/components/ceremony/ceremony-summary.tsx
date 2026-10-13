"use client";

import * as React from "react";
import { CheckCircle2Icon, CircleDashedIcon, CircleAlertIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { CARD, LINK, SECTION_TITLE } from "@/components/dashboard/ui";
import { CEREMONY_OPTIONS } from "@/components/plan-tools/ceremony-model";
import { isOfficiantConfirmed } from "@/lib/auto-tasks";
import { usePlanContext } from "@/lib/context/plan-context";
import { cn } from "@/lib/utils";

type OfficiantState = "confirmed" | "pending" | "unnamed" | "none";

const STATE_STYLE: Record<OfficiantState, { icon: React.ElementType; className: string }> = {
  confirmed: { icon: CheckCircle2Icon, className: "bg-sage-pale text-ink" },
  pending: { icon: CircleDashedIcon, className: "bg-lilac-soft text-ink ring-1 ring-lilac-edge" },
  unnamed: { icon: CircleAlertIcon, className: "bg-lilac-soft text-ink ring-1 ring-lilac-edge" },
  none: { icon: CircleDashedIcon, className: "bg-lilac-soft text-ink-muted ring-1 ring-lilac-edge" },
};

/**
 * Resumen de la ceremonia (arriba de la pestaña): tipo elegido, quién oficia y si
 * está confirmado. Lee del plan en vivo, así que refleja al instante lo guardado.
 */
export function CeremonySummary() {
  const { t } = useTranslation("ceremony");
  const { plan } = usePlanContext();
  const type = CEREMONY_OPTIONS.find((o) => o.value === plan?.ceremonyType) ?? null;
  const officiant = plan?.officiant ?? null;
  const name = officiant?.name.trim() ?? "";
  const state: OfficiantState = !officiant
    ? "none"
    : !name
      ? "unnamed"
      : isOfficiantConfirmed(officiant)
        ? "confirmed"
        : "pending";
  const { icon: StateIcon, className: stateClass } = STATE_STYLE[state];
  const officiantLine = [name, officiant?.kind ? t(`officiant.kinds.${officiant.kind}`) : ""]
    .filter(Boolean)
    .join(" · ");

  return (
    <section
      aria-labelledby="ceremony-summary-title"
      data-testid="ceremony-summary"
      className={cn(CARD, "flex flex-col gap-4 p-5 sm:p-6")}
    >
      <h2 id="ceremony-summary-title" className={SECTION_TITLE}>
        {t("summary.title")}
      </h2>
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-1">
          <dt className="text-sm text-ink-muted">{t("summary.type")}</dt>
          <dd className="font-display text-lg font-semibold leading-snug text-ink">
            {type ? (
              t(`type.options.${type.value}.label`, { defaultValue: type.label })
            ) : (
              <a href="#tipo" className={cn(LINK, "font-sans text-base font-medium")}>
                {t("summary.typeNone")}
              </a>
            )}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <dt className="text-sm text-ink-muted">{t("summary.officiant")}</dt>
          <dd className="font-display text-lg font-semibold leading-snug text-ink [overflow-wrap:anywhere]">
            {officiant ? (
              (officiantLine || t("summary.unnamed"))
            ) : (
              <a href="#oficiante" className={cn(LINK, "font-sans text-base font-medium")}>
                {t("summary.officiantNone")}
              </a>
            )}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col items-start gap-1">
          <dt className="text-sm text-ink-muted">{t("summary.status")}</dt>
          <dd>
            <span
              data-state={state}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium",
                stateClass
              )}
            >
              <StateIcon aria-hidden="true" className="size-4" />
              {t(`summary.states.${state}`)}
            </span>
          </dd>
        </div>
      </dl>
    </section>
  );
}
