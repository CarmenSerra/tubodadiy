import { CheckIcon, ClockIcon, ArmchairIcon, UserXIcon, UsersIcon } from "lucide-react";

import { CARD, IconCircle, MiniBar } from "@/components/dashboard/ui";
import { summarizeGuests } from "@/components/dashboard/helpers";
import { Bone } from "@/components/plan/plan-shell";
import { cn } from "@/lib/utils";
import type { Guest } from "@/lib/types";
import { estimateAttendees } from "./guest-filters";

export function StatTile({
  icon,
  tone,
  label,
  value,
  detail,
  bar,
  barTone = "sage",
  className,
}: {
  icon: React.ReactNode;
  tone: "lilac" | "sage";
  label: string;
  value: React.ReactNode;
  detail: string;
  bar?: number;
  barTone?: "lilac" | "sage";
  className?: string;
}) {
  return (
    <div className={cn(CARD, "flex min-w-0 flex-col gap-2.5 p-4 sm:p-5", className)}>
      <div className="flex items-center gap-3">
        <IconCircle tone={tone} className="size-9 sm:size-10">
          {icon}
        </IconCircle>
        <h3 className="min-w-0 flex-1 font-display text-base font-semibold leading-snug text-[#102D28]">{label}</h3>
      </div>
      <span className="block break-words font-display text-2xl font-semibold leading-tight text-[#26413C] sm:text-3xl">
        {value}
      </span>
      {bar !== undefined && <MiniBar value={bar} tone={barTone} />}
      <span className="block text-sm text-[#586C64]">{detail}</span>
    </div>
  );
}

export function GuestSummary({ guests }: { guests: Guest[] }) {
  const g = summarizeGuests(guests);
  const attendees = estimateAttendees(guests);
  return (
    <section aria-labelledby="guest-summary-title" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
      <h2 id="guest-summary-title" className="sr-only">
        Resumen de invitados
      </h2>
      <StatTile
        className="col-span-2 lg:col-span-1"
        icon={<UsersIcon />}
        tone="lilac"
        label="Invitados"
        value={g.total}
        detail={g.total === 1 ? "persona en tu lista" : "personas en tu lista"}
      />
      <StatTile
        icon={<CheckIcon />}
        tone="sage"
        label="Confirmados"
        value={g.confirmed}
        detail={`${g.ratio}% de la lista`}
        bar={g.ratio}
      />
      <StatTile
        icon={<ClockIcon />}
        tone="lilac"
        label="Pendientes"
        value={g.pending}
        detail="sin respuesta todavía"
      />
      <StatTile
        icon={<UserXIcon />}
        tone="sage"
        label="No asisten"
        value={g.declined}
        detail={g.declined === 1 ? "no podrá venir" : "no podrán venir"}
      />
      <StatTile
        icon={<ArmchairIcon />}
        tone="lilac"
        label="Asistentes"
        value={attendees}
        detail="estimados: confirmados y acompañantes"
      />
    </section>
  );
}

/** Esqueleto de la pantalla de invitados (mismo aspecto que el contenido). */
export function GuestsSkeleton() {
  return (
    <div className="flex flex-col gap-5" role="status" aria-label="Cargando invitados">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              CARD,
              "flex flex-col gap-3 p-4 sm:p-5",
              i === 0 && "col-span-2 lg:col-span-1"
            )}
          >
            <div className="flex items-center gap-3">
              <Bone className="size-9 shrink-0 rounded-full sm:size-10" />
              <Bone className="h-3 w-1/2" />
            </div>
            <Bone className="h-7 w-1/3" />
            <Bone className="h-3 w-2/3" />
          </div>
        ))}
      </div>
      <div className={cn(CARD, "flex flex-col gap-3 p-4 sm:p-5")}>
        <Bone className="h-11 w-full" />
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Bone key={i} className="h-9 w-24 rounded-full" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cn(CARD, "flex items-center justify-between gap-4 px-5 py-5")}>
            <div className="flex flex-1 flex-col gap-2.5">
              <Bone className="h-4 w-1/3" />
              <Bone className="h-3 w-1/4" />
            </div>
            <Bone className="h-6 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
