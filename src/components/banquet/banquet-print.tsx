"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeftIcon, Loader2, PrinterIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { RequireAuth } from "@/components/auth/require-auth";
import { PrintSectionGate } from "@/components/export/print-frame";
import { buildTableViews, guestDietIds, isComing, seatsOf, unseatedGuests } from "@/components/banquet/banquet-model";
import { useBanquet } from "@/components/banquet/use-banquet";
import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import { useDietLabel } from "@/components/diet-icons";
import { companionName } from "@/components/guests/guest-filters";
import { formatWeekdayDate, weddingName } from "@/components/timeline/timeline-model";
import { PlanProvider, usePlanContext } from "@/lib/context/plan-context";
import { useLanguage } from "@/lib/i18n/provider";
import type { Guest } from "@/lib/types";

function GuestLine({ guest }: { guest: Guest }) {
  const { t } = useTranslation("banquet");
  const dietLabel = useDietLabel();
  const companion = companionName(guest);
  const diets = guestDietIds(guest);
  return (
    <li className="border-b border-ink/15 py-1.5 text-sm text-ink-strong last:border-b-0">
      <span className="font-medium">{guest.name}</span>
      {guest.plusOne && (
        <span className="text-ink">
          {" "}
          {companion ? t("print.withCompanion", { name: companion }) : t("print.withUnnamedCompanion")}
        </span>
      )}
      {diets.length > 0 && (
        <span className="block text-xs text-ink">{diets.map((id) => dietLabel(id)).join(" · ")}</span>
      )}
    </li>
  );
}

function PrintDocument({ planId }: { planId: string }) {
  const { t } = useTranslation("banquet");
  const { lang } = useLanguage();
  const { plan, loading, isMember } = usePlanContext();
  const data = useBanquet(planId);

  const views = React.useMemo(() => buildTableViews(data.tables, data.guests), [data.tables, data.guests]);
  const waiting = React.useMemo(
    () => unseatedGuests(views, data.guests).filter(isComing),
    [views, data.guests]
  );

  if (loading || data.loading) {
    return (
      <div role="status" aria-label={t("print.preparing")} className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-ink-muted" />
      </div>
    );
  }

  if (!plan || !isMember) {
    return <p className="mx-auto max-w-md px-4 py-24 text-center text-sm text-ink">{t("print.noAccess")}</p>;
  }

  const date = formatWeekdayDate(plan.weddingDate, lang);
  const seated = views.reduce((sum, v) => sum + v.used, 0);

  return (
    <div data-theme="light" className="min-h-screen bg-panel text-ink-strong">
      <div className="print:hidden border-b border-line bg-panel">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <Link href={`/plan/${planId}/banquete`} className={CTA_SECONDARY}>
            <ArrowLeftIcon aria-hidden="true" className="size-4" />
            {t("print.back")}
          </Link>
          <div className="flex items-center gap-3">
            <p className="hidden text-sm text-ink-muted sm:block">{t("print.pdfHint")}</p>
            <button type="button" onClick={() => window.print()} className={CTA_PRIMARY}>
              <PrinterIcon aria-hidden="true" className="size-4" />
              {t("print.button")}
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8 print:max-w-none print:p-0">
        <header className="border-b-2 border-ink pb-4">
          <h1 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">{t("print.title")}</h1>
          <p className="mt-1 font-display text-lg text-ink-strong">
            {weddingName(plan.title, lang)}
            {date ? ` · ${date}` : ""}
          </p>
          {views.length > 0 && (
            <p className="mt-1 text-sm text-ink">{t("print.summary", { count: views.length, tables: views.length, seated })}</p>
          )}
        </header>

        {data.failed ? (
          <p role="alert" className="py-8 text-sm text-ink">
            {t("print.loadError")}
          </p>
        ) : views.length === 0 ? (
          <p className="py-8 text-sm text-ink">{t("print.empty")}</p>
        ) : (
          <>
            <ul className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 print:grid-cols-2">
              {views.map(({ table, guests, used }) => (
                <li key={table.id} className="break-inside-avoid rounded-xl border border-ink/30 p-4">
                  <h2 className="font-display text-xl font-semibold text-ink">{table.name}</h2>
                  <p className="mb-2 text-sm text-ink">
                    {t(`table.shapes.${table.shape}`)} · {t("table.seats", { used, capacity: table.capacity })}
                  </p>
                  {guests.length === 0 ? (
                    <p className="text-sm text-ink">{t("print.emptyTable")}</p>
                  ) : (
                    <ol className="list-none">
                      {guests.map((g) => (
                        <GuestLine key={g.id} guest={g} />
                      ))}
                    </ol>
                  )}
                </li>
              ))}
            </ul>

            {waiting.length > 0 && (
              <section className="mt-8 break-inside-avoid">
                <h2 className="font-display text-xl font-semibold text-ink">
                  {t("print.unseated", { count: waiting.reduce((sum, g) => sum + seatsOf(g), 0) })}
                </h2>
                <ul className="mt-2 columns-1 gap-8 sm:columns-2">
                  {waiting.map((g) => (
                    <GuestLine key={g.id} guest={g} />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export function BanquetPrintView({ planId }: { planId: string }) {
  return (
    <RequireAuth>
      <PlanProvider planId={planId}>
        <PrintSectionGate section="banquet">
          <PrintDocument planId={planId} />
        </PrintSectionGate>
      </PlanProvider>
    </RequireAuth>
  );
}
