"use client";

import * as React from "react";
import { CalendarPlusIcon, ClockIcon, MapPinIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { formatShortDate, todayKey } from "@/components/appointments/appointment-model";
import { useAppointmentsLauncher } from "@/components/appointments/appointments-launcher";
import { CTA_SECONDARY } from "@/components/dashboard/ui";
import { DeleteIconButton, EditIconButton, FIELD } from "@/components/guests/brand-dialog";
import { addItem, deleteItem, markInBudget, restoreItem, updateItem } from "@/components/look/look-firebase";
import { PEOPLE, isPersonId, type Outfit, type OutfitInput, type PersonId } from "@/components/look/look-model";
import {
  AddButton,
  BudgetLink,
  EmptyState,
  Field,
  FormFooter,
  LK_CARD,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Appointment } from "@/lib/firebase/appointments";
import { useLanguage } from "@/lib/i18n/provider";
import { formatMoney } from "@/lib/i18n/format";
import type { Vendor } from "@/lib/types";
import { toastWithUndo } from "@/lib/undo-toast";
import { cn } from "@/lib/utils";

interface DialogState {
  outfit?: Outfit;
  who: PersonId;
}

const TEXTAREA =
  "min-h-20 rounded-xl border-line-strong bg-field text-base text-ink-strong shadow-none placeholder:text-ink-placeholder focus-visible:ring-lilac focus-visible:ring-offset-0 sm:text-sm";

/** «Vestuario»: un look por persona (pareja, damas, padrinos, niños…) y las pruebas de la agenda. */
export function OutfitSection({
  planId,
  outfits,
  fittings,
  vendors,
}: {
  planId: string;
  outfits: Outfit[];
  fittings: Appointment[];
  vendors: Vendor[];
}) {
  const { t } = useTranslation("look");
  const [dialog, setDialog] = React.useState<DialogState | null>(null);
  // Se recuerda el último estado para que el diálogo no cambie de contenido mientras se cierra.
  const [shown, setShown] = React.useState<DialogState>({ who: "partnerA" });

  function openDialog(next: DialogState) {
    setShown(next);
    setDialog(next);
  }

  async function handleDelete(outfit: Outfit) {
    try {
      await deleteItem(planId, "looks", outfit.id);
      toastWithUndo(t("outfit.deleted"), () => restoreItem(planId, "looks", outfit));
    } catch {
      toast.error(t("outfit.deleteError"));
    }
  }

  const missingPartners = (["partnerA", "partnerB"] as const).filter((p) => !outfits.some((o) => o.who === p));

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title={t("outfit.title")}
        description={t("outfit.description")}
        action={<AddButton primary label={t("outfit.add")} onClick={() => openDialog({ who: missingPartners[0] ?? "bridesmaid" })} />}
      />

      {outfits.length === 0 ? (
        <EmptyState
          title={t("outfit.empty.title")}
          text={t("outfit.empty.text")}
          action={
            <div className="flex flex-wrap gap-2">
              {(["partnerA", "partnerB"] as const).map((p) => (
                <button key={p} type="button" onClick={() => openDialog({ who: p })} className={cn(CTA_SECONDARY, "h-11")}>
                  {t(`people.${p}`)}
                </button>
              ))}
            </div>
          }
        />
      ) : (
        <ul className="grid items-start gap-4 md:grid-cols-2">
          {outfits.map((outfit) => (
            <OutfitCard
              key={outfit.id}
              planId={planId}
              outfit={outfit}
              vendors={vendors}
              onEdit={() => openDialog({ outfit, who: outfit.who })}
              onDelete={() => handleDelete(outfit)}
            />
          ))}
        </ul>
      )}

      <FittingsPanel fittings={fittings} />

      <LookDialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        title={shown.outfit ? t("outfit.form.editTitle") : t("outfit.form.newTitle")}
      >
        {(close) => <OutfitForm planId={planId} outfit={shown.outfit} defaultWho={shown.who} vendors={vendors} onDone={close} />}
      </LookDialog>
    </div>
  );
}

function OutfitCard({
  planId,
  outfit,
  vendors,
  onEdit,
  onDelete,
}: {
  planId: string;
  outfit: Outfit;
  vendors: Vendor[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation("look");
  const { lang } = useLanguage();
  const label = t(`people.${outfit.who}`);
  const name = outfit.personName || label;
  const title = outfit.outfit || t("outfit.card.noOutfit");

  return (
    <li className={cn(LK_CARD, "flex flex-col gap-3 p-4 sm:p-5")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            {outfit.personName ? `${label} · ${outfit.personName}` : label}
          </p>
          <h4 className="mt-0.5 break-words font-display text-lg font-semibold leading-snug text-ink">{title}</h4>
        </div>
        <div className="flex shrink-0 items-center">
          <EditIconButton label={t("outfit.card.edit", { name })} onClick={onEdit} />
          <DeleteIconButton ariaLabel={t("outfit.card.delete", { name })} onDelete={onDelete} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={outfit.status} />
        {outfit.price !== null && (
          <span className="text-sm font-medium tabular-nums text-ink">{formatMoney(outfit.price, lang)}</span>
        )}
      </div>

      {outfit.shop && (
        <p className="text-sm text-ink-strong">
          <span className="text-ink-muted">{t("outfit.card.shop")}</span> {outfit.shop}
        </p>
      )}
      <VendorChip planId={planId} vendorId={outfit.vendorId} savedName={outfit.vendorName} vendors={vendors} />
      {outfit.accessories && (
        <p className="break-words text-sm text-ink-strong">
          <span className="text-ink-muted">{t("outfit.card.accessories")}</span> {outfit.accessories}
        </p>
      )}
      {outfit.notes && <p className="break-words text-sm text-ink-muted">{outfit.notes}</p>}

      <BudgetLink
        planId={planId}
        price={outfit.price}
        category="Vestuario"
        concept={t("budget.concept.outfit", { name: outfit.outfit || name })}
        inBudget={outfit.inBudget}
        onMarked={() => markInBudget(planId, "looks", outfit.id)}
      />
    </li>
  );
}

/** Pruebas: son citas de tipo vestuario de la agenda del plan (se crean y editan allí). */
function FittingsPanel({ fittings }: { fittings: Appointment[] }) {
  const { t } = useTranslation("look");
  const { lang } = useLanguage();
  const launcher = useAppointmentsLauncher();
  const today = todayKey();
  const upcoming = fittings.filter((f) => !f.done && f.date >= today);
  const rest = fittings.filter((f) => !upcoming.includes(f));
  const rows = [...upcoming, ...rest.reverse()].slice(0, 4);

  return (
    <section aria-labelledby="lk-fittings-title" className={cn(LK_CARD, "flex flex-col gap-3 p-4 sm:p-5")}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 max-w-xl">
          <h4 id="lk-fittings-title" className="font-display text-lg font-semibold text-ink sm:text-xl">
            {t("outfit.fittings.title")}
          </h4>
          <p className="mt-1 text-sm text-ink-muted">{t("outfit.fittings.description")}</p>
        </div>
        {launcher && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => launcher.open({ category: "vestuario" })} className={cn(CTA_SECONDARY, "h-11")}>
              <CalendarPlusIcon aria-hidden="true" className="size-4" />
              {t("outfit.fittings.add")}
            </button>
            {fittings.length > 0 && (
              <button type="button" onClick={() => launcher.open({ add: false })} className={cn(CTA_SECONDARY, "h-11")}>
                {t("outfit.fittings.viewAll")}
              </button>
            )}
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-ink-muted">{t("outfit.fittings.empty")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {rows.map((f) => (
            <li key={f.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
              <span className="font-medium text-ink-strong [overflow-wrap:anywhere]">{f.title}</span>
              <span className="text-sm text-ink-muted">{formatShortDate(f.date, lang)}</span>
              {f.time && (
                <span className="inline-flex items-center gap-1 text-sm text-ink-muted">
                  <ClockIcon aria-hidden="true" className="size-3.5" />
                  {f.time}
                </span>
              )}
              {f.place && (
                <span className="inline-flex items-center gap-1 text-sm text-ink-muted [overflow-wrap:anywhere]">
                  <MapPinIcon aria-hidden="true" className="size-3.5 shrink-0" />
                  {f.place}
                </span>
              )}
              {f.done && <span className="text-sm font-medium text-green">{t("outfit.fittings.done")}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function OutfitForm({
  planId,
  outfit,
  defaultWho,
  vendors,
  onDone,
}: {
  planId: string;
  outfit?: Outfit;
  defaultWho: PersonId;
  vendors: Vendor[];
  onDone: () => void;
}) {
  const { t } = useTranslation("look");
  const { lang } = useLanguage();
  const uid = React.useId();
  const [who, setWho] = React.useState<PersonId>(outfit?.who ?? defaultWho);
  const [personName, setPersonName] = React.useState(outfit?.personName ?? "");
  const [look, setLook] = React.useState(outfit?.outfit ?? "");
  const [shop, setShop] = React.useState(outfit?.shop ?? "");
  const [vendorId, setVendorId] = React.useState(outfit?.vendorId ?? "");
  const [vendorName, setVendorName] = React.useState(outfit?.vendorName ?? "");
  const [price, setPrice] = React.useState(priceText(outfit?.price ?? null));
  const [status, setStatus] = React.useState(outfit?.status ?? "searching");
  const [accessories, setAccessories] = React.useState(outfit?.accessories ?? "");
  const [notes, setNotes] = React.useState(outfit?.notes ?? "");
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
    const input: OutfitInput = {
      who,
      personName: personName.trim(),
      outfit: look.trim(),
      shop: shop.trim(),
      vendorId,
      vendorName: vendorId ? vendorName : "",
      price: parsed,
      status,
      accessories: accessories.trim(),
      notes: notes.trim(),
      inBudget: outfit?.inBudget ?? false,
    };
    setSubmitting(true);
    try {
      if (outfit) await updateItem(planId, "looks", outfit.id, input);
      else await addItem(planId, "looks", input);
      toast.success(outfit ? t("outfit.updated") : t("outfit.added"));
      onDone();
    } catch {
      toast.error(t("outfit.saveError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mt-5 flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id={id("who")} label={t("outfit.form.who")}>
            <select
              id={id("who")}
              value={who}
              onChange={(e) => isPersonId(e.target.value) && setWho(e.target.value)}
              className={LK_NATIVE_SELECT}
            >
              {PEOPLE.map((p) => (
                <option key={p} value={p}>
                  {t(`people.${p}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field id={id("name")} label={t("outfit.form.personName")} optional>
            <Input
              id={id("name")}
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder={t("outfit.form.personNamePlaceholder")}
              maxLength={80}
              autoComplete="off"
              className={FIELD}
            />
          </Field>
        </div>
        <Field id={id("look")} label={t("outfit.form.outfit")}>
          <Input
            id={id("look")}
            value={look}
            onChange={(e) => setLook(e.target.value)}
            placeholder={t("outfit.form.outfitPlaceholder")}
            maxLength={160}
            autoFocus
            autoComplete="off"
            className={FIELD}
          />
        </Field>
        <Field id={id("shop")} label={t("outfit.form.shop")} optional>
          <Input
            id={id("shop")}
            value={shop}
            onChange={(e) => setShop(e.target.value)}
            placeholder={t("outfit.form.shopPlaceholder")}
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
            if (vid && !shop.trim()) setShop(name);
          }}
        />
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
        <Field id={id("acc")} label={t("outfit.form.accessories")} optional hint={t("outfit.form.accessoriesHint")}>
          <Input
            id={id("acc")}
            value={accessories}
            onChange={(e) => setAccessories(e.target.value)}
            placeholder={t("outfit.form.accessoriesPlaceholder")}
            maxLength={200}
            autoComplete="off"
            className={FIELD}
          />
        </Field>
        <Field id={id("notes")} label={t("form.notes")} optional>
          <Textarea id={id("notes")} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={600} className={TEXTAREA} />
        </Field>
      </div>
      <FormFooter submitting={submitting} onCancel={onDone} />
    </form>
  );
}
