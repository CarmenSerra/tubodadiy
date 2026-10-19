"use client";

import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROW_FOCUS } from "@/components/guests/brand-dialog";
import type { RsvpStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

// Estados de respuesta en tono calmado (nada de rojo): todos con texto >= 4.5:1
// sobre su fondo y sobre la tarjeta crema (#F8F5F1).
export const RSVP_ORDER: RsvpStatus[] = ["confirmed", "pending", "declined"];

// El texto sale de guests:rsvp.<estado>.
export const RSVP_CONFIG: Record<RsvpStatus, { badge: string; active: string }> = {
  confirmed: {
    badge: "border-transparent bg-sage-pale text-ink",
    active: "border-sage bg-sage-pale text-ink",
  },
  pending: {
    badge: "border-line-strong bg-transparent text-ink-muted",
    active: "border-line-strong bg-page text-ink-on-lilac",
  },
  declined: {
    badge: "border-transparent bg-lilac-soft text-ink-muted dark:text-ink",
    active: "border-line-strong bg-lilac-soft text-ink-on-lilac",
  },
};

export function RsvpBadge({ status, className }: { status: RsvpStatus; className?: string }) {
  const { t } = useTranslation("guests");
  const config = RSVP_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.badge,
        className
      )}
    >
      {status === "confirmed" && <CheckIcon className="size-3" aria-hidden="true" />}
      {t(`rsvp.${status}`)}
    </span>
  );
}

/** Escritorio: la insignia actual es un menú compacto para cambiar la respuesta. */
export function RsvpMenu({
  name,
  value,
  onChange,
  readOnly = false,
}: {
  name: string;
  value: RsvpStatus;
  onChange: (status: RsvpStatus) => void;
  /** Solo ver: la respuesta se muestra sin menú. */
  readOnly?: boolean;
}) {
  const { t } = useTranslation("guests");
  if (readOnly) return <RsvpBadge status={value} />;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("rsvp.changeAria", { name, status: t(`rsvp.${value}`) })}
          className={cn(
            "group -ml-1 inline-flex items-center gap-1 rounded-full py-1 pl-1 pr-1.5 transition-colors hover:bg-lilac-soft data-[state=open]:bg-lilac-soft",
            ROW_FOCUS
          )}
        >
          <RsvpBadge status={value} />
          <ChevronDownIcon
            className="size-4 text-ink-muted transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-44 rounded-xl border-line bg-surface p-1.5 text-ink-strong shadow-md"
      >
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as RsvpStatus)}>
          {RSVP_ORDER.map((status) => (
            <DropdownMenuRadioItem
              key={status}
              value={status}
              className="rounded-lg py-2 text-sm focus:bg-lilac-soft focus:text-ink"
            >
              {t(`rsvp.${status}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Móvil: control segmentado de tres opciones, siempre visible en la tarjeta. */
export function RsvpSegmented({
  name,
  value,
  onChange,
  readOnly = false,
}: {
  name: string;
  value: RsvpStatus;
  onChange: (status: RsvpStatus) => void;
  /** Solo ver: la respuesta se muestra sin controles. */
  readOnly?: boolean;
}) {
  const { t } = useTranslation("guests");
  if (readOnly) return <RsvpBadge status={value} className="w-fit" />;
  return (
    <div
      role="group"
      aria-label={t("rsvp.groupAria", { name })}
      className="grid grid-cols-3 gap-1 rounded-full border border-line-strong bg-raised p-1"
    >
      {RSVP_ORDER.map((status) => {
        const active = value === status;
        return (
          <button
            key={status}
            type="button"
            aria-pressed={active}
            onClick={() => !active && onChange(status)}
            className={cn(
              "inline-flex h-9 items-center justify-center gap-1 rounded-full border px-1.5 text-[13px] transition-colors",
              ROW_FOCUS,
              active
                ? cn("font-semibold", RSVP_CONFIG[status].active)
                : "border-transparent font-medium text-ink-muted hover:bg-lilac-soft"
            )}
          >
            {active && status === "confirmed" && <CheckIcon className="size-3.5" aria-hidden="true" />}
            {t(`rsvp.${status}`)}
          </button>
        );
      })}
    </div>
  );
}
