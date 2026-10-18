"use client";

import * as React from "react";
import { CalendarIcon, ClockIcon, MapPinIcon, PlusIcon, SunIcon, Trash2Icon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CTA_SECONDARY } from "@/components/dashboard/ui";
import { CHECKBOX, DeleteIconButton, EditIconButton, FIELD, ICON_BUTTON } from "@/components/guests/brand-dialog";
import { addItem, deleteItem, markInBudget, restoreItem, saveRoutine, updateItem } from "@/components/look/look-firebase";
import {
  BEAUTY_SERVICES,
  ROUTINE_SUGGESTIONS,
  isBeautyService,
  type BeautyInput,
  type BeautyItem,
  type BeautyService,
  type RoutineItem,
} from "@/components/look/look-model";
import {
  AddButton,
  BudgetLink,
  EmptyState,
  Field,
  FormFooter,
  LK_CARD,
  LK_FOCUS,
  LK_NATIVE_SELECT,
  LookDialog,
  SectionHeader,
  StatusBadge,
  StatusSelect,
  VendorChip,
  VendorSelect,
  parsePrice,
  priceText,
} from "@/components/look/ui";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "@/components/ui/time-picker";
import { formatDateValue, formatMoney } from "@/lib/i18n/format";
import { useLanguage } from "@/lib/i18n/provider";
import type { Vendor } from "@/lib/types";
import { toastWithUndo } from "@/lib/undo-toast";
import { cn } from "@/lib/utils";

const TEXTAREA =
  "min-h-20 rounded-xl border-line-strong bg-field text-base text-ink-strong shadow-none placeholder:text-ink-placeholder focus-visible:ring-lilac focus-visible:ring-offset-0 sm:text-sm";
const PICKER =
  "h-11 rounded-xl border-line-strong bg-field text-base text-ink-strong shadow-none focus-visible:ring-lilac focus-visible:ring-offset-0 sm:text-sm";

/** «Belleza»: peluquería y maquillaje (pruebas, horario del día B) y rutina previa opcional. */
export function BeautySection({
  planId,
  items,
  routine,
  vendors,
}: {
  planId: string;
  items: BeautyItem[];
  routine: RoutineItem[];
  vendors: Vendor[];
}) {
  const { t } = useTranslation("look");
  const [dialog, setDialog] = React.useState<{ item?: BeautyItem; service: BeautyService } | null>(null);
  const [shown, setShown] = React.useState<{ item?: BeautyItem; service: BeautyService }>({ service: "hair" });

  function openDialog(next: { item?: BeautyItem; service: BeautyService }) {
    setShown(next);
    setDialog(next);
  }

  async function handleDelete(item: BeautyItem) {
    try {
      await deleteItem(planId, "beauty", item.id);
      toastWithUndo(t("beauty.deleted"), () => restoreItem(planId, "beauty", item));
    } catch {
      toast.error(t("beauty.deleteError"));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title={t("beauty.title")}
        description={t("beauty.description")}
        action={<AddButton primary label={t("beauty.add")} onClick={() => openDialog({ service: "hair" })} />}
      />

      {items.length === 0 ? (
        <EmptyState
          title={t("beauty.empty.title")}
          text={t("beauty.empty.text")}
          action={
            <div className="flex flex-wrap gap-2">
              {(["hair", "makeup"] as const).map((s) => (
                <button key={s} type="button" onClick={() => openDialog({ service: s })} className={cn(CTA_SECONDARY, "h-11")}>
                  {t(`beauty.services.${s}`)}
                </button>
              ))}
            </div>
          }
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <BeautyCard
              key={item.id}
              planId={planId}
              item={item}
              vendors={vendors}
              onEdit={() => openDialog({ item, service: item.service })}
              onDelete={() => handleDelete(item)}
            />
          ))}
        </ul>
      )}

      <Routine planId={planId} routine={routine} />

      <LookDialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        title={shown.item ? t("beauty.form.editTitle") : t("beauty.form.newTitle")}
      >
        {(close) => <BeautyForm planId={planId} item={shown.item} defaultService={shown.service} vendors={vendors} onDone={close} />}
      </LookDialog>
    </div>
  );
}

function BeautyCard({
  planId,
  item,
  vendors,
  onEdit,
  onDelete,
}: {
  planId: string;
  item: BeautyItem;
  vendors: Vendor[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation("look");
  const { lang } = useLanguage();
  const service = t(`beauty.services.${item.service}`);
  const name = item.forWho ? `${service} · ${item.forWho}` : service;
  const trialDate = item.trialDate ? formatDateValue(item.trialDate, lang, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : null;
  const hasTrial = Boolean(trialDate || item.trialTime || item.trialPlace);

  return (
    <li className={cn(LK_CARD, "flex flex-col gap-3 p-4 sm:p-5")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{service}</p>
          <h4 className="mt-0.5 break-words font-display text-lg font-semibold leading-snug text-ink">
            {item.forWho || t("beauty.card.noOne")}
          </h4>
        </div>
        <div className="flex shrink-0 items-center">
          <EditIconButton label={t("beauty.card.edit", { name })} onClick={onEdit} />
          <DeleteIconButton ariaLabel={t("beauty.card.delete", { name })} onDelete={onDelete} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={item.status} />
        {item.price !== null && <span className="text-sm font-medium tabular-nums text-ink">{formatMoney(item.price, lang)}</span>}
      </div>

      {item.provider && (
        <p className="text-sm text-ink-strong">
          <span className="text-ink-muted">{t("beauty.card.provider")}</span> {item.provider}
        </p>
      )}
      <VendorChip planId={planId} vendorId={item.vendorId} savedName={item.vendorName} vendors={vendors} />

      {(hasTrial || item.dayTime) && (
        <dl className="flex flex-col gap-1.5 rounded-xl bg-lilac-soft p-3 text-sm text-ink-strong ring-1 ring-lilac-edge">
          {hasTrial && (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <dt className="font-medium text-ink">{t("beauty.card.trial")}</dt>
              <dd className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {trialDate && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarIcon aria-hidden="true" className="size-3.5" />
                    {trialDate}
                  </span>
                )}
                {item.trialTime && (
                  <span className="inline-flex items-center gap-1">
                    <ClockIcon aria-hidden="true" className="size-3.5" />
                    {item.trialTime}
                  </span>
                )}
                {item.trialPlace && (
                  <span className="inline-flex items-center gap-1 [overflow-wrap:anywhere]">
                    <MapPinIcon aria-hidden="true" className="size-3.5 shrink-0" />
                    {item.trialPlace}
                  </span>
                )}
              </dd>
            </div>
          )}
          {item.dayTime && (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <dt className="font-medium text-ink">{t("beauty.card.dayTime")}</dt>
              <dd className="inline-flex items-center gap-1">
                <SunIcon aria-hidden="true" className="size-3.5" />
                {item.dayTime}
              </dd>
            </div>
          )}
        </dl>
      )}

      {item.notes && <p className="break-words text-sm text-ink-muted">{item.notes}</p>}

      <BudgetLink
        planId={planId}
        price={item.price}
        category="Belleza"
        concept={t("budget.concept.beauty", { name })}
        inBudget={item.inBudget}
        onMarked={() => markInBudget(planId, "beauty", item.id)}
      />
    </li>
  );
}

function BeautyForm({
  planId,
  item,
  defaultService,
  vendors,
  onDone,
}: {
  planId: string;
  item?: BeautyItem;
  defaultService: BeautyService;
  vendors: Vendor[];
  onDone: () => void;
}) {
  const { t } = useTranslation("look");
  const { lang } = useLanguage();
  const uid = React.useId();
  const [service, setService] = React.useState<BeautyService>(item?.service ?? defaultService);
  const [forWho, setForWho] = React.useState(item?.forWho ?? "");
  const [provider, setProvider] = React.useState(item?.provider ?? "");
  const [vendorId, setVendorId] = React.useState(item?.vendorId ?? "");
  const [vendorName, setVendorName] = React.useState(item?.vendorName ?? "");
  const [trialDate, setTrialDate] = React.useState(item?.trialDate ?? "");
  const [trialTime, setTrialTime] = React.useState(item?.trialTime ?? "");
  const [trialPlace, setTrialPlace] = React.useState(item?.trialPlace ?? "");
  const [dayTime, setDayTime] = React.useState(item?.dayTime ?? "");
  const [price, setPrice] = React.useState(priceText(item?.price ?? null));
  const [status, setStatus] = React.useState(item?.status ?? "searching");
  const [notes, setNotes] = React.useState(item?.notes ?? "");
  const [priceError, setPriceError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const id = (name: string) => `${uid}-${name}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parsePrice(price, lang);
    if (parsed === undefined) {
      setPriceError(t("form.errors.price"));
      document.getElementById(id("price"))?.focus();
      return;
    }
    setPriceError(null);
    const input: BeautyInput = {
      service,
      forWho: forWho.trim(),
      provider: provider.trim(),
      vendorId,
      vendorName: vendorId ? vendorName : "",
      trialDate,
      trialTime,
      trialPlace: trialPlace.trim(),
      dayTime,
      price: parsed,
      status,
      notes: notes.trim(),
      inBudget: item?.inBudget ?? false,
    };
    setSubmitting(true);
    try {
      if (item) await updateItem(planId, "beauty", item.id, input);
      else await addItem(planId, "beauty", input);
      toast.success(item ? t("beauty.updated") : t("beauty.added"));
      onDone();
    } catch {
      toast.error(t("beauty.saveError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mt-5 flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id={id("service")} label={t("beauty.form.service")}>
            <select
              id={id("service")}
              value={service}
              onChange={(e) => isBeautyService(e.target.value) && setService(e.target.value)}
              className={LK_NATIVE_SELECT}
            >
              {BEAUTY_SERVICES.map((s) => (
                <option key={s} value={s}>
                  {t(`beauty.services.${s}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field id={id("who")} label={t("beauty.form.forWho")} optional>
            <Input
              id={id("who")}
              value={forWho}
              onChange={(e) => setForWho(e.target.value)}
              placeholder={t("beauty.form.forWhoPlaceholder")}
              maxLength={120}
              autoComplete="off"
              className={FIELD}
            />
          </Field>
        </div>
        <Field id={id("provider")} label={t("beauty.form.provider")} optional>
          <Input
            id={id("provider")}
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder={t("beauty.form.providerPlaceholder")}
            maxLength={120}
            autoComplete="off"
            className={FIELD}
          />
        </Field>
        <VendorSelect
          id={id("vendor")}
          vendorId={vendorId}
          savedName={vendorName}
          vendors={vendors}
          onChange={(vid, name) => {
            setVendorId(vid);
            setVendorName(name);
            if (vid && !provider.trim()) setProvider(name);
          }}
        />

        <fieldset className="flex flex-col gap-4 rounded-xl border border-line p-4">
          <legend className="px-1 text-sm font-medium text-ink">{t("beauty.form.trialLegend")}</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id={id("trialDate")} label={t("beauty.form.trialDate")} optional>
              <DatePicker id={id("trialDate")} value={trialDate} onChange={setTrialDate} className={PICKER} />
            </Field>
            <Field id={id("trialTime")} label={t("beauty.form.trialTime")} optional>
              <TimePicker id={id("trialTime")} value={trialTime} onChange={setTrialTime} className={FIELD} />
            </Field>
          </div>
          <Field id={id("trialPlace")} label={t("beauty.form.trialPlace")} optional>
            <Input
              id={id("trialPlace")}
              value={trialPlace}
              onChange={(e) => setTrialPlace(e.target.value)}
              placeholder={t("beauty.form.trialPlacePlaceholder")}
              maxLength={160}
              autoComplete="off"
              className={FIELD}
            />
          </Field>
        </fieldset>

        <Field id={id("dayTime")} label={t("beauty.form.dayTime")} optional hint={t("beauty.form.dayTimeHint")}>
          <TimePicker id={id("dayTime")} value={dayTime} onChange={setDayTime} className={cn(FIELD, "sm:max-w-48")} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id={id("price")} label={t("form.price")} optional error={priceError}>
            <Input
              id={id("price")}
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setPriceError(null);
              }}
              inputMode="decimal"
              placeholder={t("form.pricePlaceholder")}
              aria-invalid={priceError ? true : undefined}
              aria-describedby={priceError ? `${id("price")}-error` : undefined}
              autoComplete="off"
              className={FIELD}
            />
          </Field>
          <Field id={id("status")} label={t("form.status")}>
            <StatusSelect id={id("status")} value={status} onChange={setStatus} />
          </Field>
        </div>
        <Field id={id("notes")} label={t("form.notes")} optional>
          <Textarea id={id("notes")} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={600} className={TEXTAREA} />
        </Field>
      </div>
      <FormFooter submitting={submitting} onCancel={onDone} />
    </form>
  );
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Rutina previa opcional: una checklist sencilla guardada en los ajustes de Estilo. */
function Routine({ planId, routine }: { planId: string; routine: RoutineItem[] }) {
  const { t } = useTranslation("look");
  const [text, setText] = React.useState("");
  const inputId = React.useId();

  async function persist(next: RoutineItem[]) {
    try {
      await saveRoutine(planId, next);
    } catch {
      toast.error(t("beauty.routine.saveError"));
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const label = text.trim();
    if (!label) return;
    setText("");
    await persist([...routine, { id: newId(), label, done: false }]);
  }

  const done = routine.filter((r) => r.done).length;

  return (
    <section aria-labelledby="lk-routine-title" className={cn(LK_CARD, "flex flex-col gap-3 p-4 sm:p-5")}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 max-w-xl">
          <h4 id="lk-routine-title" className="font-display text-lg font-semibold text-ink sm:text-xl">
            {t("beauty.routine.title")}
            {routine.length > 0 && (
              <span className="ml-2 text-sm font-normal tabular-nums text-ink-muted">
                {t("beauty.routine.progress", { done, total: routine.length })}
              </span>
            )}
          </h4>
          <p className="mt-1 text-sm text-ink-muted">{t("beauty.routine.description")}</p>
        </div>
        {routine.length === 0 && (
          <button
            type="button"
            onClick={() =>
              persist(
                ROUTINE_SUGGESTIONS.map((key) => ({
                  id: newId(),
                  label: t(`beauty.routine.suggestions.${key}`),
                  done: false,
                }))
              )
            }
            className={cn(CTA_SECONDARY, "h-11")}
          >
            <PlusIcon aria-hidden="true" className="size-4" />
            {t("beauty.routine.addSuggestions")}
          </button>
        )}
      </div>

      {routine.length > 0 && (
        <ul className="flex flex-col">
          {routine.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2">
              <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 text-sm text-ink-strong">
                <Checkbox
                  checked={r.done}
                  onCheckedChange={(v) => persist(routine.map((x) => (x.id === r.id ? { ...x, done: Boolean(v) } : x)))}
                  className={CHECKBOX}
                />
                <span className={cn("[overflow-wrap:anywhere]", r.done && "text-ink-muted line-through decoration-1")}>{r.label}</span>
              </label>
              <button
                type="button"
                aria-label={t("beauty.routine.remove", { label: r.label })}
                title={t("beauty.routine.remove", { label: r.label })}
                onClick={() => persist(routine.filter((x) => x.id !== r.id))}
                className={cn(ICON_BUTTON, LK_FOCUS)}
              >
                <Trash2Icon aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2">
        <label htmlFor={inputId} className="sr-only">
          {t("beauty.routine.newLabel")}
        </label>
        <Input
          id={inputId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("beauty.routine.newPlaceholder")}
          maxLength={120}
          autoComplete="off"
          className={cn(FIELD, "min-w-0 flex-1 basis-56")}
        />
        <button type="submit" disabled={!text.trim()} className={cn(CTA_SECONDARY, "h-11 disabled:opacity-60")}>
          <PlusIcon aria-hidden="true" className="size-4" />
          {t("beauty.routine.add")}
        </button>
      </form>
    </section>
  );
}
