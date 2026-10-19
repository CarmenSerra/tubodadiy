"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, PieChartIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  categoryLabel,
  formatMoney,
  listCategories,
  matchCategory,
  normalize,
} from "@/components/budget/budget-math";
import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import { FIELD, FIELD_LABEL, ICON_BUTTON } from "@/components/guests/brand-dialog";
import { ToolDialog } from "@/components/plan-tools/tool-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePlanContext } from "@/lib/context/plan-context";
import { saveBudgetAllocations, useBudgetPlan } from "@/lib/firebase/budget-plan";
import { mapBudgetItem, budgetItemsQuery } from "@/lib/firebase/plans";
import { updatePlanDetails } from "@/lib/firebase/mutations";
import { useCollection } from "@/lib/hooks/use-collection";
import { usePlanPermission } from "@/lib/hooks/use-plan-permission";
import { useLanguage } from "@/lib/i18n/provider";
import { BUDGET_CATEGORY_IDEAS } from "@/lib/ideas";
import { cn } from "@/lib/utils";

/** Valor de `?herramienta=` que abre este reparto (en el Resumen o en la pestaña Presupuesto). */
export const BUDGET_ALLOCATION_TOOL_VALUE = "reparto";

const FORM_ID = "budget-allocation-form";
const DEFAULT_CATEGORY_NAMES = BUDGET_CATEGORY_IDEAS.map((idea) => idea.category);

type Mode = "amount" | "percent";

interface Row {
  id: string;
  /** Nombre guardado (español en las categorías típicas; lo escrito, en las propias). */
  category: string;
  /** Categoría que escribe la persona: el nombre es editable. */
  custom: boolean;
  /** Importe (€) o porcentaje (%) según el modo, tal como se escribe. */
  text: string;
}

interface Draft {
  total: string;
  mode: Mode;
  rows: Row[];
}

let rowCounter = 0;
const rowId = () => `r${(rowCounter += 1)}`;

const num = (text: string) => {
  const n = Number(text);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Reparto típico: cada categoría con su % orientativo, en el modo pedido. */
function defaultRows(total: number, mode: Mode, extras: string[]): Row[] {
  const rows: Row[] = BUDGET_CATEGORY_IDEAS.map((idea) => ({
    id: rowId(),
    category: idea.category,
    custom: false,
    text:
      mode === "percent"
        ? String(idea.share)
        : total > 0
          ? String(Math.round((total * idea.share) / 100 / 10) * 10)
          : "",
  }));
  for (const extra of extras) rows.push({ id: rowId(), category: extra, custom: true, text: "" });
  return rows;
}

/** Categorías con partidas que no están entre las típicas: se ofrecen para repartirles algo. */
function extraCategories(used: string[], saved: string[]): string[] {
  const known = new Set([...DEFAULT_CATEGORY_NAMES, ...saved].map(normalize));
  return used.filter((c) => !known.has(normalize(c)));
}

/**
 * «Repartir el presupuesto por categorías»: el presupuesto total y un reparto entre categorías
 * (por importe o por porcentaje, con una sugerencia típica de bodas en España). Se guarda en el
 * plan (`budgetPlan.allocations`) y la pestaña Presupuesto lo compara con lo previsto y lo real.
 * Debe montarse dentro de `PlanProvider`.
 */
export function BudgetAllocationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("budget");
  const { lang } = useLanguage();
  const { planId, plan } = usePlanContext();
  const { settings, loading: settingsLoading } = useBudgetPlan(planId);
  // Las partidas se leen siempre (la consulta ya está abierta en Presupuesto y en el panel) para que
  // estén cargadas al abrir y se puedan ofrecer las categorías que ya usas.
  const { data: items, loading: itemsLoading } = useCollection(budgetItemsQuery(planId), mapBudgetItem);
  const [draft, setDraft] = React.useState<Draft>({ total: "", mode: "percent", rows: [] });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  // El borrador se construye una vez al abrir (cuando ya han llegado los datos).
  const ready = open && !settingsLoading && !itemsLoading;
  const [wasReady, setWasReady] = React.useState(false);
  if (ready !== wasReady) {
    setWasReady(ready);
    if (ready) {
      const planTotal = plan?.budgetTotal ?? 0;
      const used = listCategories(items);
      const saved = settings.allocations;
      if (saved.length > 0) {
        const savedNames = saved.map((a) => a.category);
        setDraft({
          total: planTotal > 0 ? String(planTotal) : "",
          mode: "amount",
          rows: [
            ...saved.map((a) => ({
              id: rowId(),
              category: a.category,
              custom: !DEFAULT_CATEGORY_NAMES.some((c) => normalize(c) === normalize(a.category)),
              text: String(a.amount),
            })),
            ...extraCategories(used, savedNames).map((c) => ({ id: rowId(), category: c, custom: true, text: "" })),
          ],
        });
      } else {
        const mode: Mode = "percent";
        setDraft({ total: planTotal > 0 ? String(planTotal) : "", mode, rows: defaultRows(planTotal, mode, extraCategories(used, [])) });
      }
      setError("");
    }
  }

  const totalN = num(draft.total);
  const amountOf = (row: Row) =>
    draft.mode === "amount" ? num(row.text) : totalN > 0 ? Math.round((totalN * num(row.text)) / 100) : 0;
  const assigned = draft.rows.reduce((sum, row) => sum + amountOf(row), 0);
  const money = (value: number) => formatMoney(value, lang);

  function updateRow(id: string, patch: Partial<Row>) {
    setDraft((d) => ({ ...d, rows: d.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  }

  function changeMode(next: Mode) {
    if (next === draft.mode) return;
    setDraft((d) => ({
      ...d,
      mode: next,
      rows: d.rows.map((r) => {
        const n = num(r.text);
        if (n === 0) return { ...r, text: "" };
        if (next === "percent") return { ...r, text: totalN > 0 ? String(round1((n / totalN) * 100)) : "" };
        return { ...r, text: String(Math.round((totalN * n) / 100)) };
      }),
    }));
  }

  function resetToTypical() {
    const used = listCategories(items);
    // Sin total solo se pueden dar porcentajes.
    const mode: Mode = totalN > 0 ? draft.mode : "percent";
    setDraft((d) => ({ ...d, mode, rows: defaultRows(totalN, mode, extraCategories(used, [])) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (draft.mode === "percent" && totalN <= 0) {
      setError(t("allocation.errors.needTotal"));
      return;
    }
    const known = DEFAULT_CATEGORY_NAMES;
    const allocations = draft.rows
      .map((row) => ({
        category: row.custom ? matchCategory(row.category, known, (c) => categoryLabel(c, t)) : row.category,
        amount: amountOf(row),
      }))
      .filter((a) => a.category.trim() && a.amount > 0);
    setSaving(true);
    try {
      if (totalN > 0 && totalN !== (plan?.budgetTotal ?? 0)) await updatePlanDetails(planId, { budgetTotal: totalN });
      await saveBudgetAllocations(planId, allocations);
      toast.success(t("allocation.saved"));
      onOpenChange(false);
    } catch {
      toast.error(t("allocation.saveError"));
    } finally {
      setSaving(false);
    }
  }

  const left = totalN - assigned;

  return (
    <ToolDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("allocation.title")}
      description={t("allocation.description")}
      icon={<PieChartIcon />}
      footer={
        <>
          <button type="button" onClick={() => onOpenChange(false)} className={cn(CTA_SECONDARY, "h-11")}>
            {t("form.cancel")}
          </button>
          <button type="submit" form={FORM_ID} disabled={saving || !ready} className={cn(CTA_PRIMARY, "disabled:opacity-60")}>
            {saving && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
            {t("allocation.save")}
          </button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="allocation-total" className={FIELD_LABEL}>
            {t("allocation.total")}
          </Label>
          <Input
            id="allocation-total"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={draft.total}
            onChange={(e) => {
              setDraft((d) => ({ ...d, total: e.target.value }));
              setError("");
            }}
            placeholder={t("allocation.totalPlaceholder")}
            className={cn(FIELD, "max-w-56")}
          />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className={cn(FIELD_LABEL, "mb-2")}>{t("allocation.modeLegend")}</legend>
          <div className="inline-flex w-fit gap-2">
            {(["percent", "amount"] as const).map((value) => (
              <label
                key={value}
                className={cn(
                  "relative inline-flex h-11 min-w-28 cursor-pointer items-center justify-center rounded-full border px-4 text-sm font-medium text-ink transition-colors",
                  "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-lilac has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-surface",
                  draft.mode === value ? "border-2 border-lilac bg-lilac-soft" : "border-line-strong bg-field hover:bg-lilac-soft/60"
                )}
              >
                <input
                  type="radio"
                  name="allocation-mode"
                  value={value}
                  checked={draft.mode === value}
                  onChange={() => changeMode(value)}
                  className="sr-only"
                />
                {t(`allocation.mode.${value}`)}
              </label>
            ))}
          </div>
        </fieldset>

        <div
          role="status"
          aria-live="polite"
          className="rounded-xl bg-lilac-soft px-4 py-3 text-sm text-ink ring-1 ring-lilac-edge"
        >
          {totalN > 0 ? (
            <>
              <p>
                {t("allocation.assigned", {
                  assigned: money(assigned),
                  total: money(totalN),
                  percent: Math.round((assigned / totalN) * 100),
                })}
              </p>
              <p className="text-ink-muted">
                {left >= 0
                  ? t("allocation.unassigned", { amount: money(left) })
                  : t("allocation.above", { amount: money(-left) })}
              </p>
            </>
          ) : (
            <p>{t("allocation.assignedNoTotal", { assigned: money(assigned) })}</p>
          )}
        </div>

        <ul className="flex flex-col gap-3" aria-label={t("allocation.rowsLabel")}>
          {draft.rows.map((row) => {
            const name = row.custom ? row.category : categoryLabel(row.category, t);
            const inputId = `allocation-${row.id}`;
            const equivalent = draft.mode === "amount"
              ? totalN > 0 && num(row.text) > 0
                ? `≈ ${Math.round((num(row.text) / totalN) * 100)}%`
                : ""
              : num(row.text) > 0 && totalN > 0
                ? `≈ ${money(amountOf(row))}`
                : "";
            return (
              <li key={row.id} className="flex flex-wrap items-end gap-x-3 gap-y-2 rounded-xl border border-line bg-raised p-3">
                <div className="flex min-w-40 flex-1 flex-col gap-2">
                  {row.custom ? (
                    <>
                      <Label htmlFor={`${inputId}-name`} className={FIELD_LABEL}>
                        {t("allocation.categoryName")}
                      </Label>
                      <Input
                        id={`${inputId}-name`}
                        value={row.category}
                        onChange={(e) => updateRow(row.id, { category: e.target.value })}
                        placeholder={t("allocation.categoryPlaceholder")}
                        maxLength={60}
                        autoComplete="off"
                        className={FIELD}
                      />
                    </>
                  ) : (
                    <Label htmlFor={inputId} className={cn(FIELD_LABEL, "leading-snug")}>
                      {name}
                    </Label>
                  )}
                </div>
                <div className="flex w-36 flex-col gap-2">
                  {row.custom && (
                    <Label htmlFor={inputId} className={FIELD_LABEL}>
                      {draft.mode === "amount" ? t("allocation.amountLabel") : t("allocation.percentLabel")}
                    </Label>
                  )}
                  <div className="relative">
                    <Input
                      id={inputId}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      value={row.text}
                      onChange={(e) => updateRow(row.id, { text: e.target.value })}
                      className={cn(FIELD, "pr-8")}
                    />
                    <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-muted">
                      {draft.mode === "amount" ? "€" : "%"}
                    </span>
                  </div>
                </div>
                <p className="min-w-16 pb-3 text-sm text-ink-muted">{equivalent}</p>
                <button
                  type="button"
                  className={cn(ICON_BUTTON, "mb-0.5")}
                  aria-label={t("allocation.remove", { name: name || t("allocation.thisCategory") })}
                  title={t("allocation.remove", { name: name || t("allocation.thisCategory") })}
                  onClick={() => setDraft((d) => ({ ...d, rows: d.rows.filter((r) => r.id !== row.id) }))}
                >
                  <Trash2Icon aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setDraft((d) => ({ ...d, rows: [...d.rows, { id: rowId(), category: "", custom: true, text: "" }] }))
            }
            className={cn(CTA_SECONDARY, "h-11")}
          >
            <PlusIcon aria-hidden="true" className="size-4" />
            {t("allocation.addCategory")}
          </button>
          <button type="button" onClick={resetToTypical} className={cn(CTA_SECONDARY, "h-11")}>
            {t("allocation.useTypical")}
          </button>
        </div>
        <p className="text-xs text-ink-muted">{t("allocation.typicalNote")}</p>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </form>
    </ToolDialog>
  );
}

/**
 * Llama a `onOpen` cuando la URL lleva `?herramienta=reparto` y limpia el parámetro (así cerrar y
 * recargar no lo vuelve a abrir). Usa `useSearchParams`: necesita un `Suspense` por encima.
 */
export function useOpenAllocationFromLink(onOpen: () => void) {
  const searchParams = useSearchParams();
  const param = searchParams.get("herramienta");

  React.useEffect(() => {
    if (param !== BUDGET_ALLOCATION_TOOL_VALUE) return;
    onOpen();
    const url = new URL(window.location.href);
    url.searchParams.delete("herramienta");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [param]);
}

/**
 * Para el Resumen: pon `<BudgetAllocationFromLink />` dentro de `PlanProvider` y de un `Suspense`
 * y el reparto se abre solo con `?herramienta=reparto` (monta su propio diálogo).
 */
export function BudgetAllocationFromLink() {
  const [open, setOpen] = React.useState(false);
  const { canEdit } = usePlanPermission("budget");
  useOpenAllocationFromLink(() => setOpen(true));
  // El diálogo lee las partidas del presupuesto: sin poder editarlo, ni se monta.
  return canEdit ? <BudgetAllocationDialog open={open} onOpenChange={setOpen} /> : null;
}
