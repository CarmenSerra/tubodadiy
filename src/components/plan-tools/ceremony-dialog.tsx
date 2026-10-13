"use client";

import * as React from "react";
import { InfoIcon, Loader2, LandmarkIcon, ShieldCheckIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import { CEREMONY_OPTIONS, type CeremonyOption } from "@/components/plan-tools/ceremony-model";
import { ToolDialog } from "@/components/plan-tools/tool-dialog";
import { usePlanContext } from "@/lib/context/plan-context";
import { saveCeremonyType } from "@/lib/firebase/plan-tools";
import type { CeremonyType } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CeremonyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("tools");
  return (
    <ToolDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("planTools.ceremony.title")}
      description={t("planTools.ceremony.description")}
      icon={<LandmarkIcon />}
    >
      {open && <CeremonyForm onClose={() => onOpenChange(false)} />}
    </ToolDialog>
  );
}

function CeremonyForm({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation("tools");
  const { planId, plan } = usePlanContext();
  const saved = plan?.ceremonyType ?? null;
  const [picked, setPicked] = React.useState<CeremonyType | null>(saved);
  const [saving, setSaving] = React.useState<"save" | "clear" | null>(null);

  async function commit(type: CeremonyType | null, mode: "save" | "clear") {
    setSaving(mode);
    try {
      await saveCeremonyType(planId, type);
      toast.success(type ? t("planTools.ceremony.toasts.saved") : t("planTools.ceremony.toasts.cleared"));
      onClose();
    } catch {
      toast.error(t("planTools.ceremony.toasts.error"));
      setSaving(null);
    }
  }

  const unchanged = picked === saved;

  return (
    <form
      id="ceremony-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (picked && !unchanged) void commit(picked, "save");
      }}
      className="flex flex-col gap-5"
    >
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">{t("planTools.ceremony.title")}</legend>
        {CEREMONY_OPTIONS.map((option) => (
          <CeremonyCard
            key={option.value}
            option={option}
            checked={picked === option.value}
            onSelect={() => setPicked(option.value)}
          />
        ))}
      </fieldset>

      <p className="flex items-start gap-2 text-sm text-ink-muted">
        <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          {t("planTools.ceremony.disclaimer")}
        </span>
      </p>

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
        {saved && (
          <button
            type="button"
            disabled={saving !== null}
            onClick={() => void commit(null, "clear")}
            className={cn(CTA_SECONDARY, "sm:mr-auto")}
          >
            {saving === "clear" && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
            {t("planTools.ceremony.clear")}
          </button>
        )}
        <button type="button" onClick={onClose} className={CTA_SECONDARY}>
          {t("planTools.actions.cancel")}
        </button>
        <button type="submit" disabled={!picked || unchanged || saving !== null} className={cn(CTA_PRIMARY, "disabled:opacity-50")}>
          {saving === "save" && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          {t("planTools.actions.save")}
        </button>
      </div>
    </form>
  );
}

function CeremonyCard({
  option,
  checked,
  onSelect,
}: {
  option: CeremonyOption;
  checked: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation("tools");
  const LegalIcon = option.legalByItself ? ShieldCheckIcon : InfoIcon;
  const base = `planTools.ceremony.options.${option.value}`;
  const implies = t(`${base}.implies`, { returnObjects: true }) as unknown as string[];
  return (
    <label
      className={cn(
        "relative flex cursor-pointer flex-col gap-3 rounded-2xl border bg-surface p-4 transition-colors motion-reduce:transition-none sm:p-5",
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-lilac has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-surface",
        checked ? "border-lilac bg-lilac-soft ring-1 ring-lilac" : "border-line hover:border-line-strong"
      )}
    >
      <input
        type="radio"
        name="ceremony-type"
        value={option.value}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      <span className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
            checked ? "border-lilac" : "border-line-strong"
          )}
        >
          {checked && <span className="size-2.5 rounded-full bg-cta" />}
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="font-display text-lg font-semibold leading-snug text-ink">{t(`${base}.label`)}</span>
          <span className="text-sm text-ink-strong">{t(`${base}.tagline`)}</span>
        </span>
      </span>
      <ul className="ml-8 flex list-disc flex-col gap-1.5 pl-4 text-sm text-ink-muted marker:text-lilac">
        {implies.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <span className="ml-8 flex items-start gap-2 rounded-xl border border-line bg-field px-3 py-2.5 text-sm text-ink">
        <LegalIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          <span className="font-medium">{t(`${base}.legalBadge`)}. </span>
          {t(`${base}.legal`)}
        </span>
      </span>
    </label>
  );
}
