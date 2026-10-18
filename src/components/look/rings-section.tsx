"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CTA_PRIMARY } from "@/components/dashboard/ui";
import { FIELD } from "@/components/guests/brand-dialog";
import { markRingsInBudget, saveRings } from "@/components/look/look-firebase";
import type { Rings } from "@/components/look/look-model";
import {
  BudgetLink,
  Field,
  LK_CARD,
  SectionHeader,
  StatusBadge,
  StatusSelect,
  VendorChip,
  VendorSelect,
  parsePrice,
  priceText,
} from "@/components/look/ui";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDateValue, formatMoney } from "@/lib/i18n/format";
import { useLanguage } from "@/lib/i18n/provider";
import type { Vendor } from "@/lib/types";
import { cn } from "@/lib/utils";

const TEXTAREA =
  "min-h-20 rounded-xl border-line-strong bg-field text-base text-ink-strong shadow-none placeholder:text-ink-placeholder focus-visible:ring-lilac focus-visible:ring-offset-0 sm:text-sm";
const PICKER =
  "h-11 rounded-xl border-line-strong bg-field text-base text-ink-strong shadow-none focus-visible:ring-lilac focus-visible:ring-offset-0 sm:text-sm";

/** «Anillos»: una sola ficha (modelo, tienda, tallas, grabado, precio, estado y recogida). */
export function RingsSection({ planId, rings, vendors }: { planId: string; rings: Rings; vendors: Vendor[] }) {
  const { t } = useTranslation("look");
  const { lang } = useLanguage();
  const uid = React.useId();
  const id = (name: string) => `${uid}-${name}`;

  const [model, setModel] = React.useState(rings.model);
  const [shop, setShop] = React.useState(rings.shop);
  const [vendorId, setVendorId] = React.useState(rings.vendorId);
  const [vendorName, setVendorName] = React.useState(rings.vendorName);
  const [sizeA, setSizeA] = React.useState(rings.sizeA);
  const [sizeB, setSizeB] = React.useState(rings.sizeB);
  const [engravingA, setEngravingA] = React.useState(rings.engravingA);
  const [engravingB, setEngravingB] = React.useState(rings.engravingB);
  const [price, setPrice] = React.useState(priceText(rings.price));
  const [status, setStatus] = React.useState(rings.status);
  const [pickupDate, setPickupDate] = React.useState(rings.pickupDate);
  const [notes, setNotes] = React.useState(rings.notes);
  const [priceError, setPriceError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const parsedPrice = parsePrice(price, lang);
  const draft: Rings = {
    model: model.trim(),
    shop: shop.trim(),
    vendorId,
    vendorName: vendorId ? vendorName : "",
    sizeA: sizeA.trim(),
    sizeB: sizeB.trim(),
    engravingA: engravingA.trim(),
    engravingB: engravingB.trim(),
    price: parsedPrice === undefined ? null : parsedPrice,
    status,
    pickupDate,
    notes: notes.trim(),
    inBudget: rings.inBudget,
  };
  const dirty = JSON.stringify(draft) !== JSON.stringify(rings);
  const empty =
    !rings.model &&
    !rings.shop &&
    !rings.vendorId &&
    !rings.sizeA &&
    !rings.sizeB &&
    !rings.engravingA &&
    !rings.engravingB &&
    rings.price === null &&
    !rings.pickupDate &&
    !rings.notes &&
    rings.status === "searching";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (parsedPrice === undefined) {
      setPriceError(t("form.errors.price"));
      document.getElementById(id("price"))?.focus();
      return;
    }
    setPriceError(null);
    setSubmitting(true);
    try {
      await saveRings(planId, draft);
      toast.success(t("rings.saved"));
    } catch {
      toast.error(t("rings.saveError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader title={t("rings.title")} description={t("rings.description")} />

      {!empty && (
        <div className={cn(LK_CARD, "flex flex-col gap-2 p-4 sm:p-5")} aria-label={t("rings.summary")} role="group">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={rings.status} />
            {rings.price !== null && (
              <span className="text-sm font-medium tabular-nums text-ink">{formatMoney(rings.price, lang)}</span>
            )}
            {rings.pickupDate && (
              <span className="text-sm text-ink-muted">
                {t("rings.pickupOn", { date: formatDateValue(rings.pickupDate, lang) ?? rings.pickupDate })}
              </span>
            )}
          </div>
          <VendorChip planId={planId} vendorId={rings.vendorId} savedName={rings.vendorName} vendors={vendors} />
          <BudgetLink
            planId={planId}
            price={rings.price}
            category="Alianzas"
            concept={t("budget.concept.rings", { name: rings.model || t("rings.title") })}
            inBudget={rings.inBudget}
            onMarked={() => markRingsInBudget(planId)}
          />
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className={cn(LK_CARD, "flex flex-col gap-5 p-4 sm:p-6")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id={id("model")} label={t("rings.fields.model")} optional>
            <Input
              id={id("model")}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={t("rings.fields.modelPlaceholder")}
              maxLength={160}
              autoComplete="off"
              className={FIELD}
            />
          </Field>
          <Field id={id("shop")} label={t("rings.fields.shop")} optional>
            <Input
              id={id("shop")}
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              placeholder={t("rings.fields.shopPlaceholder")}
              maxLength={120}
              autoComplete="off"
              className={FIELD}
            />
          </Field>
        </div>
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {(["A", "B"] as const).map((who) => {
            const size = who === "A" ? sizeA : sizeB;
            const engraving = who === "A" ? engravingA : engravingB;
            return (
              <fieldset key={who} className="flex flex-col gap-4 rounded-xl border border-line p-4">
                <legend className="px-1 text-sm font-medium text-ink">{t(`rings.partner${who}`)}</legend>
                <Field id={id(`size${who}`)} label={t("rings.fields.size")} optional>
                  <Input
                    id={id(`size${who}`)}
                    value={size}
                    onChange={(e) => (who === "A" ? setSizeA(e.target.value) : setSizeB(e.target.value))}
                    placeholder={t("rings.fields.sizePlaceholder")}
                    maxLength={20}
                    autoComplete="off"
                    className={cn(FIELD, "sm:max-w-40")}
                  />
                </Field>
                <Field id={id(`engr${who}`)} label={t("rings.fields.engraving")} optional>
                  <Input
                    id={id(`engr${who}`)}
                    value={engraving}
                    onChange={(e) => (who === "A" ? setEngravingA(e.target.value) : setEngravingB(e.target.value))}
                    placeholder={t("rings.fields.engravingPlaceholder")}
                    maxLength={60}
                    autoComplete="off"
                    className={FIELD}
                  />
                </Field>
              </fieldset>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field id={id("price")} label={t("rings.fields.price")} optional hint={t("rings.fields.priceHint")} error={priceError}>
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
          <Field id={id("pickup")} label={t("rings.fields.pickupDate")} optional>
            <DatePicker id={id("pickup")} value={pickupDate} onChange={setPickupDate} className={PICKER} />
          </Field>
        </div>

        <Field id={id("notes")} label={t("form.notes")} optional>
          <Textarea id={id("notes")} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={600} className={TEXTAREA} />
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={submitting || !dirty} className={cn(CTA_PRIMARY, "disabled:opacity-60")}>
            {submitting && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
            {t("form.save")}
          </button>
          {dirty && !submitting && <p className="text-sm text-ink-muted">{t("rings.unsaved")}</p>}
        </div>
      </form>
    </div>
  );
}
