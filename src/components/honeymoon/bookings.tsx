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
  BOOKING_TYPE_LABEL,
  computeBookingTotals,
  type Booking,
  type BookingType,
} from "@/lib/honeymoon-model";
import { toastWithUndo } from "@/lib/undo-toast";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

const TYPE_ICON: Record<BookingType, LucideIcon> = {
  vuelo: PlaneIcon,
  hotel: BedDoubleIcon,
  excursion: MountainIcon,
  seguro: ShieldCheckIcon,
  otro: TicketIcon,
};

function BudgetCard({ budget, bookings }: { budget: number; bookings: Booking[] }) {
  const t = computeBookingTotals(budget, bookings);
  const hasBudget = budget > 0;
  const over = t.over > 0;
  return (
    <div className={cn(HM_CARD, "flex flex-col gap-4 p-5 sm:p-6")}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div>
          <p className="text-sm text-ink-muted">{over ? "Por encima del presupuesto" : "Te queda"}</p>
          <p
            className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl"
            data-testid="honeymoon-remaining"
          >
            {hasBudget ? formatCurrency(over ? t.over : t.remaining) : "—"}
          </p>
        </div>
        {hasBudget && (
          <p className="pb-1 text-sm text-ink-muted">
            de <span className="font-medium text-ink">{formatCurrency(budget)}</span> para la luna de miel
          </p>
        )}
      </div>
      {hasBudget ? (
        <>
          <div
            role="img"
            aria-label={`Has reservado el ${t.percent}% del presupuesto de la luna de miel`}
            className="h-3 w-full overflow-hidden rounded-full bg-track"
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none",
                over ? "bg-danger-solid" : "bg-lilac"
              )}
              style={{ width: `${t.ratio}%` }}
            />
          </div>
          <p className="text-sm text-ink-muted">
            Reservado <span className="font-medium text-ink">{formatCurrency(t.booked)}</span> ·{" "}
            <span className="font-medium text-ink">{t.percent}%</span> del total
            {over && ". Es un buen momento para reajustar con calma."}
          </p>
        </>
      ) : (
        <p className="text-sm text-ink-muted">
          Fija cuánto quieres gastar en el viaje y verás cuánto te queda según vayas apuntando reservas. Es
          independiente del presupuesto de la boda.
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
  const Icon = TYPE_ICON[booking.type];

  async function handlePaid(paid: boolean) {
    try {
      await updateBooking(planId, booking.id, { paid });
      announce(`«${booking.name}»: ${paid ? "pagado" : "pendiente de pago"}`);
    } catch {
      toast.error("No se ha podido actualizar el pago. Inténtalo de nuevo.");
    }
  }

  async function handleDelete() {
    try {
      await deleteBooking(planId, booking.id);
      toastWithUndo("Reserva eliminada", () => restoreBooking(planId, booking));
      announce(`Reserva «${booking.name}» eliminada`);
    } catch {
      toast.error("No se ha podido eliminar la reserva.");
    }
  }

  return (
    <li className={cn(HM_CARD, "flex flex-col overflow-hidden sm:flex-row")}>
      <div className="flex items-center gap-3 bg-lilac-mid px-4 py-3 text-ink-on-tint sm:w-32 sm:flex-col sm:justify-center sm:gap-1.5 sm:px-3 sm:py-5">
        <Icon aria-hidden="true" className="size-7 sm:size-8" strokeWidth={1.6} />
        <span className="text-sm font-semibold">{BOOKING_TYPE_LABEL[booking.type]}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 border-t border-dashed border-line-strong p-4 sm:border-l sm:border-t-0 sm:p-5">
        <h3 className="break-words font-display text-lg font-semibold leading-snug text-ink-strong">{booking.name}</h3>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDaysIcon aria-hidden="true" className="size-3.5" />
            {booking.date ? formatDate(booking.date) : "Sin fecha"}
          </span>
          {booking.confirmationCode && (
            <span className="inline-flex items-center gap-1.5">
              <TicketIcon aria-hidden="true" className="size-3.5" />
              <span>
                Código <span className="rounded-md bg-lilac-soft px-1.5 py-0.5 font-mono font-medium tracking-wider text-ink">{booking.confirmationCode}</span>
              </span>
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-dashed border-line-strong p-4 sm:w-60 sm:flex-col sm:items-stretch sm:justify-center sm:border-l sm:border-t-0 sm:p-5">
        <div className="sm:text-right">
          <p className="font-display text-2xl font-semibold leading-none text-ink">{formatCurrency(booking.price)}</p>
          <label
            className={cn(
              "mt-2 inline-flex min-h-8 cursor-pointer items-center gap-2.5 text-sm",
              booking.paid ? "font-medium text-ink" : "text-ink-muted"
            )}
          >
            <Checkbox
              checked={booking.paid}
              onCheckedChange={(v) => handlePaid(v === true)}
              aria-label={`Marcar «${booking.name}» como pagado`}
              className={CHECKBOX}
            />
            {booking.paid ? "Pagado" : "Pendiente"}
          </label>
        </div>
        <div className="-mr-2 flex sm:justify-end">
          <BookingFormDialog
            planId={planId}
            booking={booking}
            trigger={<EditBookingTrigger name={booking.name} />}
          />
          <DeleteIconButton ariaLabel={`Eliminar «${booking.name}»`} onDelete={handleDelete} />
        </div>
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
  const t = computeBookingTotals(budget, bookings);
  return (
    <section aria-labelledby="hm-reservas-title" className="flex flex-col gap-4">
      <SectionHeader
        id="hm-reservas-title"
        icon={<WalletIcon />}
        title="Reservas y presupuesto"
        description="Vuelos, hoteles y excursiones, con lo que llevas pagado."
        actions={
          <>
            <BudgetDialog planId={planId} budgetTotal={budget} />
            {bookings.length > 0 && <BookingFormDialog planId={planId} />}
          </>
        }
      />

      <BudgetCard budget={budget} bookings={bookings} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatTile
          icon={<ReceiptIcon />}
          tone="lilac"
          label="Reservado"
          value={formatCurrency(t.booked)}
          detail={`${t.count} ${t.count === 1 ? "reserva" : "reservas"} en total`}
        />
        <StatTile
          icon={<BadgeCheckIcon />}
          tone="sage"
          label="Pagado"
          value={formatCurrency(t.paid)}
          detail={`${t.paidCount} de ${t.count} ${t.count === 1 ? "reserva" : "reservas"}`}
        />
        <StatTile
          icon={<HourglassIcon />}
          tone="lilac"
          label="Por pagar"
          value={formatCurrency(t.toPay)}
          detail="reservado y todavía pendiente"
        />
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          scene="selva"
          title="Aún no hay reservas"
          action={
            <BookingFormDialog
              planId={planId}
              trigger={
                <button type="button" className={CTA_PRIMARY}>
                  Añadir la primera reserva
                </button>
              }
            />
          }
        >
          Apunta aquí los vuelos, el hotel, las excursiones o el seguro con su precio y su código de
          confirmación, y marca lo que ya está pagado.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Reservas">
          {bookings.map((booking) => (
            <BookingTicket key={booking.id} planId={planId} booking={booking} announce={announce} />
          ))}
        </ul>
      )}
    </section>
  );
}
