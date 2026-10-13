"use client";

import * as React from "react";
import { ArrowLeftIcon, Loader2, Trash2Icon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { isCategory } from "@/components/appointments/appointment-model";
import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import {
  CHECKBOX,
  DIALOG_CONTENT,
  DIALOG_TITLE,
  FIELD,
  FIELD_LABEL,
  ROW_FOCUS,
  SELECT_CONTENT,
  SELECT_ITEM,
  SELECT_TRIGGER,
} from "@/components/guests/brand-dialog";
import { categoryLabel } from "@/components/vendors/vendor-model";
import { useRestoreFocus } from "@/components/timeline/use-restore-focus";
import { ignoreToastInteraction } from "@/components/timeline/use-timeline-undo";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "@/components/ui/time-picker";
import {
  APPOINTMENT_CATEGORIES,
  createAppointment,
  deleteAppointment,
  updateAppointment,
  type Appointment,
  type AppointmentCategory,
  type AppointmentInput,
} from "@/lib/firebase/appointments";
import type { Vendor } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Lo que el formulario ha cambiado en Firestore; la agenda lo usa para ofrecer «Deshacer». */
export type AppointmentChange =
  | { type: "created"; id: string; title: string }
  | { type: "updated"; before: Appointment; title: string }
  | { type: "deleted"; item: Appointment };

const NO_VENDOR = "none";
const ERROR_TEXT = "text-sm font-medium text-ink";

interface AppointmentFormDialogProps {
  planId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Cita a editar; sin ella, se crea una nueva. */
  item?: Appointment;
  /** Tipo con el que arranca una cita nueva. */
  defaultCategory?: AppointmentCategory;
  vendors: Vendor[];
  onChange?: (change: AppointmentChange) => void;
}

export function AppointmentFormDialog({
  planId,
  open,
  onOpenChange,
  item,
  defaultCategory,
  vendors,
  onChange,
}: AppointmentFormDialogProps) {
  const restoreFocus = useRestoreFocus();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className={cn(DIALOG_CONTENT, "max-h-[calc(100dvh-1rem)]")}
        onOpenAutoFocus={restoreFocus.onOpenAutoFocus}
        onInteractOutside={ignoreToastInteraction}
        onCloseAutoFocus={restoreFocus.onCloseAutoFocus}
      >
        {open && (
          <AppointmentForm
            // Una instancia nueva por cita: el formulario siempre arranca con sus datos.
            key={item?.id ?? `new-${defaultCategory ?? ""}`}
            planId={planId}
            item={item}
            defaultCategory={defaultCategory}
            vendors={vendors}
            onDone={() => onOpenChange(false)}
            onChange={onChange}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface FormError {
  field: "title" | "date" | "time";
  text: string;
}

function AppointmentForm({
  planId,
  item,
  defaultCategory,
  vendors,
  onDone,
  onChange,
}: {
  planId: string;
  item?: Appointment;
  defaultCategory?: AppointmentCategory;
  vendors: Vendor[];
  onDone: () => void;
  onChange?: (change: AppointmentChange) => void;
}) {
  const { t } = useTranslation("tools");
  const isEdit = Boolean(item);
  const initialCategory = item?.category ?? defaultCategory ?? "otro";

  const [category, setCategory] = React.useState<AppointmentCategory>(initialCategory);
  // El título se sugiere según el tipo mientras no lo hayas escrito tú.
  const [title, setTitle] = React.useState(item?.title ?? t(`appointments.categories.${initialCategory}.suggestedTitle`));
  const [titleTouched, setTitleTouched] = React.useState(isEdit);
  const [date, setDate] = React.useState(item?.date ?? "");
  const [time, setTime] = React.useState(item?.time ?? "");
  const [place, setPlace] = React.useState(item?.place ?? "");
  const [vendorId, setVendorId] = React.useState(item?.vendorId ?? "");
  const [notes, setNotes] = React.useState(item?.notes ?? "");
  const [done, setDone] = React.useState(item?.done ?? false);
  const [error, setError] = React.useState<FormError | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const titleId = React.useId();
  const categoryId = React.useId();
  const dateId = React.useId();
  const timeId = React.useId();
  const placeId = React.useId();
  const vendorFieldId = React.useId();
  const notesId = React.useId();

  const selectedVendor = vendors.find((v) => v.id === vendorId);
  // Un proveedor ya borrado se sigue mostrando con el nombre que se guardó.
  const orphanVendor = vendorId && !selectedVendor ? item?.vendorName || t("appointments.form.deletedVendor") : null;

  function clearError(field: FormError["field"]) {
    setError((current) => (current?.field === field ? null : current));
  }

  function handleCategory(next: AppointmentCategory) {
    if (!titleTouched) setTitle(t(`appointments.categories.${next}.suggestedTitle`));
    setCategory(next);
  }

  function handleVendor(value: string) {
    const id = value === NO_VENDOR ? "" : value;
    setVendorId(id);
    // Si aún no hay lugar, se aprovecha la dirección guardada del proveedor.
    const vendor = vendors.find((v) => v.id === id);
    if (vendor?.location && !place.trim()) setPlace(vendor.location);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let problem: FormError | null = null;
    if (!title.trim()) problem = { field: "title", text: t("appointments.form.errors.title") };
    else if (!date) problem = { field: "date", text: t("appointments.form.errors.date") };
    else if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
      problem = { field: "time", text: t("appointments.form.errors.time") };
    if (problem) {
      setError(problem);
      document.getElementById({ title: titleId, date: dateId, time: timeId }[problem.field])?.focus();
      return;
    }
    setError(null);
    const data: AppointmentInput = {
      title: title.trim(),
      category,
      date,
      time,
      place: place.trim(),
      notes: notes.trim(),
      vendorId,
      vendorName: selectedVendor?.name ?? (vendorId ? (item?.vendorName ?? "") : ""),
      done,
    };
    setSubmitting(true);
    try {
      if (item) {
        await updateAppointment(planId, item.id, data);
        onChange?.({ type: "updated", before: item, title: data.title });
      } else {
        const id = await createAppointment(planId, data);
        onChange?.({ type: "created", id, title: data.title });
      }
      onDone();
    } catch {
      toast.error(t("appointments.form.errors.save"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!item) return;
    try {
      await deleteAppointment(planId, item.id);
      onChange?.({ type: "deleted", item });
      onDone();
    } catch {
      toast.error(t("appointments.errors.delete"));
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <DialogHeader>
        <button
          type="button"
          onClick={onDone}
          className={cn(
            "-ml-3 -mt-1 mb-1 inline-flex h-9 w-fit items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-lilac-soft hover:text-ink",
            ROW_FOCUS
          )}
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          {t("appointments.form.back")}
        </button>
        <DialogTitle className={DIALOG_TITLE}>{isEdit ? t("appointments.form.editTitle") : t("appointments.form.newTitle")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("appointments.form.description")}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={categoryId} className={FIELD_LABEL}>
            {t("appointments.form.type")}
          </Label>
          <Select value={category} onValueChange={(v) => isCategory(v) && handleCategory(v)}>
            <SelectTrigger id={categoryId} className={SELECT_TRIGGER}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={SELECT_CONTENT}>
              {APPOINTMENT_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c} className={SELECT_ITEM}>
                  {t(`appointments.categories.${c}.label`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={titleId} className={FIELD_LABEL}>
            {t("appointments.form.titleLabel")}
          </Label>
          <Input
            id={titleId}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setTitleTouched(true);
              clearError("title");
            }}
            placeholder={t("appointments.form.titlePlaceholder")}
            autoFocus={!isEdit}
            autoComplete="off"
            required
            aria-invalid={error?.field === "title" || undefined}
            aria-describedby={error?.field === "title" ? `${titleId}-error` : undefined}
            className={FIELD}
          />
          {error?.field === "title" && (
            <p id={`${titleId}-error`} role="alert" className={ERROR_TEXT}>
              {error.text}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={dateId} className={FIELD_LABEL}>
              {t("appointments.form.day")}
            </Label>
            <DatePicker
              id={dateId}
              value={date}
              onChange={(v) => {
                setDate(v);
                clearError("date");
              }}
              aria-describedby={error?.field === "date" ? `${dateId}-error` : undefined}
              className="h-11 rounded-xl border-line-strong bg-field text-base text-ink-strong shadow-none focus-visible:ring-lilac focus-visible:ring-offset-0 sm:text-sm"
            />
            {error?.field === "date" && (
              <p id={`${dateId}-error`} role="alert" className={ERROR_TEXT}>
                {error.text}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={timeId} className={FIELD_LABEL}>
              {t("appointments.form.time")} <span className="font-normal text-ink-muted">{t("appointments.form.optional")}</span>
            </Label>
            <TimePicker
              id={timeId}
              value={time}
              onChange={(v) => {
                setTime(v);
                clearError("time");
              }}
              aria-invalid={error?.field === "time" || undefined}
              aria-describedby={error?.field === "time" ? `${timeId}-error` : undefined}
              className={FIELD}
            />
            {error?.field === "time" && (
              <p id={`${timeId}-error`} role="alert" className={ERROR_TEXT}>
                {error.text}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={placeId} className={FIELD_LABEL}>
            {t("appointments.form.place")}
          </Label>
          <Input
            id={placeId}
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder={t("appointments.form.placePlaceholder")}
            autoComplete="off"
            className={FIELD}
          />
        </div>

        {(vendors.length > 0 || vendorId) && (
          <div className="flex flex-col gap-2">
            <Label htmlFor={vendorFieldId} className={FIELD_LABEL}>
              {t("appointments.form.vendor")} <span className="font-normal text-ink-muted">{t("appointments.form.optional")}</span>
            </Label>
            <Select value={vendorId || NO_VENDOR} onValueChange={handleVendor}>
              <SelectTrigger id={vendorFieldId} className={SELECT_TRIGGER}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={SELECT_CONTENT}>
                <SelectItem value={NO_VENDOR} className={SELECT_ITEM}>
                  {t("appointments.form.noVendor")}
                </SelectItem>
                {orphanVendor && (
                  <SelectItem value={vendorId} className={SELECT_ITEM}>
                    {orphanVendor}
                  </SelectItem>
                )}
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id} className={SELECT_ITEM}>
                    {v.name || t("appointments.form.unnamedVendor")}
                    {v.category ? ` · ${categoryLabel(v.category, t)}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor={notesId} className={FIELD_LABEL}>
            {t("appointments.form.notes")}
          </Label>
          <Textarea
            id={notesId}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("appointments.form.notesPlaceholder")}
            rows={3}
            className="min-h-20 rounded-xl border-line-strong bg-field text-base text-ink-strong shadow-none placeholder:text-ink-placeholder focus-visible:ring-lilac focus-visible:ring-offset-0 sm:text-sm"
          />
        </div>

        <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-ink-strong">
          <Checkbox
            checked={done}
            onCheckedChange={(v) => setDone(Boolean(v))}
            className={CHECKBOX}
          />
          {t("appointments.form.done")}
        </label>
      </div>

      <DialogFooter className="mt-6 gap-2 sm:items-center sm:gap-3">
        {item && (
          // Sin confirmación previa: borrar se puede deshacer desde el aviso.
          <button
            type="button"
            onClick={handleDelete}
            className={cn(
              "inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium text-ink-muted transition-colors hover:bg-lilac-soft hover:text-ink sm:mr-auto",
              ROW_FOCUS
            )}
          >
            <Trash2Icon aria-hidden="true" className="size-4" />
            {t("appointments.form.delete")}
          </button>
        )}
        <button type="button" onClick={onDone} className={cn(CTA_SECONDARY, "h-11")}>
          {t("appointments.form.cancel")}
        </button>
        <button type="submit" disabled={submitting} className={cn(CTA_PRIMARY, "disabled:opacity-60")}>
          {submitting && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          {t("appointments.form.save")}
        </button>
      </DialogFooter>
    </form>
  );
}
