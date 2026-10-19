"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { mapTable, tablesQuery } from "@/components/banquet/banquet-firebase";
import { useDietLabel } from "@/components/diet-icons";
import { PrintFrame, PrintPage, type PrintDocumentProps } from "@/components/export/print-frame";
import { companionName, summarizeSeats, visibleNotes } from "@/components/guests/guest-filters";
import { guestsQuery, mapGuest } from "@/lib/firebase/plans";
import { tableNameByGuest } from "@/lib/export/guests";
import { useCollection } from "@/lib/hooks/use-collection";
import { useLanguage } from "@/lib/i18n/provider";
import { usePlanPermission } from "@/lib/hooks/use-plan-permission";
import type { Guest } from "@/lib/types";

function GuestsDocument({ planId, plan }: PrintDocumentProps) {
  const { t } = useTranslation("export");
  const { t: tGuests } = useTranslation("guests");
  const { lang } = useLanguage();
  const dietLabel = useDietLabel();
  const guestsState = useCollection(guestsQuery(planId), mapGuest);
  // La mesa de cada invitado es de «Banquete»: sin poder verlo no se lee y la columna queda vacía.
  const { canView: canViewTables } = usePlanPermission("banquet");
  const tablesState = useCollection(canViewTables ? tablesQuery(planId) : null, mapTable);

  const guests = React.useMemo(
    () => [...guestsState.data].sort((a, b) => a.name.localeCompare(b.name, lang)),
    [guestsState.data, lang]
  );
  const tableOf = React.useMemo(() => tableNameByGuest(tablesState.data), [tablesState.data]);
  const counts = React.useMemo(() => {
    const by = (status: Guest["rsvpStatus"]) => guests.filter((g) => g.rsvpStatus === status).length;
    return { total: guests.length, confirmed: by("confirmed"), pending: by("pending"), declined: by("declined") };
  }, [guests]);
  const seats = React.useMemo(() => summarizeSeats(guests).seats, [guests]);

  const backHref = `/plan/${planId}/guests`;

  if (guestsState.loading) {
    return (
      <PrintFrame plan={plan} backHref={backHref} title={t("print.guests.title")} landscape>
        <div role="status" aria-label={t("print.preparing")} className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-ink-muted" />
        </div>
      </PrintFrame>
    );
  }

  const summary =
    guests.length > 0
      ? `${t("print.guests.summary", counts)} · ${t("print.guests.seats", { count: seats })}`
      : undefined;

  return (
    <PrintFrame plan={plan} backHref={backHref} title={t("print.guests.title")} summary={summary} landscape>
      {guestsState.error ? (
        <p role="alert" className="py-8 text-sm text-ink">
          {t("print.loadError")}
        </p>
      ) : guests.length === 0 ? (
        <p className="py-8 text-sm text-ink">{t("print.guests.empty")}</p>
      ) : (
        <table className="mt-6 w-full border-collapse text-left text-sm">
          <thead className="border-b-2 border-ink/40 text-xs uppercase tracking-wide text-ink">
            <tr>
              <th scope="col" className="py-2 pr-3 font-semibold">
                {t("print.guests.columns.name")}
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                {t("print.guests.columns.rsvp")}
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                {t("print.guests.columns.groupHousehold")}
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                {t("print.guests.columns.diets")}
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                {t("print.guests.columns.table")}
              </th>
              <th scope="col" className="py-2 pl-3 font-semibold">
                {t("print.guests.columns.logistics")}
              </th>
            </tr>
          </thead>
          <tbody>
            {guests.map((g) => {
              const companion = companionName(g);
              const notes = visibleNotes(g);
              const groupHousehold = [g.groupName.trim(), g.householdName.trim()].filter(Boolean);
              const logistics = [
                g.needsLodging
                  ? g.lodgingPlace.trim()
                    ? t("print.guests.lodging", { place: g.lodgingPlace.trim() })
                    : t("print.guests.lodgingNoPlace")
                  : "",
                g.needsTransport
                  ? g.transportFrom.trim()
                    ? t("print.guests.transport", { place: g.transportFrom.trim() })
                    : t("print.guests.transportNoPlace")
                  : "",
              ].filter(Boolean);
              return (
                <tr key={g.id} className="break-inside-avoid border-b border-ink/15 align-top">
                  <td className="py-2 pr-3">
                    <span className="font-medium text-ink-strong">{g.name}</span>
                    {g.plusOne && (
                      <span className="block text-ink">
                        {companion ? t("print.guests.companion", { name: companion }) : t("print.guests.unnamedCompanion")}
                      </span>
                    )}
                    {notes && <span className="block text-xs text-ink">{notes}</span>}
                  </td>
                  <td className="px-3 py-2 text-ink">{tGuests(`rsvp.${g.rsvpStatus}`)}</td>
                  <td className="px-3 py-2 text-ink">
                    {groupHousehold.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </td>
                  <td className="px-3 py-2 text-ink">
                    {g.dietIds.map((id) => dietLabel(id)).join(" · ")}
                    {g.dietaryNotes.trim() && <span className="block text-xs">{g.dietaryNotes.trim()}</span>}
                  </td>
                  <td className="px-3 py-2 text-ink">{tableOf.get(g.id) ?? t("print.guests.noTable")}</td>
                  <td className="py-2 pl-3 text-ink">
                    {logistics.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </PrintFrame>
  );
}

export function GuestsPrintView({ planId }: { planId: string }) {
  return <PrintPage planId={planId} section="guests" Document={GuestsDocument} />;
}
