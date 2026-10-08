"use client";

import Link from "next/link";
import { StoreIcon, UsersIcon, WalletIcon, type LucideIcon } from "lucide-react";

import { computeTotals, formatMoney } from "@/components/budget/budget-math";
import type { WeddingPlan } from "@/lib/types";
import { cn } from "@/lib/utils";
import { summarizeGuests, summarizeVendors, type FeaturedPlanData } from "./helpers";
import { CARD, FOCUS, Skeleton } from "./ui";

const STAT_CARD = cn(
  CARD,
  FOCUS,
  "group block p-4 transition-colors hover:bg-surface-alt hover:border-line-strong motion-reduce:transition-none sm:p-5"
);

function StatBody({
  label,
  icon: Icon,
  loading,
  value,
  muted,
}: {
  label: string;
  icon: LucideIcon;
  loading: boolean;
  value: string;
  muted: boolean;
}) {
  return (
    <>
      <span className="flex items-center gap-2 text-sm text-ink-muted">
        <Icon className="size-4 shrink-0 text-ink-on-tint" aria-hidden="true" />
        {label}
      </span>
      {loading ? (
        <span role="status" aria-label={`Cargando ${label.toLowerCase()}`}>
          <Skeleton className="mt-3 h-6 w-2/3" />
        </span>
      ) : (
        <span
          className={cn(
            "mt-1.5 block font-display leading-snug [overflow-wrap:anywhere]",
            muted ? "text-base text-ink-muted underline decoration-btn-soft decoration-2 underline-offset-4" : "text-xl font-semibold text-ink"
          )}
        >
          {value}
        </span>
      )}
    </>
  );
}

function Stat({
  href,
  label,
  icon,
  loading,
  value,
  muted = false,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  loading: boolean;
  value: string;
  /** Estado vacío: invitación en voz baja, no un dato. */
  muted?: boolean;
}) {
  return (
    <Link href={href} className={STAT_CARD}>
      <StatBody label={label} icon={icon} loading={loading} value={value} muted={muted} />
    </Link>
  );
}

/** "De un vistazo": tres datos y un enlace cada uno a su pestaña. */
export function GlanceRow({ plan, data }: { plan: WeddingPlan; data: FeaturedPlanData }) {
  const totals = computeTotals(plan.budgetTotal, data.budgetItems);
  const guests = summarizeGuests(data.guests);
  const vendors = summarizeVendors(data.vendors);

  const hasBudget = plan.budgetTotal > 0;
  const budgetValue = !hasBudget
    ? "Añade tu presupuesto"
    : totals.over > 0
      ? `${formatMoney(totals.over)} por encima`
      : `Te quedan ${formatMoney(totals.remaining)}`;

  const guestsValue =
    guests.total === 0
      ? "Añade a tus invitados"
      : `${guests.confirmed} de ${guests.total} ${guests.confirmed === 1 ? "confirmado" : "confirmados"}`;

  const vendorsValue =
    vendors.total === 0
      ? "Guarda tus proveedores"
      : vendors.booked > 0
        ? `${vendors.booked} ${vendors.booked === 1 ? "elegido" : "elegidos"}`
        : `${vendors.total} en estudio`;

  return (
    <section aria-labelledby="glance-title">
      <h2 id="glance-title" className="mb-3 font-display text-lg font-semibold text-ink">
        De un vistazo
      </h2>
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <Stat
          href={`/plan/${plan.id}/budget`}
          label="Presupuesto"
          icon={WalletIcon}
          loading={data.loading && data.budgetItems.length === 0}
          value={budgetValue}
          muted={!hasBudget}
        />
        <Stat
          href={`/plan/${plan.id}/guests`}
          label="Invitados"
          icon={UsersIcon}
          loading={data.loading && data.guests.length === 0}
          value={guestsValue}
          muted={guests.total === 0}
        />
        <Stat
          href={`/plan/${plan.id}/vendors`}
          label="Proveedores"
          icon={StoreIcon}
          loading={data.loading && data.vendors.length === 0}
          value={vendorsValue}
          muted={vendors.total === 0}
        />
      </div>
    </section>
  );
}
