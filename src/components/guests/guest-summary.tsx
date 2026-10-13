import { ArmchairIcon, CheckIcon, ClockIcon, UserPlusIcon, UserXIcon, UsersIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { CARD, IconCircle, MiniBar } from "@/components/dashboard/ui";
import { summarizeGuests } from "@/components/dashboard/helpers";
import { Bone } from "@/components/plan/plan-shell";
import { cn } from "@/lib/utils";
import type { Guest } from "@/lib/types";
import { summarizeSeats } from "./guest-filters";

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
        <h3 className="min-w-0 flex-1 font-display text-base font-semibold leading-snug text-ink-strong">{label}</h3>
      </div>
      <span className="block break-words font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">
        {value}
      </span>
      {bar !== undefined && <MiniBar value={bar} tone={barTone} />}
      <span className="block text-sm text-ink-muted">{detail}</span>
    </div>
  );
}

export function GuestSummary({ guests }: { guests: Guest[] }) {
  const { t } = useTranslation("guests");
  const g = summarizeGuests(guests);
  const seats = summarizeSeats(guests);
  return (
    <section aria-labelledby="guest-summary-title" className="flex flex-col gap-3 sm:gap-4">
      <h2 id="guest-summary-title" className="sr-only">
        {t("summary.title")}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatTile
          className="col-span-2 lg:col-span-1"
          icon={<UsersIcon />}
          tone="lilac"
          label={t("summary.guests")}
          value={g.total}
          detail={t("summary.peopleInList", { count: g.total })}
        />
        <StatTile
          icon={<CheckIcon />}
          tone="sage"
          label={t("summary.confirmed")}
          value={g.confirmed}
          detail={t("summary.ofList", { ratio: g.ratio })}
          bar={g.ratio}
        />
        <StatTile
          icon={<ClockIcon />}
          tone="lilac"
          label={t("summary.pending")}
          value={g.pending}
          detail={t("summary.pendingDetail")}
        />
        <StatTile
          icon={<UserXIcon />}
          tone="sage"
          label={t("summary.declined")}
          value={g.declined}
          detail={t("summary.declinedDetail", { count: g.declined })}
        />
        <StatTile
          icon={<ArmchairIcon />}
          tone="lilac"
          label={t("summary.seats")}
          value={seats.seats}
          detail={
            seats.extraSeatsConfirmed > 0
              ? `${t("summary.confirmedCount", { count: g.confirmed })} + ${t("summary.companionCount", { count: seats.extraSeatsConfirmed })}`
              : t("summary.seatsDetail")
          }
        />
      </div>
      <CompanionSummary seats={seats} />
    </section>
  );
}

/** Invitados que llevan acompañante y los cubiertos extra que suponen. */
function CompanionSummary({ seats }: { seats: ReturnType<typeof summarizeSeats> }) {
  const { t } = useTranslation("guests");
  const n = seats.withCompanion;
  return (
    <div className={cn(CARD, "flex min-w-0 items-start gap-3 p-4 sm:items-center sm:gap-4 sm:p-5")}>
      <IconCircle tone="sage" className="size-9 shrink-0 sm:size-10">
        <UserPlusIcon />
      </IconCircle>
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-base font-semibold leading-snug text-ink-strong">{t("summary.withCompanion")}</h3>
        {n === 0 ? (
          <p className="mt-0.5 text-sm text-ink-muted">
            {t("summary.noCompanions")}
          </p>
        ) : (
          <>
            <p className="mt-0.5 break-words font-display text-xl font-semibold leading-tight text-ink sm:text-2xl">
              {t("summary.companionGuests", { count: n })}
              <span aria-hidden="true"> → </span>
              <span className="sr-only">: </span>
              {t("summary.extraSeats", { count: n })}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              {t("summary.companionsConfirmed", { count: seats.withCompanionConfirmed })}
              {" · "}
              {t("summary.maxSeats", { count: seats.maxSeats })}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/** Esqueleto de la pantalla de invitados (mismo aspecto que el contenido). */
export function GuestsSkeleton() {
  const { t } = useTranslation("guests");
  return (
    <div className="flex flex-col gap-5" role="status" aria-label={t("summary.loading")}>
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
