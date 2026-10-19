"use client";

import * as React from "react";
import { Loader2, PencilIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { computePayerSummary, formatMoney, payerLabel } from "@/components/budget/budget-math";
import { PAYER_PRESETS, type BudgetPlanSettings } from "@/components/budget/budget-model";
import { CARD, CTA_PRIMARY, CTA_SECONDARY, FOCUS } from "@/components/dashboard/ui";
import { FIELD, FIELD_LABEL } from "@/components/guests/brand-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveBudgetPayerLabels } from "@/lib/firebase/budget-plan";
import { useLanguage } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { BudgetItem } from "@/lib/types";

/** Resumen por pagador («Pareja», «Familia de A»…) con lo esperado, pagado y pendiente de cada uno. */
export function BudgetPayers({
  planId,
  items,
  settings,
  canEdit = true,
}: {
  planId: string;
  items: BudgetItem[];
  settings: BudgetPlanSettings;
  /** Solo ver: sin cambiar los nombres de los pagadores. */
  canEdit?: boolean;
}) {
  const { t } = useTranslation("budget");
  const { lang } = useLanguage();
  const [editing, setEditing] = React.useState(false);
  const rows = computePayerSummary(items);
  if (items.length === 0) return null;
  const total = rows.reduce((sum, r) => sum + r.expected, 0);
  const money = (value: number) => formatMoney(value, lang);
  const anyAssigned = rows.some((r) => r.key !== "");

  return (
    <section aria-labelledby="budget-payers-title" className={cn(CARD, "p-5 sm:p-6")}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="budget-payers-title" className="font-display text-lg font-semibold text-ink sm:text-xl">
          {t("payers.title")}
        </h2>
        {!editing && canEdit && (
          <button type="button" onClick={() => setEditing(true)} className={cn(CTA_SECONDARY, "h-11")}>
            <PencilIcon aria-hidden="true" className="size-4" />
            {t("payers.editNames")}
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-ink-muted">{anyAssigned ? t("payers.note") : t("payers.noneAssigned")}</p>

      {editing && canEdit && (
        <PayerNamesForm planId={planId} settings={settings} onDone={() => setEditing(false)} />
      )}

      <ul className="mt-5 flex flex-col gap-4">
        {rows.map((row) => {
          const label = row.key === "" ? t("payers.unassigned") : payerLabel(row.payer, t, settings.payerLabels);
          return (
            <li key={row.key || "__none__"} className="flex flex-col gap-2" data-testid="payer-row">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 break-words text-sm font-medium text-ink-strong">
                  {label}
                  <span className="ml-2 font-normal text-ink-muted">{t("breakdown.items", { count: row.count })}</span>
                </p>
                <p className="shrink-0 text-sm text-ink-muted">
                  <span className="font-display text-base font-semibold text-ink">{money(row.expected)}</span>
                  <span className="ml-2 inline-block min-w-9 text-right">{Math.round(row.percent)}%</span>
                </p>
              </div>
              <div aria-hidden="true" className="flex h-1.5 w-full overflow-hidden rounded-full bg-track">
                <div className="h-full bg-sage" style={{ width: `${total > 0 ? (row.paid / total) * 100 : 0}%` }} />
                <div className="h-full bg-lilac" style={{ width: `${total > 0 ? (row.pending / total) * 100 : 0}%` }} />
              </div>
              <p className="text-xs text-ink-muted">
                {t("breakdown.paid")} <span className="font-medium text-ink">{money(row.paid)}</span> ·{" "}
                {t("breakdown.pending")} <span className="font-medium text-ink">{money(row.pending)}</span>
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Cambia el nombre de los tres pagadores predefinidos (p. ej. «Familia de Marta»). */
function PayerNamesForm({
  planId,
  settings,
  onDone,
}: {
  planId: string;
  settings: BudgetPlanSettings;
  onDone: () => void;
}) {
  const { t } = useTranslation("budget");
  const uid = React.useId();
  const [labels, setLabels] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(PAYER_PRESETS.map((key) => [key, settings.payerLabels[key] ?? ""]))
  );
  const [saving, setSaving] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveBudgetPayerLabels(planId, labels);
      toast.success(t("payers.saved"));
      onDone();
    } catch {
      toast.error(t("payers.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 rounded-xl border border-line bg-raised p-4">
      <p className="text-sm text-ink-muted">{t("payers.editHint")}</p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {PAYER_PRESETS.map((key) => (
          <div key={key} className="flex flex-col gap-2">
            <Label htmlFor={`${uid}-${key}`} className={FIELD_LABEL}>
              {t(`payers.${key}`)}
            </Label>
            <Input
              id={`${uid}-${key}`}
              value={labels[key]}
              onChange={(e) => setLabels((prev) => ({ ...prev, [key]: e.target.value }))}
              placeholder={t(`payers.${key}`)}
              maxLength={40}
              autoComplete="off"
              className={FIELD}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <button type="button" onClick={onDone} className={cn(CTA_SECONDARY, "h-11", FOCUS)}>
          {t("form.cancel")}
        </button>
        <button type="submit" disabled={saving} className={cn(CTA_PRIMARY, "disabled:opacity-60")}>
          {saving && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          {t("form.save")}
        </button>
      </div>
    </form>
  );
}
