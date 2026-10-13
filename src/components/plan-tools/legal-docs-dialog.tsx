"use client";

import * as React from "react";
import { FileCheck2Icon, InfoIcon, LandmarkIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CTA_PRIMARY, CTA_SECONDARY, MiniBar } from "@/components/dashboard/ui";
import { CHECKBOX } from "@/components/guests/brand-dialog";
import {
  SITUATIONS,
  legalGroups,
  legalIntroKey,
  requiredLegalDocIds,
  situationId,
} from "@/components/plan-tools/legal-docs-model";
import { ToolDialog } from "@/components/plan-tools/tool-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { usePlanContext } from "@/lib/context/plan-context";
import { setLegalDocChecked } from "@/lib/firebase/plan-tools";
import { cn } from "@/lib/utils";

export function LegalDocsDialog({
  open,
  onOpenChange,
  onChooseCeremony,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Abre el selector de ceremonia (y, al guardarlo, vuelve a esta guía). */
  onChooseCeremony: () => void;
}) {
  const { t } = useTranslation("tools");
  return (
    <ToolDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("planTools.legal.title")}
      description={t("planTools.legal.description")}
      icon={<FileCheck2Icon />}
      footer={
        <button type="button" onClick={() => onOpenChange(false)} className={CTA_SECONDARY}>
          {t("planTools.actions.close")}
        </button>
      }
    >
      {open && <LegalDocsBody onChooseCeremony={onChooseCeremony} />}
    </ToolDialog>
  );
}

export function Disclaimer() {
  const { t } = useTranslation("tools");
  return (
    <p
      role="note"
      className="flex items-start gap-2.5 rounded-xl border border-line bg-lilac-soft px-3.5 py-3 text-sm text-ink"
    >
      <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>
        <span className="font-medium">{t("planTools.legal.disclaimer.title")}</span>{" "}
        {t("planTools.legal.disclaimer.text")}
      </span>
    </p>
  );
}

export function LegalDocsBody({ onChooseCeremony }: { onChooseCeremony: () => void }) {
  const { t } = useTranslation("tools");
  const { planId, plan } = usePlanContext();
  const type = plan?.ceremonyType ?? null;
  const done = React.useMemo(() => plan?.legalDocsDone ?? [], [plan?.legalDocsDone]);

  if (!plan) return null;

  if (!type) {
    return (
      <div className="flex flex-col gap-5">
        <Disclaimer />
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-line bg-surface p-5">
          <h3 className="font-display text-lg font-semibold text-ink">
            {t("planTools.legal.noType.title")}
          </h3>
          <p className="text-sm text-ink-muted">{t("planTools.legal.noType.text")}</p>
          <button type="button" onClick={onChooseCeremony} className={CTA_PRIMARY}>
            <LandmarkIcon aria-hidden="true" className="size-4" />
            {t("planTools.legal.noType.action")}
          </button>
        </div>
      </div>
    );
  }

  const groups = legalGroups(type, done);
  const required = requiredLegalDocIds(type, done);
  const doneRequired = required.filter((id) => done.includes(id)).length;
  const percent = required.length ? Math.round((doneRequired / required.length) * 100) : 0;

  async function toggle(id: string, checked: boolean) {
    try {
      await setLegalDocChecked(planId, id, checked);
    } catch {
      toast.error(t("planTools.legal.toastError"));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Disclaimer />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-sm text-ink-muted">
            {t("planTools.legal.ceremony")} <span className="font-medium text-ink">{t(`planTools.ceremony.options.${type}.label`)}</span>
          </p>
          <button
            type="button"
            onClick={onChooseCeremony}
            className="text-sm font-medium text-ink underline decoration-lilac decoration-2 underline-offset-4 hover:opacity-80 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            {t("planTools.legal.changeCeremony")}
          </button>
        </div>
        <p className="text-sm text-ink-strong">{t(`planTools.legal.intro.${legalIntroKey(type)}`)}</p>
        <div className="flex flex-col gap-1.5" role="group" aria-label={t("planTools.legal.progressLabel")}>
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium text-ink">
              {t("planTools.legal.progress", { done: doneRequired, count: required.length })}
            </span>
            <span className="tabular-nums text-ink-muted">{percent}%</span>
          </div>
          <MiniBar value={percent} tone="sage" />
        </div>
      </div>

      <fieldset className="flex flex-col gap-2.5 rounded-2xl border border-line p-4">
        <legend className="px-1.5 text-sm font-medium text-ink">{t("planTools.legal.situationsLegend")}</legend>
        {SITUATIONS.map((s) => {
          const id = situationId(s.id);
          const checked = done.includes(id);
          return (
            <label key={s.id} className="flex cursor-pointer items-start gap-3">
              <Checkbox
                checked={checked}
                onCheckedChange={(v) => void toggle(id, Boolean(v))}
                className={cn(CHECKBOX, "mt-0.5")}
              />
              <span className="flex flex-col gap-0.5 text-sm">
                <span className="text-ink-strong">{t(`planTools.legal.situations.${s.id}.label`)}</span>
                <span className="text-ink-muted">{t(`planTools.legal.situations.${s.id}.hint`)}</span>
              </span>
            </label>
          );
        })}
      </fieldset>

      {groups.map((group) => (
        <section key={group.id} aria-labelledby={`legal-group-${group.id}`} className="flex flex-col gap-1">
          <h3 id={`legal-group-${group.id}`} className="font-display text-lg font-semibold text-ink">
            {t(`planTools.legal.groups.${group.id}`)}
          </h3>
          <ul className="flex flex-col divide-y divide-line">
            {group.docs.map((doc) => {
              const checked = done.includes(doc.id);
              return (
                <li key={doc.id}>
                  <label className="flex cursor-pointer items-start gap-3 py-3">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => void toggle(doc.id, Boolean(v))}
                      className={cn(CHECKBOX, "mt-0.5")}
                    />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          checked ? "text-ink-muted line-through" : "text-ink-strong"
                        )}
                      >
                        {t(`planTools.legal.docs.${group.id}.${doc.id}.title`)}
                        {doc.optional && (
                          <span className="ml-2 rounded-full bg-lilac-soft px-2 py-0.5 align-middle text-xs font-medium text-ink no-underline">
                            {t("planTools.legal.optional")}
                          </span>
                        )}
                      </span>
                      <span className="text-sm text-ink-muted">{t(`planTools.legal.docs.${group.id}.${doc.id}.hint`)}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
