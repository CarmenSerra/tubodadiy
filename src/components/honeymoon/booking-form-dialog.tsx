"use client";

import * as React from "react";
import { Loader2, PencilIcon, PlusIcon } from "lucide-react";
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
import { BOOKING_TYPES, BOOKING_TYPE_LABEL, isBookingType, type Booking, type BookingType } from "@/lib/honeymoon-model";
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
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button type="button" className={CTA_PRIMARY}>
            <PlusIcon aria-hidden="true" className="size-4" />
            Añadir reserva
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
      amount = parseAmount(price);
      if (Number.isNaN(amount) || amount < 0) {
        setPriceError("Escribe un importe válido, por ejemplo 450 o 1.250,50.");
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
        toast.success("Reserva actualizada");
      } else {
        await createBooking(planId, data);
        toast.success("Reserva añadida");
      }
      onDone();
    } catch {
      toast.error("No se ha podido guardar la reserva.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <DialogHeader>
        <DialogTitle className={DIALOG_TITLE}>{booking ? "Editar reserva" : "Nueva reserva"}</DialogTitle>
      </DialogHeader>
      <div className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={id("type")} className={FIELD_LABEL}>
            Tipo
          </Label>
          <Select value={type} onValueChange={(v) => isBookingType(v) && setType(v)}>
            <SelectTrigger id={id("type")} className={cn(SELECT_TRIGGER, "w-full")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={SELECT_CONTENT}>
              {BOOKING_TYPES.map((t) => (
                <SelectItem key={t} value={t} className={SELECT_ITEM}>
                  {BOOKING_TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={id("name")} className={FIELD_LABEL}>
            Nombre
          </Label>
          <Input
            id={id("name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Vuelo Madrid – Denpasar, Hotel Sunset…"
            required
            autoFocus
            autoComplete="off"
            className={FIELD}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={id("date")} className={FIELD_LABEL}>
              Fecha <span className="font-normal text-ink-muted">(opcional)</span>
            </Label>
            <DatePicker id={id("date")} value={date} onChange={setDate} className={FIELD} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={id("price")} className={FIELD_LABEL}>
              Precio (€)
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
            Código de confirmación <span className="font-normal text-ink-muted">(opcional)</span>
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
          Ya está pagado
        </label>
      </div>
      <DialogFooter className="mt-6 gap-2 sm:gap-3">
        <button type="button" onClick={onDone} className={cn(CTA_SECONDARY, "h-11")}>
          Cancelar
        </button>
        <button type="submit" disabled={submitting} className={cn(CTA_PRIMARY, "disabled:opacity-60")}>
          {submitting && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          Guardar
        </button>
      </DialogFooter>
    </form>
  );
}

/** Disparador de edición; recibe las props que le inyecta DialogTrigger. */
export function EditBookingTrigger({ name, ...props }: React.ComponentProps<"button"> & { name: string }) {
  return <EditIconButton label={`Editar «${name}»`} {...props} />;
}

// ---------- Presupuesto propio de la luna de miel ----------

export function BudgetDialog({ planId, budgetTotal }: { planId: string; budgetTotal: number }) {
  const [open, setOpen] = React.useState(false);
  const has = budgetTotal > 0;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className={has ? CTA_SECONDARY : CTA_PRIMARY}>
          <PencilIcon aria-hidden="true" className="size-4" />
          {has ? "Cambiar presupuesto" : "Fijar presupuesto"}
        </button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined} className={DIALOG_CONTENT}>
        {open && <BudgetForm planId={planId} budgetTotal={budgetTotal} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function BudgetForm({ planId, budgetTotal, onDone }: { planId: string; budgetTotal: number; onDone: () => void }) {
  const [value, setValue] = React.useState(budgetTotal > 0 ? String(budgetTotal) : "");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const uid = React.useId();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = value.trim() ? parseAmount(value) : 0;
    if (Number.isNaN(amount) || amount < 0) {
      setError("Escribe un importe válido, por ejemplo 4000.");
      document.getElementById(`${uid}-budget`)?.focus();
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await setHoneymoonBudget(planId, amount);
      toast.success("Presupuesto de la luna de miel guardado");
      onDone();
    } catch {
      toast.error("No se ha podido guardar el presupuesto.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <DialogHeader>
        <DialogTitle className={DIALOG_TITLE}>Presupuesto de la luna de miel</DialogTitle>
      </DialogHeader>
      <div className="mt-5 flex flex-col gap-2">
        <Label htmlFor={`${uid}-budget`} className={FIELD_LABEL}>
          Total disponible (€)
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
            Es independiente del presupuesto de la boda. Déjalo vacío para quitarlo.
          </p>
        )}
      </div>
      <DialogFooter className="mt-6 gap-2 sm:gap-3">
        <button type="button" onClick={onDone} className={cn(CTA_SECONDARY, "h-11")}>
          Cancelar
        </button>
        <button type="submit" disabled={submitting} className={cn(CTA_PRIMARY, "disabled:opacity-60")}>
          {submitting && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          Guardar
        </button>
      </DialogFooter>
    </form>
  );
}
