"use client";

import * as React from "react";
import {
  BadgeCheckIcon,
  BedDoubleIcon,
  CalendarDaysIcon,
  HourglassIcon,
  MountainIcon,
  PlaneIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  TicketIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CTA_PRIMARY } from "@/components/dashboard/ui";
import { CHECKBOX, DeleteIconButton } from "@/components/guests/brand-dialog";
import { StatTile } from "@/components/guests/guest-summary";
import {
  BookingFormDialog,
  BudgetDialog,
  EditBookingTrigger,
} from "@/components/honeymoon/booking-form-dialog";
import { EmptyState, HM_CARD, SectionHeader } from "@/components/honeymoon/ui";
import { Checkbox } from "@/components/ui/checkbox";
import { deleteBooking, restoreBooking, updateBooking } from "@/lib/firebase/honeymoon";
import {
  BOOKING_TYPE_KEY,
  computeBookingTotals,
  type Booking,
  type BookingType,
} from "@/lib/honeymoon-model";
import { useLanguage } from "@/lib/i18n/provider";
import { toastWithUndo } from "@/lib/undo-toast";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { usePlanPermission } from "@/lib/hooks/use-plan-permission";

const TYPE_ICON: Record<BookingType, LucideIcon> = {
  vuelo: PlaneIcon,
  hotel: BedDoubleIcon,
  excursion: MountainIcon,
  seguro: ShieldCheckIcon,
  otro: TicketIcon,
};

function BudgetCard({ budget, bookings }: { budget: number; bookings: Booking[] }) {
  const { t } = useTranslation("honeymoon");
  const { lang } = useLanguage();
  const totals = computeBookingTotals(budget, bookings);
  const hasBudget = budget > 0;
  const over = totals.over > 0;
  return (
    <div className={cn(HM_CARD, "flex flex-col gap-4 p-5 sm:p-6")}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div>
          <p className="text-sm text-ink-muted">{over ? t("bookings.budget.overBy") : t("bookings.budget.left")}</p>
          <p
            className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl"
            data-testid="honeymoon-remaining"
          >
            {hasBudget ? formatCurrency(over ? totals.over : totals.remaining, lang) : "—"}
          </p>
        </div>
        {hasBudget && (
          <p className="pb-1 text-sm text-ink-muted">
            {t("bookings.budget.ofPrefix")}
            <span className="font-medium text-ink">{formatCurrency(budget, lang)}</span>
            {t("bookings.budget.ofSuffix")}
          </p>
        )}
      </div>
      {hasBudget ? (
        <>
          <div
            role="img"
            aria-label={t("bookings.budget.barLabel", { percent: totals.percent })}
            className="h-3 w-full overflow-hidden rounded-full bg-track"
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none",
                over ? "bg-danger-solid" : "bg-lilac"
              )}
              style={{ width: `${totals.ratio}%` }}
            />
          </div>
          <p className="text-sm text-ink-muted">
            {t("bookings.budget.bookedPrefix")}
            <span className="font-medium text-ink">{formatCurrency(totals.booked, lang)}</span> ·{" "}
            <span className="font-medium text-ink">{totals.percent}%</span>
            {t("bookings.budget.ofTotal")}
            {over && t("bookings.budget.rebalance")}
          </p>
        </>
      ) : (
        <p className="text-sm text-ink-muted">
          {t("bookings.budget.setPrompt")}
        </p>
      )}
    </div>
  );
}

function BookingTicket({
  planId,
  booking,
  announce,
}: {
  planId: string;
  booking: Booking;
  announce: (message: string) => void;
}) {
  const { t } = useTranslation("honeymoon");
  const { lang } = useLanguage();
  const { canEdit } = usePlanPermission("honeymoon");
  const Icon = TYPE_ICON[booking.type];

  async function handlePaid(paid: boolean) {
    try {
      await updateBooking(planId, booking.id, { paid });
      announce(t(paid ? "bookings.announce.paid" : "bookings.announce.unpaid", { name: booking.name }));
    } catch {
      toast.error(t("bookings.errors.payment"));
    }
  }

  async function handleDelete() {
    try {
      await deleteBooking(planId, booking.id);
      toastWithUndo(t("bookings.toasts.deleted"), () => restoreBooking(planId, booking));
      announce(t("bookings.announce.deleted", { name: booking.name }));
    } catch {
      toast.error(t("bookings.errors.delete"));
    }
  }

  return (
    <li className={cn(HM_CARD, "flex flex-col overflow-hidden sm:flex-row")}>
      <div className="flex items-center gap-3 bg-lilac-mid px-4 py-3 text-ink-on-tint sm:w-32 sm:flex-col sm:justify-center sm:gap-1.5 sm:px-3 sm:py-5">
        <Icon aria-hidden="true" className="size-7 sm:size-8" strokeWidth={1.6} />
        <span className="text-sm font-semibold">{t(`bookingTypes.${BOOKING_TYPE_KEY[booking.type]}`)}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 border-t border-dashed border-line-strong p-4 sm:border-l sm:border-t-0 sm:p-5">
        <h3 className="break-words font-display text-lg font-semibold leading-snug text-ink-strong">{booking.name}</h3>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDaysIcon aria-hidden="true" className="size-3.5" />
            {booking.date ? formatDate(booking.date, lang) : t("bookings.noDate")}
          </span>
          {booking.confirmationCode && (
            <span className="inline-flex items-center gap-1.5">
              <TicketIcon aria-hidden="true" className="size-3.5" />
              <span>
                {t("bookings.code")} <span className="rounded-md bg-lilac-soft px-1.5 py-0.5 font-mono font-medium tracking-wider text-ink">{booking.confirmationCode}</span>
              </span>
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-dashed border-line-strong p-4 sm:w-60 sm:flex-col sm:items-stretch sm:justify-center sm:border-l sm:border-t-0 sm:p-5">
        <div className="sm:text-right">
          <p className="font-display text-2xl font-semibold leading-none text-ink">{formatCurrency(booking.price, lang)}</p>
          <label
            className={cn(
              "mt-2 inline-flex min-h-8 items-center gap-2.5 text-sm",
              canEdit && "cursor-pointer",
              booking.paid ? "font-medium text-ink" : "text-ink-muted"
            )}
          >
            <Checkbox
              checked={booking.paid}
              onCheckedChange={(v) => handlePaid(v === true)}
              disabled={!canEdit}
              aria-label={t("bookings.markPaidAria", { name: booking.name })}
              className={CHECKBOX}
            />
            {booking.paid ? t("bookings.paid") : t("bookings.pending")}
          </label>
        </div>
        {canEdit && (
          <div className="-mr-2 flex sm:justify-end">
            <BookingFormDialog
              planId={planId}
              booking={booking}
              trigger={<EditBookingTrigger name={booking.name} />}
            />
            <DeleteIconButton ariaLabel={t("bookings.deleteAria", { name: booking.name })} onDelete={handleDelete} />
          </div>
        )}
      </div>
    </li>
  );
}

export function Bookings({
  planId,
  bookings,
  budget,
  announce,
}: {
  planId: string;
  bookings: Booking[];
  budget: number;
  announce: (message: string) => void;
}) {
  const { t } = useTranslation("honeymoon");
  const { lang } = useLanguage();
  const { canEdit } = usePlanPermission("honeymoon");
  const totals = computeBookingTotals(budget, bookings);
  return (
    <section aria-labelledby="hm-reservas-title" className="flex flex-col gap-4">
      <SectionHeader
        id="hm-reservas-title"
        icon={<WalletIcon />}
        title={t("bookings.title")}
        description={t("bookings.description")}
        actions={
          canEdit ? (
            <>
              <BudgetDialog planId={planId} budgetTotal={budget} />
              {bookings.length > 0 && <BookingFormDialog planId={planId} />}
            </>
          ) : undefined
        }
      />

      <BudgetCard budget={budget} bookings={bookings} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatTile
          icon={<ReceiptIcon />}
          tone="lilac"
          label={t("bookings.stats.booked")}
          value={formatCurrency(totals.booked, lang)}
          detail={t("bookings.stats.bookedDetail", { count: totals.count })}
        />
        <StatTile
          icon={<BadgeCheckIcon />}
          tone="sage"
          label={t("bookings.stats.paid")}
          value={formatCurrency(totals.paid, lang)}
          detail={t("bookings.stats.paidDetail", { paid: totals.paidCount, count: totals.count })}
        />
        <StatTile
          icon={<HourglassIcon />}
          tone="lilac"
          label={t("bookings.stats.toPay")}
          value={formatCurrency(totals.toPay, lang)}
          detail={t("bookings.stats.toPayDetail")}
        />
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          scene="selva"
          title={t("bookings.empty.title")}
          action={
            canEdit ? (
              <BookingFormDialog
                planId={planId}
                trigger={
                  <button type="button" className={CTA_PRIMARY}>
                    {t("bookings.empty.action")}
                  </button>
                }
              />
            ) : undefined
          }
        >
          {t("bookings.empty.text")}
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3" aria-label={t("bookings.listLabel")}>
          {bookings.map((booking) => (
            <BookingTicket key={booking.id} planId={planId} booking={booking} announce={announce} />
          ))}
        </ul>
      )}
    </section>
  );
}
