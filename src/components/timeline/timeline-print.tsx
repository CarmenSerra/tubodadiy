"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeftIcon, Loader2, PrinterIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { RequireAuth } from "@/components/auth/require-auth";
import { PrintSectionGate } from "@/components/export/print-frame";
import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import {
  dayIndex,
  endMin,
  formatClock,
  formatDuration,
  formatWeekdayDate,
  sortItems,
  weddingName,
} from "@/components/timeline/timeline-model";
import { PlanProvider, usePlanContext } from "@/lib/context/plan-context";
import { useDayContactsMap } from "@/components/dayof/use-dayof";
import { responsibleText, type DayContact } from "@/lib/dayof-model";
import { timelineItemsQuery } from "@/lib/firebase/plans";
import { mapTimelineMoment, type TimelineMoment } from "@/lib/firebase/timeline";
import { useCollection } from "@/lib/hooks/use-collection";
import { useLanguage } from "@/lib/i18n/provider";

function DayMark({ day }: { day: number }) {
  if (day <= 0) return null;
  return <sup className="ml-0.5 font-sans text-xs font-medium">+{day}</sup>;
}

function PrintRow({ item, owner }: { item: TimelineMoment; owner: string }) {
  const { t } = useTranslation("timeline");
  const { lang } = useLanguage();
  const end = endMin(item);
  const startDay = dayIndex(item.startMin);
  const endDay = dayIndex(end);
  const meta = [
    item.durationMin > 0 ? formatDuration(item.durationMin, lang) : null,
    item.location.trim() || null,
    owner ? t("text.responsible", { name: owner }) : null,
  ].filter(Boolean);

  return (
    <li className="grid break-inside-avoid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-5 border-b border-ink/25 py-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
      <div className="text-ink">
        <p className="font-display text-xl font-semibold tabular-nums leading-7">
          {formatClock(item.startMin)}
          <DayMark day={startDay} />
        </p>
        {item.durationMin > 0 && (
          <p className="text-sm tabular-nums">
            → {formatClock(end)}
            {endDay > startDay && <DayMark day={endDay} />}
          </p>
        )}
      </div>
      <div className="min-w-0">
        <p className="font-display text-lg font-semibold leading-7 text-ink-strong">
          {item.title}
          {item.highlight && (
            <span className="ml-2 align-middle font-sans text-xs font-medium uppercase tracking-wide text-ink">
              ● {t("print.highlight")}
            </span>
          )}
        </p>
        {meta.length > 0 && <p className="text-sm text-ink">{meta.join("  ·  ")}</p>}
        {item.notes.trim() && (
          <p className="mt-0.5 whitespace-pre-line break-words text-sm text-ink-strong">
            {item.notes.trim()}
          </p>
        )}
      </div>
    </li>
  );
}

/** Contactos de emergencia y clave del día, al pie de la escaleta. */
function PrintContacts({ contacts }: { contacts: DayContact[] }) {
  const { t } = useTranslation("timeline");
  return (
    <section aria-labelledby="print-contacts-title" className="mt-8 break-inside-avoid border-t-2 border-ink pt-4">
      <h2 id="print-contacts-title" className="font-display text-xl font-semibold text-ink">
        {t("print.contacts.title")}
      </h2>
      <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
        {contacts.map((contact) => (
          <li
            key={contact.id}
            className="flex break-inside-avoid items-baseline justify-between gap-3 border-b border-ink/25 py-2 text-sm"
          >
            <span className="min-w-0 break-words text-ink-strong">
              <span className="font-medium">{contact.name}</span>
              {contact.role.trim() && <span className="text-ink"> · {contact.role}</span>}
            </span>
            <span className="shrink-0 tabular-nums text-ink">{contact.phone.trim() || t("print.contacts.noPhone")}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PrintDocument() {
  const { t } = useTranslation("timeline");
  const { lang } = useLanguage();
  const { planId, plan, loading, isMember } = usePlanContext();
  const { data, loading: itemsLoading, error } = useCollection(
    timelineItemsQuery(planId),
    mapTimelineMoment
  );
  const items = React.useMemo(() => sortItems(data), [data]);
  const contacts = useDayContactsMap(planId);

  // Abre el diálogo de impresión una sola vez, cuando ya está todo pintado.
  const printed = React.useRef(false);
  const ready =
    !loading && isMember && !itemsLoading && !contacts.loading && !error && items.length > 0;
  React.useEffect(() => {
    if (!ready || printed.current) return;
    printed.current = true;
    let cancelled = false;
    const fonts = document.fonts?.ready ?? Promise.resolve();
    fonts.then(() => {
      if (cancelled) return;
      // Un frame más, para que el texto ya esté con su tipografía definitiva.
      requestAnimationFrame(() => window.print());
    });
    return () => {
      cancelled = true;
      // En desarrollo React monta dos veces: deja volver a intentarlo.
      printed.current = false;
    };
  }, [ready]);

  if (loading || itemsLoading || contacts.loading) {
    return (
      <div role="status" aria-label={t("print.preparing")} className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-ink-muted" />
      </div>
    );
  }

  if (!plan || !isMember) {
    return (
      <p className="mx-auto max-w-md px-4 py-24 text-center text-sm text-ink">
        {t("print.noAccess")}
      </p>
    );
  }

  const date = formatWeekdayDate(plan.weddingDate, lang);
  const backHref = `/plan/${planId}?cronograma=1`;

  return (
    <div data-theme="light" className="min-h-screen bg-panel text-ink-strong">
      <div className="print:hidden border-b border-line bg-panel">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <Link href={backHref} className={CTA_SECONDARY}>
            <ArrowLeftIcon aria-hidden="true" className="size-4" />
            {t("print.back")}
          </Link>
          <div className="flex items-center gap-3">
            <p className="hidden text-sm text-ink-muted sm:block">
              {t("print.pdfHint")}
            </p>
            <button type="button" onClick={() => window.print()} className={CTA_PRIMARY}>
              <PrinterIcon aria-hidden="true" className="size-4" />
              {t("print.button")}
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-8 print:max-w-none print:p-0">
        <header className="border-b-2 border-ink pb-4">
          <h1 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            {t("dialog.title")}
          </h1>
          <p className="mt-1 font-display text-lg text-ink-strong">
            {weddingName(plan.title, lang)}
            {date ? ` · ${date}` : ""}
          </p>
        </header>

        {error ? (
          <p role="alert" className="py-8 text-sm text-ink">
            {t("print.loadError")}
          </p>
        ) : items.length === 0 ? (
          <p className="py-8 text-sm text-ink">
            {t("print.empty")}
          </p>
        ) : (
          <>
            <ol>
              {items.map((item) => (
                <PrintRow key={item.id} item={item} owner={responsibleText(item, contacts.byId, { phone: true })} />
              ))}
            </ol>
            {items.some((i) => dayIndex(endMin(i)) > 0) && (
              <p className="mt-4 text-sm text-ink">{t("print.nextDayNote")}</p>
            )}
          </>
        )}

        {contacts.data.length > 0 && <PrintContacts contacts={contacts.data} />}
      </main>
    </div>
  );
}

export function TimelinePrintView({ planId }: { planId: string }) {
  return (
    <RequireAuth>
      <PlanProvider planId={planId}>
        <PrintSectionGate section="dayof">
          <PrintDocument />
        </PrintSectionGate>
      </PlanProvider>
    </RequireAuth>
  );
}
