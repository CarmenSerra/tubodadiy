"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";

import { ContactsSection } from "@/components/dayof/contacts-section";
import { PlaylistSection } from "@/components/dayof/playlist-section";
import { ScheduleSection } from "@/components/dayof/schedule-section";
import { ShotsSection } from "@/components/dayof/shots-section";
import { useDayContacts, useShots, useSongs } from "@/components/dayof/use-dayof";
import { CARD, FOCUS, SECTION_TITLE } from "@/components/dashboard/ui";
import { formatWeekdayDate } from "@/components/timeline/timeline-model";
import { usePlanContext } from "@/lib/context/plan-context";
import { shotProgress, type DayOfSection } from "@/lib/dayof-model";
import { mapTimelineMoment } from "@/lib/firebase/timeline";
import { timelineItemsQuery } from "@/lib/firebase/plans";
import { useCollection } from "@/lib/hooks/use-collection";
import { useLanguage } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

/** Pestaña «Día B»: contactos, fotos clave, playlist y acceso a la escaleta. */
export function DayOfPage() {
  const { t } = useTranslation("dayof");
  const { lang } = useLanguage();
  const { planId, plan } = usePlanContext();
  const contacts = useDayContacts(planId);
  const shots = useShots(planId);
  const songs = useSongs(planId);
  const timeline = useCollection(timelineItemsQuery(planId), mapTimelineMoment);

  // Las tareas del plan llevan aquí con un ancla (#contactos, #fotos, #playlist, #escaleta).
  React.useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const progress = shotProgress(shots.data);
  const dateText = formatWeekdayDate(plan?.weddingDate, lang);

  const tiles: { section: DayOfSection; label: string; value: string }[] = [
    { section: "contactos", label: t("summary.contacts"), value: String(contacts.data.length) },
    {
      section: "fotos",
      label: t("summary.shots"),
      value: shots.data.length > 0 ? t("summary.shotsValue", { done: progress.done, total: progress.total }) : "0",
    },
    { section: "playlist", label: t("summary.songs"), value: String(songs.data.length) },
    { section: "escaleta", label: t("summary.schedule"), value: String(timeline.data.length) },
  ];

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="dayof-summary-title" className={cn(CARD, "flex flex-col gap-4 p-5 sm:p-6")}>
        <div className="flex flex-col gap-1">
          <h2 id="dayof-summary-title" className={SECTION_TITLE}>
            {t("summary.title")}
          </h2>
          <p className="text-sm text-ink-muted">{dateText ?? t("summary.noDate")}</p>
        </div>
        <nav aria-label={t("summary.navLabel")}>
          <ul className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {tiles.map((tile) => (
              <li key={tile.section}>
                <a
                  href={`#${tile.section}`}
                  className={cn(
                    "flex min-h-14 flex-col justify-center rounded-xl border border-line bg-field px-3.5 py-2 transition-colors hover:bg-lilac-soft",
                    FOCUS
                  )}
                >
                  <span className="text-xs font-medium text-ink-muted">{tile.label}</span>
                  <span className="font-display text-xl font-semibold tabular-nums text-ink">{tile.value}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </section>

      <ContactsSection contacts={contacts.data} loading={contacts.loading} error={contacts.error} />
      <ShotsSection shots={shots.data} loading={shots.loading} error={shots.error} />
      <PlaylistSection songs={songs.data} loading={songs.loading} error={songs.error} />
      <ScheduleSection
        moments={timeline.data}
        contacts={contacts.data}
        loading={timeline.loading}
        error={timeline.error}
      />
    </div>
  );
}
