"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";

import { IdeasList, type IdeaItem } from "@/components/ideas/ideas-list";
import { IdeasPanel } from "@/components/ideas/ideas-panel";
import { ideaKey, keySet, titlesInAllLanguages, type IdeaGroup } from "@/components/ideas/ideas-text";
import {
  findCeremony,
  formatClock,
  formatDuration,
  suggestStart,
} from "@/components/timeline/timeline-model";
import { addTimelineItem } from "@/lib/firebase/timeline";
import { useLanguage } from "@/lib/i18n/provider";
import { TIMELINE_MOMENT_IDEAS } from "@/lib/ideas";
import type { TimelineItem } from "@/lib/types";

/** Fases del día para filtrar, según la hora típica respecto a la ceremonia (vendors:ideas.timeline.phases.<id>). */
const PHASE_IDS = ["before", "ceremony", "cocktail", "party"] as const;

function phaseOf(offset: number | undefined): string {
  if (offset === undefined || offset >= 150) return "party";
  if (offset < 0) return "before";
  if (offset < 60) return "ceremony";
  return "cocktail";
}

/**
 * «✨ Ideas» del cronograma: momentos típicos que se colocan según la hora de
 * la ceremonia (o al final del último momento si no hay ceremonia).
 */
export function TimelineIdeas({
  planId,
  items,
  align,
  className,
}: {
  planId: string;
  /** Momentos actuales, ordenados. */
  items: TimelineItem[];
  align?: "start" | "center" | "end";
  className?: string;
}) {
  const { t } = useTranslation("vendors");
  const { lang } = useLanguage();
  const phases: IdeaGroup[] = PHASE_IDS.map((id) => ({ id, label: t(`ideas.timeline.phases.${id}`) }));
  const ceremony = findCeremony(items);
  const existing = React.useMemo(() => keySet(items.map((i) => i.title)), [items]);

  const rows = React.useMemo<IdeaItem[]>(
    () =>
      TIMELINE_MOMENT_IDEAS.map((idea) => {
        const startMin = suggestStart(items, idea.typicalOffsetMin);
        const title = t(`ideas.moments.${idea.id}.title`);
        return {
          key: idea.id,
          title,
          hint: t(`ideas.moments.${idea.id}.hint`, { defaultValue: "" }) || undefined,
          // Dónde caerá: la hora y cuánto dura.
          pills: [`${formatClock(startMin)} · ${formatDuration(idea.durationMin, lang)}`],
          group: phaseOf(idea.typicalOffsetMin),
          // El momento puede estar guardado en cualquiera de los idiomas.
          present: titlesInAllLanguages(`ideas.moments.${idea.id}.title`).some((text) =>
            existing.has(ideaKey(text))
          ),
          onAdd: () =>
            addTimelineItem(planId, {
              title,
              startMin,
              durationMin: idea.durationMin,
              location: "",
              responsible: "",
              notes: "",
              highlight: false,
            }),
        };
      }),
    [items, existing, planId, t, lang]
  );

  return (
    <IdeasPanel
      title={t("ideas.timeline.title")}
      description={
        ceremony
          ? t("ideas.timeline.withCeremony", { time: formatClock(ceremony.startMin) })
          : t("ideas.timeline.noCeremony")
      }
      align={align}
      className={className}
    >
      {(ctx) => (
        <IdeasList
          items={rows}
          ctx={ctx}
          gender="m"
          addedMessage={t("ideas.timeline.added")}
          errorMessage={t("ideas.timeline.error")}
          emptyText={t("ideas.timeline.empty")}
          groups={phases}
          groupsLabel={t("ideas.timeline.filter")}
        />
      )}
    </IdeasPanel>
  );
}
