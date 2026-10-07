"use client";

import { CheckIcon, ChevronDownIcon } from "lucide-react";

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

export const RSVP_CONFIG: Record<RsvpStatus, { label: string; badge: string; active: string }> = {
  confirmed: {
    label: "Confirmado",
    badge: "border-transparent bg-[#D2D7CB] text-[#26413C]",
    active: "border-[#8FAF8A] bg-[#D2D7CB] text-[#26413C]",
  },
  pending: {
    label: "Pendiente",
    badge: "border-[#D4C0EA] bg-transparent text-[#586C64]",
    active: "border-[#D4C0EA] bg-[#F4F1EB] text-[#38384D]",
  },
  declined: {
    label: "No asiste",
    badge: "border-transparent bg-[#ECE6F4] text-[#586C64]",
    active: "border-[#D4C0EA] bg-[#ECE6F4] text-[#38384D]",
  },
};

export function RsvpBadge({ status, className }: { status: RsvpStatus; className?: string }) {
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
      {config.label}
    </span>
  );
}

/** Escritorio: la insignia actual es un menú compacto para cambiar la respuesta. */
export function RsvpMenu({
  name,
  value,
  onChange,
}: {
  name: string;
  value: RsvpStatus;
  onChange: (status: RsvpStatus) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Respuesta de ${name}: ${RSVP_CONFIG[value].label}. Cambiar`}
          className={cn(
            "group -ml-1 inline-flex items-center gap-1 rounded-full py-1 pl-1 pr-1.5 transition-colors hover:bg-[#ECE6F4] data-[state=open]:bg-[#ECE6F4]",
            ROW_FOCUS
          )}
        >
          <RsvpBadge status={value} />
          <ChevronDownIcon
            className="size-4 text-[#586C64] transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-44 rounded-xl border-[#E5DDEC] bg-[#F8F5F1] p-1.5 text-[#102D28] shadow-md"
      >
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as RsvpStatus)}>
          {RSVP_ORDER.map((status) => (
            <DropdownMenuRadioItem
              key={status}
              value={status}
              className="rounded-lg py-2 text-sm focus:bg-[#ECE6F4] focus:text-[#26413C]"
            >
              {RSVP_CONFIG[status].label}
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
}: {
  name: string;
  value: RsvpStatus;
  onChange: (status: RsvpStatus) => void;
}) {
  return (
    <div
      role="group"
      aria-label={`Respuesta de ${name}`}
      className="grid grid-cols-3 gap-1 rounded-full border border-[#D4C0EA] bg-white p-1"
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
                : "border-transparent font-medium text-[#586C64] hover:bg-[#ECE6F4]"
            )}
          >
            {active && status === "confirmed" && <CheckIcon className="size-3.5" aria-hidden="true" />}
            {RSVP_CONFIG[status].label}
          </button>
        );
      })}
    </div>
  );
}
