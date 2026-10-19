"use client";

import * as React from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { CTA_SECONDARY } from "@/components/dashboard/ui";
import { Switch } from "@/components/ui/switch";
import { saveMemberPermissions } from "@/lib/firebase/members";
import {
  PLAN_SECTIONS,
  defaultPermissions,
  encodePermissions,
  resolveLevels,
  type PlanSection,
  type SectionLevel,
} from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { PlanMember } from "@/lib/types";

/** Interruptor con su texto; toda la fila es clicable (≥44px). */
function Toggle({
  checked,
  onChange,
  label,
  srLabel,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  srLabel: string;
}) {
  const id = React.useId();
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-2 pr-1 text-sm text-ink">
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        aria-label={srLabel}
        className="data-[state=checked]:bg-cta data-[state=unchecked]:bg-line-strong"
      />
      <span aria-hidden="true">{label}</span>
    </label>
  );
}

/**
 * Qué secciones ve y edita un planner o un familiar. Cada interruptor guarda
 * al momento (las reglas de Firestore solo lo permiten a la pareja).
 */
export function MemberPermissions({
  planId,
  member,
  memberName,
}: {
  planId: string;
  member: PlanMember;
  memberName: string;
}) {
  const { t } = useTranslation("tools");
  const levels = resolveLevels(member.role, member.permissions);
  const [busy, setBusy] = React.useState(false);

  async function save(next: Record<PlanSection, SectionLevel> | string[]) {
    setBusy(true);
    try {
      await saveMemberPermissions(planId, member.userId, Array.isArray(next) ? next : encodePermissions(next));
    } catch {
      toast.error(t("members.permissions.saveError"));
    } finally {
      setBusy(false);
    }
  }

  function setLevel(section: PlanSection, level: SectionLevel) {
    void save({ ...levels, [section]: level });
  }

  return (
    <div role="group" aria-label={t("members.permissions.groupLabel", { name: memberName })} className="mt-3 border-t border-line pt-3">
      <p className="text-sm text-ink-muted">{t("members.permissions.intro")}</p>
      <ul className={cn("mt-2 flex flex-col divide-y divide-line", busy && "opacity-80")}>
        {PLAN_SECTIONS.map((section) => {
          const name = t(`members.sections.${section}`);
          const level = levels[section];
          return (
            <li key={section} className="flex flex-wrap items-center justify-between gap-x-4 py-0.5">
              <span className="min-w-28 text-sm font-medium text-ink-strong">{name}</span>
              <span className="flex items-center gap-3">
                <Toggle
                  checked={level !== "none"}
                  onChange={(on) => setLevel(section, on ? "view" : "none")}
                  label={t("members.permissions.view")}
                  srLabel={t("members.permissions.viewAria", { section: name })}
                />
                <Toggle
                  checked={level === "edit"}
                  onChange={(on) => setLevel(section, on ? "edit" : "view")}
                  label={t("members.permissions.edit")}
                  srLabel={t("members.permissions.editAria", { section: name })}
                />
              </span>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        disabled={busy}
        onClick={() => void save(defaultPermissions(member.role))}
        className={cn(CTA_SECONDARY, "mt-3 h-9 px-4 disabled:opacity-60")}
      >
        {t("members.permissions.reset")}
      </button>
    </div>
  );
}
