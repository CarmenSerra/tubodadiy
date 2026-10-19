"use client";

import * as React from "react";
import { BriefcaseIcon, Loader2, PlusIcon, RotateCcwIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import {
  CHECKBOX,
  DeleteIconButton,
  FIELD,
  FIELD_LABEL,
  SELECT_CONTENT,
  SELECT_ITEM,
  SELECT_TRIGGER,
} from "@/components/guests/brand-dialog";
import { EmptyState, HM_CARD, SectionHeader } from "@/components/honeymoon/ui";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  addPackingItem,
  deletePackingItem,
  restorePackingItem,
  restoreSuggestedPacking,
  setPackingChecked,
} from "@/lib/firebase/honeymoon";
import {
  PACKING_GROUPS,
  PACKING_GROUP_KEY,
  SUGGESTED_PACKING,
  isPackingGroup,
  packingDisplay,
  packingProgress,
  type PackingGroup,
  type PackingItem,
} from "@/lib/honeymoon-model";
import { toastWithUndo } from "@/lib/undo-toast";
import { cn } from "@/lib/utils";
import { usePlanPermission } from "@/lib/hooks/use-plan-permission";

function AddItemForm({ planId, announce }: { planId: string; announce: (message: string) => void }) {
  const { t } = useTranslation("honeymoon");
  const [label, setLabel] = React.useState("");
  const [group, setGroup] = React.useState<PackingGroup>("Otros");
  const [busy, setBusy] = React.useState(false);
  const uid = React.useId();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = label.trim();
    if (!clean) {
      document.getElementById(`${uid}-label`)?.focus();
      return;
    }
    setBusy(true);
    try {
      await addPackingItem(planId, clean, group);
      announce(t("packing.announce.added", { name: clean, group: t(`packing.groups.${PACKING_GROUP_KEY[group]}`) }));
      setLabel("");
      document.getElementById(`${uid}-label`)?.focus();
    } catch {
      toast.error(t("packing.errors.add"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(HM_CARD, "flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:p-5")}
      aria-label={t("packing.addForm.label")}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Label htmlFor={`${uid}-label`} className={FIELD_LABEL}>
          {t("packing.addForm.item")}
        </Label>
        <Input
          id={`${uid}-label`}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t("packing.addForm.placeholder")}
          autoComplete="off"
          className={FIELD}
        />
      </div>
      <div className="flex flex-col gap-2 sm:w-44">
        <Label htmlFor={`${uid}-group`} className={FIELD_LABEL}>
          {t("packing.addForm.group")}
        </Label>
        <Select value={group} onValueChange={(v) => isPackingGroup(v) && setGroup(v)}>
          <SelectTrigger id={`${uid}-group`} className={cn(SELECT_TRIGGER, "w-full")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={SELECT_CONTENT}>
            {PACKING_GROUPS.map((g) => (
              <SelectItem key={g} value={g} className={SELECT_ITEM}>
                {t(`packing.groups.${PACKING_GROUP_KEY[g]}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <button type="submit" disabled={busy} className={cn(CTA_PRIMARY, "sm:shrink-0 disabled:opacity-60")}>
        {busy ? (
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <PlusIcon aria-hidden="true" className="size-4" />
        )}
        {t("packing.addForm.add")}
      </button>
    </form>
  );
}

export function Packing({
  planId,
  items,
  seeded,
  announce,
}: {
  planId: string;
  items: PackingItem[];
  seeded: boolean;
  announce: (message: string) => void;
}) {
  const { t } = useTranslation("honeymoon");
  const { canEdit } = usePlanPermission("honeymoon");
  const [restoring, setRestoring] = React.useState(false);
  const progress = packingProgress(items);
  const present = React.useMemo(() => new Set(items.map((i) => i.id)), [items]);
  const missing = SUGGESTED_PACKING.filter((s) => !present.has(s.id));

  const groups = React.useMemo(
    () =>
      PACKING_GROUPS.map((group) => ({ group, items: items.filter((i) => i.group === group) })).filter(
        (g) => g.items.length > 0
      ),
    [items]
  );

  async function handleToggle(item: PackingItem, checked: boolean) {
    try {
      await setPackingChecked(planId, item.id, checked);
      announce(t(checked ? "packing.announce.packed" : "packing.announce.pending", { name: packingDisplay(item, t).label }));
    } catch {
      toast.error(t("packing.errors.update"));
    }
  }

  async function handleDelete(item: PackingItem) {
    try {
      await deletePackingItem(planId, item.id);
      toastWithUndo(t("packing.toasts.deleted"), () => restorePackingItem(planId, item));
      announce(t("packing.announce.removed", { name: packingDisplay(item, t).label }));
    } catch {
      toast.error(t("packing.errors.delete"));
    }
  }

  async function handleRestoreSuggested() {
    setRestoring(true);
    try {
      await restoreSuggestedPacking(planId, missing.map((m) => m.id));
      toast.success(t("packing.toasts.restored", { count: missing.length }));
    } catch {
      toast.error(t("packing.errors.restore"));
    } finally {
      setRestoring(false);
    }
  }

  const restoreButton =
    canEdit && missing.length > 0 ? (
      <button type="button" onClick={handleRestoreSuggested} disabled={restoring} className={cn(CTA_SECONDARY, "disabled:opacity-60")}>
        {restoring ? (
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <RotateCcwIcon aria-hidden="true" className="size-4" />
        )}
        {seeded ? t("packing.restoreSuggested", { count: missing.length }) : t("packing.loadSuggested")}
      </button>
    ) : null;

  return (
    <section aria-labelledby="hm-maleta-title" className="flex flex-col gap-4">
      <SectionHeader
        id="hm-maleta-title"
        icon={<BriefcaseIcon />}
        title={t("packing.title")}
        description={t("packing.description")}
        actions={items.length > 0 ? restoreButton : undefined}
      />

      {items.length === 0 ? (
        <EmptyState
          scene="montana"
          title={seeded || !canEdit ? t("packing.empty.title") : t("packing.empty.preparingTitle")}
          action={restoreButton}
        >
          {seeded || !canEdit
            ? t("packing.empty.text")
            : t("packing.empty.preparingText")}
        </EmptyState>
      ) : (
        <div className={cn(HM_CARD, "flex flex-col gap-3 p-5 sm:p-6")}>
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
            <div>
              <p className="text-sm text-ink-muted">{t("packing.progress.label")}</p>
              <p className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl" data-testid="packing-progress">
                {t("packing.progress.value", { done: progress.done, total: progress.total })}
              </p>
            </div>
            <p className="pb-1 text-sm text-ink-muted">
              {progress.done === progress.total
                ? t("packing.progress.allDone")
                : t("packing.progress.remaining", { count: progress.total - progress.done })}
            </p>
          </div>
          <div
            role="img"
            aria-label={t("packing.progress.barLabel", { percent: progress.percent })}
            className="h-3 w-full overflow-hidden rounded-full bg-track"
          >
            <div
              className="h-full rounded-full bg-green-solid transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}

      {canEdit && <AddItemForm planId={planId} announce={announce} />}

      {groups.length > 0 && (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {groups.map(({ group, items: groupItems }) => {
            const groupName = t(`packing.groups.${PACKING_GROUP_KEY[group]}`);
            const done = groupItems.filter((i) => i.checked).length;
            return (
              <section key={group} aria-label={groupName} className={cn(HM_CARD, "overflow-hidden")}>
                <h3 className="flex items-center justify-between gap-3 bg-lilac-soft px-4 py-3 font-display text-lg font-semibold text-ink sm:px-5">
                  {groupName}
                  <span className="text-sm font-normal text-ink-muted">
                    <span className="sr-only">{t("packing.groupDone")} </span>
                    {done}/{groupItems.length}
                  </span>
                </h3>
                <ul>
                  {groupItems.map((item) => {
                    const shown = packingDisplay(item, t);
                    return (
                    <li key={item.id} className="flex items-center gap-1 border-t border-line first:border-t-0 pl-4 pr-1 sm:pl-5">
                      <label className={cn("flex min-h-12 min-w-0 flex-1 items-start gap-3 py-3", canEdit && "cursor-pointer")}>
                        <Checkbox
                          checked={item.checked}
                          disabled={!canEdit}
                          onCheckedChange={(v) => handleToggle(item, v === true)}
                          className={cn(CHECKBOX, "mt-0.5")}
                        />
                        <span className="min-w-0">
                          <span
                            className={cn(
                              "block break-words text-sm",
                              item.checked ? "text-ink-muted line-through" : "font-medium text-ink-strong"
                            )}
                          >
                            {shown.label}
                          </span>
                          {shown.note && <span className="mt-0.5 block text-xs text-ink-muted">{shown.note}</span>}
                        </span>
                      </label>
                      {canEdit && (
                        <DeleteIconButton ariaLabel={t("packing.deleteAria", { name: shown.label })} onDelete={() => handleDelete(item)} />
                      )}
                    </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
