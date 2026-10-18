"use client";

import { BedDoubleIcon, BusIcon, UtensilsIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { CARD, IconCircle } from "@/components/dashboard/ui";
import { DietChip } from "@/components/guests/diet-picker";
import { attending, dietCounts, lodgingNeeds, transportNeeds, type NeedBreakdown } from "@/components/guests/guest-model";
import { DIET_GROUPS, DIET_IDS_BY_GROUP, type DietId } from "@/lib/diets";
import type { Guest } from "@/lib/types";

/**
 * Pestaña «Necesidades»: recuento por alergia/dieta (cada una abre la lista
 * filtrada) y resumen de alojamiento y transporte.
 */
export function GuestNeeds({
  guests,
  onFilterDiet,
}: {
  guests: Guest[];
  onFilterDiet: (id: DietId) => void;
}) {
  const { t } = useTranslation(["guests", "diets"]);
  const counts = dietCounts(guests);
  const withDiet = attending(guests).filter((g) => g.dietIds.length > 0).length;
  const lodging = lodgingNeeds(guests);
  const transport = transportNeeds(guests);

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="needs-diets-title" className={`${CARD} flex flex-col gap-4 p-4 sm:p-5`}>
        <div className="flex items-start gap-3">
          <IconCircle tone="sage" className="size-9 sm:size-10">
            <UtensilsIcon />
          </IconCircle>
          <div className="min-w-0 flex-1">
            <h3 id="needs-diets-title" className="font-display text-base font-semibold leading-snug text-ink-strong">
              {t("guests:needs.diets.title")}
            </h3>
            <p className="mt-0.5 text-sm text-ink-muted">
              {withDiet === 0
                ? t("guests:needs.diets.empty")
                : t("guests:needs.diets.summary", { count: withDiet })}
            </p>
          </div>
        </div>
        {withDiet > 0 && (
          <>
            {DIET_GROUPS.map((group) => {
              const ids = DIET_IDS_BY_GROUP[group].filter((id) => (counts[id] ?? 0) > 0);
              if (ids.length === 0) return null;
              return (
                <div key={group}>
                  <h4 className="mb-2 text-xs font-medium text-ink-muted">{t(`diets:groups.${group}`)}</h4>
                  <ul className="flex flex-wrap gap-2">
                    {ids.map((id) => (
                      <li key={id}>
                        <DietChip
                          id={id}
                          selected={false}
                          onToggle={() => onFilterDiet(id)}
                          label={t(`diets:items.${id}.label`)}
                          count={counts[id]}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            <p className="text-xs text-ink-muted">{t("guests:needs.diets.hint")}</p>
          </>
        )}
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <NeedCard kind="lodging" data={lodging} icon={<BedDoubleIcon />} />
        <NeedCard kind="transport" data={transport} icon={<BusIcon />} />
      </div>
    </div>
  );
}

function NeedCard({
  kind,
  data,
  icon,
}: {
  kind: "lodging" | "transport";
  data: NeedBreakdown;
  icon: React.ReactNode;
}) {
  const { t } = useTranslation("guests");
  const titleId = `needs-${kind}-title`;
  return (
    <section aria-labelledby={titleId} className={`${CARD} flex min-w-0 flex-col gap-3 p-4 sm:p-5`}>
      <div className="flex items-center gap-3">
        <IconCircle tone="lilac" className="size-9 sm:size-10">
          {icon}
        </IconCircle>
        <h3 id={titleId} className="min-w-0 flex-1 font-display text-base font-semibold leading-snug text-ink-strong">
          {t(`needs.${kind}.title`)}
        </h3>
      </div>
      {data.guests === 0 ? (
        <p className="text-sm text-ink-muted">{t(`needs.${kind}.empty`)}</p>
      ) : (
        <>
          <p className="font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            {t("needs.guestsCount", { count: data.guests })}
          </p>
          <p className="-mt-1 text-sm text-ink-muted">{t("needs.peopleCount", { count: data.people })}</p>
          <ul className="flex flex-col divide-y divide-line text-sm">
            {data.places.map((p) => (
              <li key={p.label || "__none__"} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 break-words text-ink-strong">
                  {p.label || <span className="text-ink-muted">{t(`needs.${kind}.unspecified`)}</span>}
                </span>
                <span className="shrink-0 font-medium text-ink">{p.count}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

