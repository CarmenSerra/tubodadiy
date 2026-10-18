"use client";

import * as React from "react";
import { CameraIcon, Loader2, PlusIcon, SparklesIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CeremonySection } from "@/components/ceremony/section";
import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import { ListBody } from "@/components/dayof/ui";
import {
  CHECKBOX,
  DeleteIconButton,
  FIELD,
  FIELD_LABEL,
  SELECT_CONTENT,
  SELECT_ITEM,
  SELECT_TRIGGER,
} from "@/components/guests/brand-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlanContext } from "@/lib/context/plan-context";
import {
  SHOT_GROUPS,
  SUGGESTED_SHOTS,
  groupShots,
  isShotGroup,
  shotLabel,
  shotProgress,
  suggestedShotId,
  type Shot,
  type ShotGroup,
} from "@/lib/dayof-model";
import {
  addSuggestedShots,
  createDayOfItem,
  deleteDayOfItem,
  restoreDayOfItem,
  setShotChecked,
} from "@/lib/firebase/dayof";
import { toastWithUndo } from "@/lib/undo-toast";
import { cn } from "@/lib/utils";

/** «Fotos clave»: checklist agrupada para pasársela al fotógrafo, con plantilla sugerida. */
export function ShotsSection({
  shots,
  loading,
  error,
}: {
  shots: Shot[];
  loading: boolean;
  error: string | null;
}) {
  const { t } = useTranslation("dayof");
  const { planId } = usePlanContext();
  const [loadingTemplate, setLoadingTemplate] = React.useState(false);
  const progress = shotProgress(shots);
  const groups = React.useMemo(() => groupShots(shots), [shots]);
  const presentIds = React.useMemo(() => new Set(shots.map((s) => s.id)), [shots]);
  const missing = SUGGESTED_SHOTS.filter((s) => !presentIds.has(suggestedShotId(s.key))).length;
  const hasSuggested = missing < SUGGESTED_SHOTS.length;

  async function loadTemplate() {
    setLoadingTemplate(true);
    try {
      const added = await addSuggestedShots(planId, [...presentIds]);
      toast.success(t("shots.template.loaded", { count: added }));
    } catch {
      toast.error(t("shots.errors.template"));
    } finally {
      setLoadingTemplate(false);
    }
  }

  async function toggle(shot: Shot, checked: boolean) {
    try {
      await setShotChecked(planId, shot.id, checked);
    } catch {
      toast.error(t("shots.errors.update"));
    }
  }

  async function remove(shot: Shot) {
    try {
      await deleteDayOfItem(planId, "shots", shot.id);
      toastWithUndo(t("shots.deleted"), () => restoreDayOfItem(planId, "shots", shot));
    } catch {
      toast.error(t("shots.errors.delete"));
    }
  }

  const templateButton =
    missing > 0 ? (
      <button
        type="button"
        onClick={() => void loadTemplate()}
        disabled={loadingTemplate}
        className={cn(shots.length === 0 ? CTA_PRIMARY : CTA_SECONDARY, "disabled:opacity-60")}
      >
        {loadingTemplate ? (
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <SparklesIcon aria-hidden="true" className="size-4" />
        )}
        {hasSuggested ? t("shots.template.restore", { count: missing }) : t("shots.template.load")}
      </button>
    ) : null;

  return (
    <CeremonySection
      id="fotos"
      icon={<CameraIcon />}
      title={t("shots.title")}
      description={t("shots.description")}
      action={shots.length > 0 ? templateButton : undefined}
    >
      <ListBody
        loading={loading}
        error={error}
        empty={shots.length === 0}
        emptyText={t("shots.empty")}
        emptyAction={templateButton}
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink-muted" data-testid="shots-progress">
            {t("shots.progress", { done: progress.done, total: progress.total })}
          </p>
          <div
            role="img"
            aria-label={t("shots.progressBar", { percent: progress.percent })}
            className="h-3 w-full overflow-hidden rounded-full bg-track"
          >
            <div
              className="h-full rounded-full bg-green-solid transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {groups.map(({ group, items }) => {
            const groupName = t(`shots.groups.${group}`);
            const done = items.filter((i) => i.checked).length;
            return (
              <section key={group} aria-label={groupName} className="overflow-hidden rounded-2xl border border-line">
                <h3 className="flex items-center justify-between gap-3 bg-lilac-soft px-4 py-3 font-display text-lg font-semibold text-ink">
                  {groupName}
                  <span className="text-sm font-normal text-ink-muted">
                    <span className="sr-only">{t("shots.groupDone")} </span>
                    {done}/{items.length}
                  </span>
                </h3>
                <ul>
                  {items.map((shot) => {
                    const label = shotLabel(shot, t);
                    return (
                      <li key={shot.id} className="flex items-center gap-1 border-t border-line pl-4 pr-1 first:border-t-0">
                        <label className="flex min-h-12 min-w-0 flex-1 cursor-pointer items-center gap-3 py-2">
                          <Checkbox
                            checked={shot.checked}
                            onCheckedChange={(v) => void toggle(shot, v === true)}
                            className={CHECKBOX}
                          />
                          <span
                            className={cn(
                              "min-w-0 break-words text-sm",
                              shot.checked ? "text-ink-muted line-through" : "font-medium text-ink-strong"
                            )}
                          >
                            {label}
                          </span>
                        </label>
                        <DeleteIconButton ariaLabel={t("shots.deleteAria", { name: label })} onDelete={() => remove(shot)} />
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </ListBody>
      {!loading && !error && <AddShotForm planId={planId} />}
    </CeremonySection>
  );
}

function AddShotForm({ planId }: { planId: string }) {
  const { t } = useTranslation("dayof");
  const [label, setLabel] = React.useState("");
  const [group, setGroup] = React.useState<ShotGroup>("family");
  const [busy, setBusy] = React.useState(false);
  const uid = React.useId();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = label.trim();
    if (!clean) {
      document.getElementById(`${uid}-label`)?.focus();
      return;
    }
    setBusy(true);
    try {
      await createDayOfItem(planId, "shots", { group, key: "", label: clean, checked: false });
      setLabel("");
      document.getElementById(`${uid}-label`)?.focus();
    } catch {
      toast.error(t("shots.errors.add"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      aria-label={t("shots.addForm.label")}
      className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-end"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Label htmlFor={`${uid}-label`} className={FIELD_LABEL}>
          {t("shots.addForm.item")}
        </Label>
        <Input
          id={`${uid}-label`}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t("shots.addForm.placeholder")}
          autoComplete="off"
          className={FIELD}
        />
      </div>
      <div className="flex flex-col gap-2 sm:w-48">
        <Label htmlFor={`${uid}-group`} className={FIELD_LABEL}>
          {t("shots.addForm.group")}
        </Label>
        <Select value={group} onValueChange={(v) => isShotGroup(v) && setGroup(v)}>
          <SelectTrigger id={`${uid}-group`} className={cn(SELECT_TRIGGER, "w-full")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={SELECT_CONTENT}>
            {SHOT_GROUPS.map((g) => (
              <SelectItem key={g} value={g} className={SELECT_ITEM}>
                {t(`shots.groups.${g}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <button type="submit" disabled={busy} className={cn(CTA_PRIMARY, "disabled:opacity-60 sm:shrink-0")}>
        {busy ? (
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <PlusIcon aria-hidden="true" className="size-4" />
        )}
        {t("shots.addForm.add")}
      </button>
    </form>
  );
}
