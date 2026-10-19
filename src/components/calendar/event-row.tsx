"use client";

import Link from "next/link";
import { CheckIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { TYPE_META, type CalendarEvent } from "@/components/calendar/calendar-model";
import { FOCUS } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";

/** Una fila de evento: icono por tipo, título, tipo y detalle; enlaza a su sitio en la app. */
export function EventRow({ event, className }: { event: CalendarEvent; className?: string }) {
  const { t } = useTranslation("calendar");
  const meta = TYPE_META[event.type];
  const Icon = meta.icon;
  return (
    <Link
      href={event.href}
      className={cn(
        FOCUS,
        "flex min-h-14 items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-lilac-soft motion-reduce:transition-none sm:px-3",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", meta.chip)}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate font-display text-base font-semibold text-ink",
            event.done && "text-ink-muted line-through"
          )}
        >
          {event.title}
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-ink-muted">
          <span>{t(`types.${event.type}.one`)}</span>
          {event.detail && <span className="min-w-0 truncate">{event.detail}</span>}
        </span>
      </span>
      {event.done && (
        <span className="inline-flex shrink-0 items-center gap-1 text-sm text-ink-muted">
          <CheckIcon aria-hidden="true" className="size-4 text-green" />
          {t("event.done")}
        </span>
      )}
    </Link>
  );
}
