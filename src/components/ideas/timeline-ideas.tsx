"use client";

import * as React from "react";

import { IdeasList, type IdeaItem } from "@/components/ideas/ideas-list";
import { IdeasPanel } from "@/components/ideas/ideas-panel";
import { ideaKey, keySet, type IdeaGroup } from "@/components/ideas/ideas-text";
import {
  findCeremony,
  formatClock,
  formatDuration,
  suggestStart,
} from "@/components/timeline/timeline-model";
import { addTimelineItem } from "@/lib/firebase/timeline";
import { TIMELINE_MOMENT_IDEAS } from "@/lib/ideas";
import type { TimelineItem } from "@/lib/types";

/** Fases del día para filtrar, según la hora típica respecto a la ceremonia. */
const PHASES: IdeaGroup[] = [
  { id: "before", label: "Antes" },
  { id: "ceremony", label: "Ceremonia" },
  { id: "cocktail", label: "Cóctel" },
  { id: "party", label: "Banquete y fiesta" },
];

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
  const ceremony = findCeremony(items);
  const existing = React.useMemo(() => keySet(items.map((i) => i.title)), [items]);

  const rows = React.useMemo<IdeaItem[]>(
    () =>
      TIMELINE_MOMENT_IDEAS.map((idea) => {
        const startMin = suggestStart(items, idea.typicalOffsetMin);
        return {
          key: ideaKey(idea.title),
          title: idea.title,
          hint: idea.hint,
          // Dónde caerá: la hora y cuánto dura.
          pills: [`${formatClock(startMin)} · ${formatDuration(idea.durationMin)}`],
          group: phaseOf(idea.typicalOffsetMin),
          present: existing.has(ideaKey(idea.title)),
          onAdd: () =>
            addTimelineItem(planId, {
              title: idea.title,
              startMin,
              durationMin: idea.durationMin,
              location: "",
              responsible: "",
              notes: "",
              highlight: false,
            }),
        };
      }),
    [items, existing, planId]
  );

  return (
    <IdeasPanel
      title="Ideas para tu cronograma"
      description={
        ceremony
          ? `Se colocan alrededor de la ceremonia (${formatClock(ceremony.startMin)}). Luego puedes ajustar la hora.`
          : "No hay un momento «Ceremonia»: las ideas se añaden al final de lo que ya tienes. Luego puedes ajustar la hora."
      }
      align={align}
      className={className}
    >
      {(ctx) => (
        <IdeasList
          items={rows}
          ctx={ctx}
          gender="m"
          addedMessage="Momento añadido"
          errorMessage="No se ha podido añadir el momento."
          emptyText="Ya tienes todos los momentos habituales."
          groups={PHASES}
          groupsLabel="Filtrar momentos por fase del día"
        />
      )}
    </IdeasPanel>
  );
}
