"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import { roleLabel } from "@/components/members/roles";
import {
  PLAN_BUTTON_FOCUS,
  PLAN_FIELD,
  PLAN_HELP,
  PLAN_LABEL,
} from "@/components/plan/create-plan-dialog";
import {
  TASK_STATUSES,
  applyTaskDetails,
  taskDetailsOf,
  type TaskDetails,
  type TaskStatus,
} from "@/components/plan/task-model";
import { useRestoreFocus } from "@/components/timeline/use-restore-focus";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { replaceStepTasks } from "@/lib/firebase/mutations";
import { mapMember, membersQuery } from "@/lib/firebase/plans";
import { useAuth } from "@/lib/hooks/use-auth";
import { useCollection } from "@/lib/hooks/use-collection";
import type { PlanMember, PlanStep, StepTask } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Opción seleccionable (estado o miembro): borde morado de 2 px y fondo lavanda al elegirla. */
const OPTION =
  "flex min-h-11 w-full items-center justify-center rounded-xl border-2 border-line bg-raised px-3 py-2 text-center text-sm font-medium text-ink-strong transition-colors motion-reduce:transition-none peer-checked:border-lilac peer-checked:bg-lilac-soft peer-focus-visible:ring-2 peer-focus-visible:ring-lilac";

interface AssigneeChoice {
  userId: string;
  /** Lo que se muestra en el botón. */
  label: string;
  /** Lo que se guarda como texto del responsable. */
  stored: string;
}

/**
 * Detalles de una tarea en un diálogo: estado, responsable, fecha límite y
 * notas. Controlado por quien lo usa (la tarjeta del paso). El formulario solo
 * se monta con el diálogo abierto, así que la lista de miembros se pide
 * únicamente entonces.
 */
export function TaskDetailsDialog({
  planId,
  step,
  task,
  title,
  onClose,
}: {
  planId: string;
  step: PlanStep;
  /** Tarea abierta; `null` = diálogo cerrado. */
  task: StepTask | null;
  /** Título para mostrar (ya traducido). */
  title: string;
  onClose: () => void;
}) {
  const { t } = useTranslation("plan");
  const restoreFocus = useRestoreFocus();
  return (
    <Dialog open={task !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="gap-0 p-5 sm:p-7"
        onOpenAutoFocus={restoreFocus.onOpenAutoFocus}
        onCloseAutoFocus={restoreFocus.onCloseAutoFocus}
      >
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="text-xl sm:text-2xl">{t("task.dialog.title")}</DialogTitle>
          <DialogDescription className="break-words">{title}</DialogDescription>
        </DialogHeader>
        {task && <TaskDetailsForm planId={planId} step={step} task={task} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function TaskDetailsForm({
  planId,
  step,
  task,
  onDone,
}: {
  planId: string;
  step: PlanStep;
  task: StepTask;
  onDone: () => void;
}) {
  const { t } = useTranslation("plan");
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [draft, setDraft] = React.useState<TaskDetails>(() => taskDetailsOf(task));
  const [saving, setSaving] = React.useState(false);

  const membersRef = React.useMemo(() => membersQuery(planId), [planId]);
  const { data: members } = useCollection(membersRef, mapMember);

  // Primero «Yo» y luego el resto de miembros que ya están en el plan.
  const choices = React.useMemo(() => {
    const list: AssigneeChoice[] = [];
    if (uid) {
      const stored = user?.displayName?.trim() || user?.email || t("task.assignee.me");
      list.push({ userId: uid, label: t("task.assignee.me"), stored });
    }
    for (const m of members as PlanMember[]) {
      if (m.status !== "accepted" || m.userId === uid) continue;
      const name = m.invitedEmail || roleLabel(m.role, t);
      list.push({ userId: m.userId, label: name, stored: name });
    }
    return list;
  }, [members, uid, user, t]);

  const set = <K extends keyof TaskDetails>(key: K, value: TaskDetails[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  function pick(choice: AssigneeChoice) {
    setDraft((d) =>
      d.assigneeId === choice.userId
        ? { ...d, assignee: "", assigneeId: null }
        : { ...d, assignee: choice.stored, assigneeId: choice.userId }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await replaceStepTasks(planId, step, applyTaskDetails(step.tasks, task.id, draft));
      onDone();
    } catch {
      toast.error(t("task.errors.save"));
      setSaving(false);
    }
  }

  const id = `task-${task.id}`;

  return (
    <form onSubmit={handleSubmit}>
      <div className="mt-5 flex flex-col gap-5">
        <fieldset className="flex flex-col gap-1.5">
          <legend className={cn(PLAN_LABEL, "mb-1.5")}>{t("task.status.label")}</legend>
          <div className="grid grid-cols-3 gap-2">
            {TASK_STATUSES.map((value: TaskStatus) => (
              <label key={value} className="block cursor-pointer">
                <input
                  type="radio"
                  name={`${id}-status`}
                  value={value}
                  checked={draft.status === value}
                  onChange={() => set("status", value)}
                  className="peer sr-only"
                />
                <span className={OPTION}>{t(`task.status.${value}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-assignee`} className={PLAN_LABEL}>
            {t("task.assignee.label")}
          </Label>
          {choices.length > 0 && (
            <div role="group" aria-label={t("task.assignee.members")} className="flex flex-wrap gap-2">
              {choices.map((choice) => {
                const on = draft.assigneeId === choice.userId;
                return (
                  <button
                    key={choice.userId}
                    type="button"
                    aria-pressed={on}
                    onClick={() => pick(choice)}
                    className={cn(
                      "min-h-11 max-w-full truncate rounded-full border-2 px-4 text-sm font-medium text-ink-strong outline-none transition-colors focus-visible:ring-2 focus-visible:ring-lilac motion-reduce:transition-none",
                      on ? "border-lilac bg-lilac-soft" : "border-line bg-raised hover:bg-lilac-soft"
                    )}
                  >
                    {choice.label}
                  </button>
                );
              })}
            </div>
          )}
          <Input
            id={`${id}-assignee`}
            value={draft.assignee}
            maxLength={60}
            onChange={(e) => setDraft((d) => ({ ...d, assignee: e.target.value, assigneeId: null }))}
            placeholder={t("task.assignee.placeholder")}
            aria-describedby={`${id}-assignee-help`}
            className={PLAN_FIELD}
          />
          <p id={`${id}-assignee-help`} className={PLAN_HELP}>
            {t("task.assignee.help")}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-date`} className={PLAN_LABEL}>
            {t("task.dueDate.label")}
          </Label>
          <DatePicker
            id={`${id}-date`}
            value={draft.dueDate}
            onChange={(value) => set("dueDate", value)}
            placeholder={t("task.dueDate.placeholder")}
            className={PLAN_FIELD}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-notes`} className={PLAN_LABEL}>
            {t("task.notes.label")}
          </Label>
          <Textarea
            id={`${id}-notes`}
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder={t("task.notes.placeholder")}
            rows={3}
            className="min-h-20 rounded-xl border-line-strong bg-field text-base text-ink-strong shadow-none placeholder:text-ink-placeholder focus-visible:ring-lilac focus-visible:ring-offset-0 sm:text-sm"
          />
        </div>
      </div>

      <DialogFooter className="mt-7 gap-2 sm:gap-3">
        <DialogClose asChild>
          <button type="button" className={cn(CTA_SECONDARY, PLAN_BUTTON_FOCUS, "h-11 sm:h-10")}>
            {t("task.actions.cancel")}
          </button>
        </DialogClose>
        <button type="submit" disabled={saving} className={cn(CTA_PRIMARY, PLAN_BUTTON_FOCUS)}>
          {saving && <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />}
          {t("task.actions.save")}
        </button>
      </DialogFooter>
    </form>
  );
}
