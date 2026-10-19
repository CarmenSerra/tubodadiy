"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarClockIcon, PlusIcon, PrinterIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { CeremonySection } from "@/components/ceremony/section";
import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import { ListBody } from "@/components/dayof/ui";
import { useTimelineLauncher } from "@/components/timeline/timeline-launcher";
import { endMin, formatClock, sortItems } from "@/components/timeline/timeline-model";
import { usePlanContext } from "@/lib/context/plan-context";
import { usePlanPermission } from "@/lib/hooks/use-plan-permission";
import type { DayContact } from "@/lib/dayof-model";
import type { TimelineMoment } from "@/lib/firebase/timeline";

/**
 * «Escaleta del día»: acceso al cronograma existente (abre su diálogo) y un resumen de a
 * cuántos momentos ya les has puesto responsable.
 */
export function ScheduleSection({
  moments,
  contacts,
  loading,
  error,
}: {
  moments: TimelineMoment[];
  contacts: DayContact[];
  loading: boolean;
  error: string | null;
}) {
  const { t } = useTranslation("dayof");
  const { planId } = usePlanContext();
  const launcher = useTimelineLauncher();
  const { canEdit } = usePlanPermission("dayof");
  const sorted = React.useMemo(() => sortItems(moments), [moments]);
  const ids = React.useMemo(() => new Set(contacts.map((c) => c.id)), [contacts]);
  const withOwner = sorted.filter(
    (m) => m.responsible.trim() || (m.responsibleContactId && ids.has(m.responsibleContactId))
  ).length;

  // Sin proveedor del diálogo (no debería pasar en esta pestaña) se llega por el enlace directo.
  const openHref = `/plan/${planId}/dia-b?cronograma=1`;
  const openLabel = sorted.length > 0 || !canEdit ? t("schedule.open") : t("schedule.create");
  const OpenIcon = sorted.length > 0 ? CalendarClockIcon : PlusIcon;
  const openButton = launcher ? (
    <button type="button" onClick={launcher.open} className={CTA_PRIMARY}>
      <OpenIcon aria-hidden="true" className="size-4" />
      {openLabel}
    </button>
  ) : (
    <Link href={openHref} className={CTA_PRIMARY}>
      <OpenIcon aria-hidden="true" className="size-4" />
      {openLabel}
    </Link>
  );

  return (
    <CeremonySection
      id="escaleta"
      icon={<CalendarClockIcon />}
      title={t("schedule.title")}
      description={t("schedule.description")}
    >
      <ListBody
        loading={loading}
        error={error}
        empty={sorted.length === 0}
        emptyText={t("schedule.empty")}
        emptyAction={canEdit ? openButton : undefined}
      >
        <p className="text-sm text-ink-strong">
          {t("schedule.summary", {
            count: sorted.length,
            from: formatClock(sorted[0]?.startMin ?? 0),
            to: formatClock(Math.max(...sorted.map(endMin))),
          })}
        </p>
        <p className="text-sm text-ink-muted">
          {contacts.length === 0
            ? t("schedule.ownersNoContacts")
            : t("schedule.owners", { done: withOwner, total: sorted.length })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {openButton}
          <Link
            href={`/plan/${planId}/cronograma/imprimir`}
            target="_blank"
            rel="noopener"
            className={CTA_SECONDARY}
          >
            <PrinterIcon aria-hidden="true" className="size-4" />
            {t("schedule.print")}
            <span className="sr-only"> {t("common.newTab")}</span>
          </Link>
        </div>
      </ListBody>
    </CeremonySection>
  );
}
