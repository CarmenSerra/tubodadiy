"use client";

import * as React from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { CHECKBOX, FIELD, FIELD_LABEL, ICON_BUTTON } from "@/components/guests/brand-dialog";
import { formatMoney, todayISO } from "@/components/budget/budget-math";
import { CTA_SECONDARY } from "@/components/dashboard/ui";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

/** Plazo tal como se edita en el formulario (importe como texto). */
export interface InstallmentDraft {
  id: string;
  amount: string;
  dueDate: string;
  paid: boolean;
  paidDate: string;
}

export function sumDrafts(drafts: InstallmentDraft[]): number {
  return drafts.reduce((sum, d) => {
    const n = Number(d.amount);
    return sum + (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);
}

/** Lista editable de plazos de pago (importe, fecha límite, pagado y fecha de pago). */
export function BudgetInstallmentsEditor({
  drafts,
  onChange,
  cost,
  newId,
}: {
  drafts: InstallmentDraft[];
  onChange: (drafts: InstallmentDraft[]) => void;
  /** Lo que cuesta la partida (real o, si no, previsto): para avisar si los plazos no cuadran. */
  cost: number;
  newId: () => string;
}) {
  const { t } = useTranslation("budget");
  const { lang } = useLanguage();
  const uid = React.useId();
  const sum = sumDrafts(drafts);
  const diff = Math.round((cost - sum) * 100) / 100;

  function update(id: string, patch: Partial<InstallmentDraft>) {
    onChange(drafts.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  function add() {
    onChange([...drafts, { id: newId(), amount: diff > 0 ? String(diff) : "", dueDate: "", paid: false, paidDate: "" }]);
  }

  /** Cuadra la suma con el importe cambiando el último plazo sin pagar (o el último). */
  function adjust() {
    const target = [...drafts].reverse().find((d) => !d.paid) ?? drafts[drafts.length - 1];
    if (!target) return;
    const others = sum - (Number(target.amount) > 0 ? Number(target.amount) : 0);
    const next = Math.max(0, Math.round((cost - others) * 100) / 100);
    update(target.id, { amount: String(next) });
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {drafts.map((d, index) => {
          const n = index + 1;
          const base = `${uid}-${d.id}`;
          return (
            <li key={d.id} className="rounded-xl border border-line bg-raised p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink">{t("form.installments.number", { n })}</p>
                {drafts.length > 1 && (
                  <button
                    type="button"
                    className={cn(ICON_BUTTON, "-mr-1")}
                    aria-label={t("form.installments.remove", { n })}
                    title={t("form.installments.remove", { n })}
                    onClick={() => onChange(drafts.filter((x) => x.id !== d.id))}
                  >
                    <Trash2Icon aria-hidden="true" />
                  </button>
                )}
              </div>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`${base}-amount`} className={FIELD_LABEL}>
                    {t("form.installments.amount")}
                  </Label>
                  <Input
                    id={`${base}-amount`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    required
                    value={d.amount}
                    onChange={(e) => update(d.id, { amount: e.target.value })}
                    className={FIELD}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`${base}-due`} className={FIELD_LABEL}>
                    {t("form.installments.due")} <span className="font-normal text-ink-muted">{t("form.optional")}</span>
                  </Label>
                  <DatePicker
                    id={`${base}-due`}
                    value={d.dueDate}
                    onChange={(v) => update(d.id, { dueDate: v })}
                    placeholder={t("form.installments.duePlaceholder")}
                    className={FIELD}
                  />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
                <div className="flex min-h-11 items-center gap-2.5">
                  <Checkbox
                    id={`${base}-paid`}
                    checked={d.paid}
                    onCheckedChange={(checked) =>
                      update(d.id, { paid: checked === true, paidDate: checked === true ? d.paidDate || todayISO() : "" })
                    }
                    className={CHECKBOX}
                  />
                  <Label htmlFor={`${base}-paid`} className="cursor-pointer text-sm font-medium text-ink">
                    {t("form.installments.paid")}
                  </Label>
                </div>
                {d.paid && (
                  <div className="flex min-w-48 flex-1 flex-col gap-2">
                    <Label htmlFor={`${base}-paid-date`} className={FIELD_LABEL}>
                      {t("form.installments.paidDate")}{" "}
                      <span className="font-normal text-ink-muted">{t("form.optional")}</span>
                    </Label>
                    <DatePicker
                      id={`${base}-paid-date`}
                      value={d.paidDate}
                      onChange={(v) => update(d.id, { paidDate: v })}
                      placeholder={t("form.installments.paidDatePlaceholder")}
                      className={FIELD}
                    />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <button type="button" onClick={add} className={cn(CTA_SECONDARY, "h-11")}>
          <PlusIcon aria-hidden="true" className="size-4" />
          {t("form.installments.add")}
        </button>
        {cost > 0 && (
          <p className="flex flex-wrap items-center gap-x-3 text-sm text-ink-muted" role="status">
            <span>
              {diff === 0
                ? t("form.installments.sumOk")
                : t("form.installments.sumHint", { sum: formatMoney(sum, lang), cost: formatMoney(cost, lang) })}
            </span>
            {diff !== 0 && (
              <button
                type="button"
                onClick={adjust}
                className="min-h-11 font-medium text-ink underline decoration-lilac decoration-2 underline-offset-4 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac"
              >
                {t("form.installments.adjust")}
              </button>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
