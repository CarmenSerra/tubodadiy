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
import { categoryLabel, matchCategory, normalize } from "@/components/budget/budget-math";
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
import { addBudgetItem, updateBudgetItem } from "@/lib/firebase/mutations";
import type { BudgetItem, BudgetItemState } from "@/lib/types";
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
}

export function BudgetItemFormDialog({ planId, item, trigger, categories = [] }: BudgetItemFormDialogProps) {
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
            onDone={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

const CUSTOM = "__custom__";

const STATE_OPTIONS: BudgetItemState[] = ["pending", "paid"];

function BudgetItemForm({
  planId,
  item,
  categories,
  onDone,
}: {
  planId: string;
  item?: BudgetItem;
  categories: string[];
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

  const labelOf = (c: string) => categoryLabel(c, t);
  const [category, setCategory] = React.useState(item?.category ? matchCategory(item.category, options) : "");
  const [customName, setCustomName] = React.useState("");
  const [concept, setConcept] = React.useState(item?.concept ?? "");
  const [amount, setAmount] = React.useState(item ? String(item.amount) : "");
  const [state, setState] = React.useState<BudgetItemState>(item?.state ?? "pending");
  const [dueDate, setDueDate] = React.useState(item?.dueDate ?? "");
  const [categoryError, setCategoryError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const customRef = React.useRef<HTMLInputElement>(null);
  const focusCustom = React.useRef(false);

  const isCustom = category === CUSTOM;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!concept.trim()) return;
    const finalCategory = isCustom ? matchCategory(customName, options, labelOf) : category;
    if (!finalCategory) {
      setCategoryError(isCustom ? t("form.errors.customCategory") : t("form.errors.category"));
      if (isCustom) customRef.current?.focus();
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) return;
    setSubmitting(true);
    try {
      const data = {
        category: finalCategory,
        concept: concept.trim(),
        amount: value,
        state,
        dueDate: state === "pending" && dueDate ? dueDate : null,
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
        <fieldset className="flex flex-col gap-2">
          <legend className={cn(FIELD_LABEL, "mb-2")}>{t("form.status")}</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {STATE_OPTIONS.map((value) => (
              <label
                key={value}
                className={cn(
                  "relative flex min-h-14 cursor-pointer flex-col justify-center rounded-xl border px-3.5 py-2 transition-colors",
                  "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-lilac has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-surface",
                  state === value
                    ? "border-lilac bg-lilac-soft"
                    : "border-line-strong bg-field hover:bg-lilac-soft/60"
                )}
              >
                <input
                  type="radio"
                  name="budget-state"
                  value={value}
                  checked={state === value}
                  onChange={() => setState(value)}
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
        {state === "pending" && (
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
