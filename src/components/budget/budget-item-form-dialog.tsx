"use client";

import * as React from "react";
import { CheckIcon, Loader2, PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  DIALOG_CONTENT,
  DIALOG_TITLE,
  EditIconButton,
  FIELD,
  FIELD_LABEL,
  SELECT_CONTENT,
  SELECT_ITEM,
  SELECT_TRIGGER,
} from "@/components/guests/brand-dialog";
import {
  BudgetInstallmentsEditor,
  type InstallmentDraft,
} from "@/components/budget/budget-installments-editor";
import {
  categoryLabel,
  installmentsPatch,
  itemInstallments,
  matchCategory,
  newInstallmentId,
  normalize,
  payerLabel,
  todayISO,
} from "@/components/budget/budget-math";
import { PAYER_PRESETS, isPayerPreset } from "@/components/budget/budget-model";
import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBudgetPlan } from "@/lib/firebase/budget-plan";
import { addBudgetItem, updateBudgetItem } from "@/lib/firebase/mutations";
import { mapVendor, vendorsQuery } from "@/lib/firebase/plans";
import { useCollection } from "@/lib/hooks/use-collection";
import type { BudgetInstallment, BudgetItem, BudgetItemState } from "@/lib/types";
import { cn } from "@/lib/utils";

// Categorías sugeridas para que el desglose salga ordenado. Se guardan con este nombre (español)
// y se enseñan traducidas (budget:categories.*).
const DEFAULT_CATEGORIES = ["Lugar", "Catering", "Vestuario", "Fotografía", "Música", "Flores y decoración"];

interface BudgetItemFormDialogProps {
  planId: string;
  item?: BudgetItem;
  trigger?: React.ReactNode;
  /** Categorías ya usadas en el plan: aparecen en el desplegable. */
  categories?: string[];
  /** Pagadores de texto libre ya usados en el plan: aparecen en el desplegable. */
  payers?: string[];
  /** Partida nueva ya enlazada a este proveedor (se usa desde la ficha del proveedor). */
  defaultVendorId?: string;
}

export function BudgetItemFormDialog({
  planId,
  item,
  trigger,
  categories = [],
  payers = [],
  defaultVendorId,
}: BudgetItemFormDialogProps) {
  const { t } = useTranslation("budget");
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button type="button" className={CTA_PRIMARY}>
            <PlusIcon aria-hidden="true" className="size-4" />
            {t("form.addExpense")}
          </button>
        )}
      </DialogTrigger>
      <DialogContent aria-describedby={undefined} className={DIALOG_CONTENT}>
        {open && (
          <BudgetItemForm
            planId={planId}
            item={item}
            categories={categories}
            payers={payers}
            defaultVendorId={defaultVendorId}
            onDone={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

const CUSTOM = "__custom__";
/** Valor del desplegable para «sin proveedor» / «sin asignar» (Radix no admite valor vacío). */
const NONE = "__none__";

const STATE_OPTIONS: BudgetItemState[] = ["pending", "paid"];
type PayMode = "single" | "multi";
const PAY_MODES: PayMode[] = ["single", "multi"];

/** Estilo de las tarjetas de opción (radio) del formulario. */
function optionCard(selected: boolean) {
  return cn(
    "relative flex min-h-14 cursor-pointer flex-col justify-center rounded-xl border px-3.5 py-2 transition-colors",
    "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-lilac has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-surface",
    selected ? "border-lilac bg-lilac-soft" : "border-line-strong bg-field hover:bg-lilac-soft/60"
  );
}

function toDraft(p: { id: string; amount: number; dueDate: string | null; paid: boolean; paidDate: string | null }): InstallmentDraft {
  return {
    id: p.id,
    amount: p.amount > 0 ? String(p.amount) : "",
    dueDate: p.dueDate ?? "",
    paid: p.paid,
    paidDate: p.paidDate ?? "",
  };
}

function BudgetItemForm({
  planId,
  item,
  categories,
  payers,
  defaultVendorId,
  onDone,
}: {
  planId: string;
  item?: BudgetItem;
  categories: string[];
  payers: string[];
  defaultVendorId?: string;
  onDone: () => void;
}) {
  const { t } = useTranslation("budget");
  const isEdit = Boolean(item);
  // Las del plan (incluida la de este gasto) y, tras ellas, las sugeridas que aún no se usan.
  const seen = new Set<string>();
  const options = [...categories, ...(item?.category ? [item.category] : []), ...DEFAULT_CATEGORIES].filter((c) => {
    const key = normalize(c);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const { settings } = useBudgetPlan(planId);
  const { data: vendorList } = useCollection(vendorsQuery(planId), mapVendor);
  const vendors = React.useMemo(
    () => [...vendorList].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [vendorList]
  );

  // Pagadores: los predefinidos, los de texto libre ya usados y el de esta partida.
  const payerOptions = React.useMemo(() => {
    const own = (item?.payer ?? "").trim();
    const extra = [...payers, ...(own && !isPayerPreset(own) ? [own] : [])];
    const keys = new Set<string>();
    return [
      ...PAYER_PRESETS.map((p) => p as string),
      ...extra.filter((p) => {
        const key = normalize(p);
        if (!key || keys.has(key)) return false;
        keys.add(key);
        return true;
      }),
    ];
  }, [payers, item?.payer]);

  const labelOf = (c: string) => categoryLabel(c, t);
  const initial = React.useMemo(() => (item ? itemInstallments(item) : null), [item]);
  const [category, setCategory] = React.useState(item?.category ? matchCategory(item.category, options) : "");
  const [customName, setCustomName] = React.useState("");
  const [concept, setConcept] = React.useState(item?.concept ?? "");
  const [vendorId, setVendorId] = React.useState(item?.vendorId ?? defaultVendorId ?? "");
  const [amount, setAmount] = React.useState(item ? String(item.amount) : "");
  const [actual, setActual] = React.useState(item && typeof item.actual === "number" ? String(item.actual) : "");
  const [payer, setPayer] = React.useState((item?.payer ?? "").trim());
  const [payerCustom, setPayerCustom] = React.useState("");
  const [mode, setMode] = React.useState<PayMode>(initial && initial.length > 1 ? "multi" : "single");
  const [state, setState] = React.useState<BudgetItemState>(initial?.[0]?.paid && initial.length === 1 ? "paid" : "pending");
  const [dueDate, setDueDate] = React.useState(initial && initial.length === 1 ? (initial[0].dueDate ?? "") : "");
  const [paidDate, setPaidDate] = React.useState(initial && initial.length === 1 ? (initial[0].paidDate ?? "") : "");
  const [drafts, setDrafts] = React.useState<InstallmentDraft[]>(
    initial && initial.length > 1 ? initial.map(toDraft) : []
  );
  const [categoryError, setCategoryError] = React.useState("");
  const [paymentError, setPaymentError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const customRef = React.useRef<HTMLInputElement>(null);
  const focusCustom = React.useRef(false);
  const payerCustomRef = React.useRef<HTMLInputElement>(null);
  const focusPayerCustom = React.useRef(false);

  const isCustom = category === CUSTOM;
  const isPayerCustom = payer === CUSTOM;
  const amountNumber = Number(amount);
  const actualNumber = actual.trim() === "" ? null : Number(actual);
  const cost = actualNumber !== null && Number.isFinite(actualNumber) ? actualNumber : Number.isFinite(amountNumber) ? amountNumber : 0;

  function changeVendor(id: string) {
    const next = id === NONE ? "" : id;
    setVendorId(next);
    const vendor = vendors.find((v) => v.id === next);
    // Un proveedor aporta nombre e importe si aún no los has escrito.
    if (vendor && !concept.trim()) setConcept(vendor.name);
    if (vendor && vendor.cost !== null && amount.trim() === "") setAmount(String(vendor.cost));
  }

  function changeMode(next: PayMode) {
    if (next === mode) return;
    setPaymentError("");
    if (next === "multi") {
      // El pago único pasa a ser el primer plazo y el resto queda para un segundo.
      const first = Math.round((cost / 2) * 100) / 100;
      const second = Math.round((cost - first) * 100) / 100;
      setDrafts([
        {
          id: newInstallmentId(),
          amount: cost > 0 ? String(first) : "",
          dueDate: state === "pending" ? dueDate : "",
          paid: state === "paid",
          paidDate: state === "paid" ? paidDate : "",
        },
        { id: newInstallmentId(), amount: cost > 0 ? String(second) : "", dueDate: "", paid: false, paidDate: "" },
      ]);
    } else {
      const allPaid = drafts.length > 0 && drafts.every((d) => d.paid);
      const nextDue = drafts
        .filter((d) => !d.paid && d.dueDate)
        .map((d) => d.dueDate)
        .sort()[0];
      setState(allPaid ? "paid" : "pending");
      setDueDate(nextDue ?? "");
      setPaidDate(allPaid ? (drafts[drafts.length - 1]?.paidDate ?? "") : "");
    }
    setMode(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!concept.trim()) return;
    const finalCategory = isCustom ? matchCategory(customName, options, labelOf) : category;
    if (!finalCategory) {
      setCategoryError(isCustom ? t("form.errors.customCategory") : t("form.errors.category"));
      if (isCustom) customRef.current?.focus();
      return;
    }
    if (!Number.isFinite(amountNumber) || amountNumber < 0) return;
    if (actualNumber !== null && (!Number.isFinite(actualNumber) || actualNumber < 0)) return;
    const finalPayer = (isPayerCustom ? payerCustom : payer).trim();

    let installments: BudgetInstallment[];
    if (mode === "multi") {
      const bad = drafts.some((d) => !Number.isFinite(Number(d.amount)) || Number(d.amount) < 0 || d.amount.trim() === "");
      if (drafts.length === 0 || bad) {
        setPaymentError(t("form.errors.installments"));
        return;
      }
      installments = drafts.map((d) => ({
        id: d.id,
        amount: Number(d.amount),
        dueDate: d.dueDate || null,
        paid: d.paid,
        paidDate: d.paid ? d.paidDate || null : null,
      }));
    } else {
      installments = [
        {
          id: initial?.[0]?.id ?? newInstallmentId(),
          amount: cost,
          dueDate: state === "pending" && dueDate ? dueDate : null,
          paid: state === "paid",
          paidDate: state === "paid" ? paidDate || null : null,
        },
      ];
    }

    setSubmitting(true);
    try {
      const stub: BudgetItem = {
        id: item?.id ?? "",
        category: finalCategory,
        concept: concept.trim(),
        amount: amountNumber,
        actual: actualNumber,
        state: "pending",
        dueDate: null,
        createdAt: null,
      };
      const data = {
        category: finalCategory,
        concept: concept.trim(),
        actual: actualNumber,
        vendorId: vendorId || null,
        payer: finalPayer || null,
        // `amount`, `installments` y el resumen `state` / `dueDate` salen de los plazos.
        ...installmentsPatch(stub, installments),
      };
      if (isEdit && item) {
        await updateBudgetItem(planId, item.id, data);
        toast.success(t("form.updated"));
      } else {
        await addBudgetItem(planId, data);
        toast.success(t("form.added"));
      }
      onDone();
    } catch {
      toast.error(t("form.saveError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle className={DIALOG_TITLE}>{isEdit ? t("form.editTitle") : t("form.newTitle")}</DialogTitle>
      </DialogHeader>
      <div className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="budget-concept" className={FIELD_LABEL}>
            {t("form.concept")}
          </Label>
          <Input
            id="budget-concept"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder={t("form.conceptPlaceholder")}
            required
            autoFocus
            className={FIELD}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="budget-category" className={FIELD_LABEL}>
            {t("form.category")}
          </Label>
          <Select
            value={category}
            onValueChange={(v) => {
              focusCustom.current = v === CUSTOM;
              setCategory(v);
              setCategoryError("");
            }}
          >
            <SelectTrigger
              id="budget-category"
              className={SELECT_TRIGGER}
              aria-invalid={categoryError && !isCustom ? true : undefined}
              aria-describedby={categoryError && !isCustom ? "budget-category-error" : undefined}
            >
              <SelectValue placeholder={t("form.categoryPlaceholder")} />
            </SelectTrigger>
            <SelectContent
              className={SELECT_CONTENT}
              onCloseAutoFocus={(e) => {
                // Al crear una categoría propia, el foco va directo a escribirla.
                if (focusCustom.current) {
                  e.preventDefault();
                  focusCustom.current = false;
                  customRef.current?.focus();
                }
              }}
            >
              {options.map((c) => (
                <SelectItem key={c} value={c} className={SELECT_ITEM}>
                  {labelOf(c)}
                </SelectItem>
              ))}
              <SelectItem value={CUSTOM} className={cn(SELECT_ITEM, "font-medium")}>
                {t("form.customOption")}
              </SelectItem>
            </SelectContent>
          </Select>
          {isCustom && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="budget-category-custom" className={FIELD_LABEL}>
                {t("form.customName")}
              </Label>
              <Input
                id="budget-category-custom"
                ref={customRef}
                value={customName}
                onChange={(e) => {
                  setCustomName(e.target.value);
                  setCategoryError("");
                }}
                placeholder={t("form.customPlaceholder")}
                maxLength={60}
                autoComplete="off"
                aria-invalid={categoryError ? true : undefined}
                aria-describedby={categoryError ? "budget-category-error" : undefined}
                className={FIELD}
              />
            </div>
          )}
          {categoryError && (
            <p id="budget-category-error" role="alert" className="text-sm text-danger">
              {categoryError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="budget-vendor" className={FIELD_LABEL}>
            {t("form.vendor")} <span className="font-normal text-ink-muted">{t("form.optional")}</span>
          </Label>
          <Select value={vendorId || NONE} onValueChange={changeVendor}>
            <SelectTrigger id="budget-vendor" className={SELECT_TRIGGER}>
              <SelectValue placeholder={t("form.vendorNone")} />
            </SelectTrigger>
            <SelectContent className={SELECT_CONTENT}>
              <SelectItem value={NONE} className={SELECT_ITEM}>
                {t("form.vendorNone")}
              </SelectItem>
              {vendors.map((v) => (
                <SelectItem key={v.id} value={v.id} className={SELECT_ITEM}>
                  {v.name}
                  {v.category ? ` · ${v.category}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-ink-muted">{t("form.vendorHint")}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="budget-amount" className={FIELD_LABEL}>
              {t("form.amount")}
            </Label>
            <Input
              id="budget-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={FIELD}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="budget-actual" className={FIELD_LABEL}>
              {t("form.actual")} <span className="font-normal text-ink-muted">{t("form.optional")}</span>
            </Label>
            <Input
              id="budget-actual"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              aria-describedby="budget-actual-hint"
              className={FIELD}
            />
          </div>
        </div>
        <p id="budget-actual-hint" className="-mt-2 text-xs text-ink-muted">
          {t("form.actualHint")}
        </p>

        <div className="flex flex-col gap-2">
          <Label htmlFor="budget-payer" className={FIELD_LABEL}>
            {t("form.payer")} <span className="font-normal text-ink-muted">{t("form.optional")}</span>
          </Label>
          <Select
            value={payer || NONE}
            onValueChange={(v) => {
              focusPayerCustom.current = v === CUSTOM;
              setPayer(v === NONE ? "" : v);
            }}
          >
            <SelectTrigger id="budget-payer" className={SELECT_TRIGGER}>
              <SelectValue placeholder={t("form.payerNone")} />
            </SelectTrigger>
            <SelectContent
              className={SELECT_CONTENT}
              onCloseAutoFocus={(e) => {
                if (focusPayerCustom.current) {
                  e.preventDefault();
                  focusPayerCustom.current = false;
                  payerCustomRef.current?.focus();
                }
              }}
            >
              <SelectItem value={NONE} className={SELECT_ITEM}>
                {t("form.payerNone")}
              </SelectItem>
              {payerOptions.map((p) => (
                <SelectItem key={p} value={p} className={SELECT_ITEM}>
                  {payerLabel(p, t, settings.payerLabels)}
                </SelectItem>
              ))}
              <SelectItem value={CUSTOM} className={cn(SELECT_ITEM, "font-medium")}>
                {t("form.payerCustomOption")}
              </SelectItem>
            </SelectContent>
          </Select>
          {isPayerCustom && (
            <Input
              ref={payerCustomRef}
              aria-label={t("form.payerCustomName")}
              value={payerCustom}
              onChange={(e) => setPayerCustom(e.target.value)}
              placeholder={t("form.payerCustomPlaceholder")}
              maxLength={40}
              autoComplete="off"
              className={FIELD}
            />
          )}
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className={cn(FIELD_LABEL, "mb-2")}>{t("form.payMode.legend")}</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PAY_MODES.map((value) => (
              <label key={value} className={optionCard(mode === value)}>
                <input
                  type="radio"
                  name="budget-pay-mode"
                  value={value}
                  checked={mode === value}
                  onChange={() => changeMode(value)}
                  className="sr-only"
                />
                <span className="flex items-center gap-2 text-sm font-medium text-ink">
                  {t(`form.payMode.${value}.title`)}
                  {mode === value && <CheckIcon aria-hidden="true" className="size-4 text-green" />}
                </span>
                <span className="text-xs text-ink-muted">{t(`form.payMode.${value}.hint`)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {mode === "single" ? (
          <>
            <fieldset className="flex flex-col gap-2">
              <legend className={cn(FIELD_LABEL, "mb-2")}>{t("form.status")}</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {STATE_OPTIONS.map((value) => (
                  <label key={value} className={optionCard(state === value)}>
                    <input
                      type="radio"
                      name="budget-state"
                      value={value}
                      checked={state === value}
                      onChange={() => {
                        setState(value);
                        if (value === "paid" && !paidDate) setPaidDate(todayISO());
                      }}
                      className="sr-only"
                    />
                    <span className="flex items-center gap-2 text-sm font-medium text-ink">
                      {t(`form.state.${value}.title`)}
                      {state === value && <CheckIcon aria-hidden="true" className="size-4 text-green" />}
                    </span>
                    <span className="text-xs text-ink-muted">{t(`form.state.${value}.hint`)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {state === "pending" ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="budget-due" className={FIELD_LABEL}>
                  {t("form.dueDate")} <span className="font-normal text-ink-muted">{t("form.optional")}</span>
                </Label>
                <DatePicker
                  id="budget-due"
                  value={dueDate}
                  onChange={setDueDate}
                  placeholder={t("form.duePlaceholder")}
                  className={FIELD}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Label htmlFor="budget-paid-date" className={FIELD_LABEL}>
                  {t("form.paidDate")} <span className="font-normal text-ink-muted">{t("form.optional")}</span>
                </Label>
                <DatePicker
                  id="budget-paid-date"
                  value={paidDate}
                  onChange={setPaidDate}
                  placeholder={t("form.paidDatePlaceholder")}
                  className={FIELD}
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <BudgetInstallmentsEditor drafts={drafts} onChange={setDrafts} cost={cost} newId={newInstallmentId} />
            {paymentError && (
              <p role="alert" className="text-sm text-danger">
                {paymentError}
              </p>
            )}
          </div>
        )}
      </div>
      <DialogFooter className="mt-6 gap-2 sm:gap-3">
        <button type="button" onClick={onDone} className={cn(CTA_SECONDARY, "h-11")}>
          {t("form.cancel")}
        </button>
        <button type="submit" disabled={submitting} className={cn(CTA_PRIMARY, "disabled:opacity-60")}>
          {submitting && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          {t("form.save")}
        </button>
      </DialogFooter>
    </form>
  );
}

/** Disparador de edición; recibe las props que le inyecta DialogTrigger. */
export function EditBudgetItemTrigger({
  concept,
  ...props
}: React.ComponentProps<"button"> & { concept?: string }) {
  const { t } = useTranslation("budget");
  return <EditIconButton label={concept ? t("form.editNamed", { name: concept }) : t("form.editTitle")} {...props} />;
}
