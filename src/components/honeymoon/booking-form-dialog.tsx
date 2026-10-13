"use client";

import * as React from "react";
import { Loader2, PencilIcon, PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import {
  CHECKBOX,
  DIALOG_CONTENT,
  DIALOG_TITLE,
  EditIconButton,
  FIELD,
  FIELD_LABEL,
  SELECT_CONTENT,
  SELECT_ITEM,
  SELECT_TRIGGER,
} from "@/components/guests/brand-dialog";
import { FieldError } from "@/components/honeymoon/destination-form-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createBooking, setHoneymoonBudget, updateBooking } from "@/lib/firebase/honeymoon";
import { BOOKING_TYPES, BOOKING_TYPE_KEY, isBookingType, type Booking, type BookingType } from "@/lib/honeymoon-model";
import { useLanguage } from "@/lib/i18n/provider";
import { cn, parseAmount } from "@/lib/utils";

export function BookingFormDialog({
  planId,
  booking,
  trigger,
}: {
  planId: string;
  booking?: Booking;
  trigger?: React.ReactNode;
}) {
  const { t } = useTranslation("honeymoon");
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button type="button" className={CTA_PRIMARY}>
            <PlusIcon aria-hidden="true" className="size-4" />
            {t("bookings.form.add")}
          </button>
        )}
      </DialogTrigger>
      <DialogContent aria-describedby={undefined} className={DIALOG_CONTENT}>
        {open && <BookingForm planId={planId} booking={booking} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function BookingForm({ planId, booking, onDone }: { planId: string; booking?: Booking; onDone: () => void }) {
  const { t } = useTranslation("honeymoon");
  const { lang } = useLanguage();
  const [type, setType] = React.useState<BookingType>(booking?.type ?? "vuelo");
  const [name, setName] = React.useState(booking?.name ?? "");
  const [date, setDate] = React.useState(booking?.date ?? "");
  const [price, setPrice] = React.useState(booking ? String(booking.price) : "");
  const [code, setCode] = React.useState(booking?.confirmationCode ?? "");
  const [paid, setPaid] = React.useState(booking?.paid ?? false);
  const [priceError, setPriceError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const uid = React.useId();
  const id = (field: string) => `${uid}-${field}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    let amount = 0;
    if (price.trim()) {
      amount = parseAmount(price, lang);
      if (Number.isNaN(amount) || amount < 0) {
        setPriceError(t("bookings.form.errors.price"));
        document.getElementById(id("price"))?.focus();
        return;
      }
    }
    setPriceError(null);
    setSubmitting(true);
    try {
      const data = {
        type,
        name: name.trim(),
        date,
        price: amount,
        confirmationCode: code.trim(),
        paid,
      };
      if (booking) {
        await updateBooking(planId, booking.id, data);
        toast.success(t("bookings.form.toasts.updated"));
      } else {
        await createBooking(planId, data);
        toast.success(t("bookings.form.toasts.added"));
      }
      onDone();
    } catch {
      toast.error(t("bookings.form.toasts.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <DialogHeader>
        <DialogTitle className={DIALOG_TITLE}>{booking ? t("bookings.form.editTitle") : t("bookings.form.newTitle")}</DialogTitle>
      </DialogHeader>
      <div className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={id("type")} className={FIELD_LABEL}>
            {t("bookings.form.type")}
          </Label>
          <Select value={type} onValueChange={(v) => isBookingType(v) && setType(v)}>
            <SelectTrigger id={id("type")} className={cn(SELECT_TRIGGER, "w-full")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={SELECT_CONTENT}>
              {BOOKING_TYPES.map((type) => (
                <SelectItem key={type} value={type} className={SELECT_ITEM}>
                  {t(`bookingTypes.${BOOKING_TYPE_KEY[type]}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={id("name")} className={FIELD_LABEL}>
            {t("bookings.form.name")}
          </Label>
          <Input
            id={id("name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("bookings.form.namePlaceholder")}
            required
            autoFocus
            autoComplete="off"
            className={FIELD}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={id("date")} className={FIELD_LABEL}>
              {t("bookings.form.date")} <span className="font-normal text-ink-muted">{t("bookings.form.optional")}</span>
            </Label>
            <DatePicker id={id("date")} value={date} onChange={setDate} className={FIELD} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={id("price")} className={FIELD_LABEL}>
              {t("bookings.form.price")}
            </Label>
            <Input
              id={id("price")}
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              aria-invalid={Boolean(priceError)}
              aria-describedby={priceError ? id("price-error") : undefined}
              className={FIELD}
            />
            {priceError && <FieldError id={id("price-error")}>{priceError}</FieldError>}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={id("code")} className={FIELD_LABEL}>
            {t("bookings.form.code")} <span className="font-normal text-ink-muted">{t("bookings.form.optional")}</span>
          </Label>
          <Input
            id={id("code")}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ABC123"
            autoComplete="off"
            spellCheck={false}
            className={cn(FIELD, "font-mono uppercase placeholder:normal-case")}
          />
        </div>
        <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-ink-strong">
          <Checkbox checked={paid} onCheckedChange={(v) => setPaid(v === true)} className={CHECKBOX} />
          {t("bookings.form.alreadyPaid")}
        </label>
      </div>
      <DialogFooter className="mt-6 gap-2 sm:gap-3">
        <button type="button" onClick={onDone} className={cn(CTA_SECONDARY, "h-11")}>
          {t("actions.cancel")}
        </button>
        <button type="submit" disabled={submitting} className={cn(CTA_PRIMARY, "disabled:opacity-60")}>
          {submitting && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          {t("actions.save")}
        </button>
      </DialogFooter>
    </form>
  );
}

/** Disparador de edición; recibe las props que le inyecta DialogTrigger. */
export function EditBookingTrigger({ name, ...props }: React.ComponentProps<"button"> & { name: string }) {
  const { t } = useTranslation("honeymoon");
  return <EditIconButton label={t("bookings.editAria", { name })} {...props} />;
}

// ---------- Presupuesto propio de la luna de miel ----------

export function BudgetDialog({ planId, budgetTotal }: { planId: string; budgetTotal: number }) {
  const { t } = useTranslation("honeymoon");
  const [open, setOpen] = React.useState(false);
  const has = budgetTotal > 0;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className={has ? CTA_SECONDARY : CTA_PRIMARY}>
          <PencilIcon aria-hidden="true" className="size-4" />
          {has ? t("bookings.budgetDialog.change") : t("bookings.budgetDialog.set")}
        </button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined} className={DIALOG_CONTENT}>
        {open && <BudgetForm planId={planId} budgetTotal={budgetTotal} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function BudgetForm({ planId, budgetTotal, onDone }: { planId: string; budgetTotal: number; onDone: () => void }) {
  const { t } = useTranslation("honeymoon");
  const { lang } = useLanguage();
  const [value, setValue] = React.useState(budgetTotal > 0 ? String(budgetTotal) : "");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const uid = React.useId();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = value.trim() ? parseAmount(value, lang) : 0;
    if (Number.isNaN(amount) || amount < 0) {
      setError(t("bookings.budgetDialog.error"));
      document.getElementById(`${uid}-budget`)?.focus();
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await setHoneymoonBudget(planId, amount);
      toast.success(t("bookings.budgetDialog.saved"));
      onDone();
    } catch {
      toast.error(t("bookings.budgetDialog.saveError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <DialogHeader>
        <DialogTitle className={DIALOG_TITLE}>{t("bookings.budgetDialog.title")}</DialogTitle>
      </DialogHeader>
      <div className="mt-5 flex flex-col gap-2">
        <Label htmlFor={`${uid}-budget`} className={FIELD_LABEL}>
          {t("bookings.budgetDialog.total")}
        </Label>
        <Input
          id={`${uid}-budget`}
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="4000"
          autoFocus
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${uid}-error` : `${uid}-help`}
          className={FIELD}
        />
        {error ? (
          <FieldError id={`${uid}-error`}>{error}</FieldError>
        ) : (
          <p id={`${uid}-help`} className="text-sm text-ink-muted">
            {t("bookings.budgetDialog.help")}
          </p>
        )}
      </div>
      <DialogFooter className="mt-6 gap-2 sm:gap-3">
        <button type="button" onClick={onDone} className={cn(CTA_SECONDARY, "h-11")}>
          {t("actions.cancel")}
        </button>
        <button type="submit" disabled={submitting} className={cn(CTA_PRIMARY, "disabled:opacity-60")}>
          {submitting && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          {t("actions.save")}
        </button>
      </DialogFooter>
    </form>
  );
}
