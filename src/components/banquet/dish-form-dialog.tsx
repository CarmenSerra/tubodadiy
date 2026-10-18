"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { addDish, updateDish } from "@/components/banquet/banquet-firebase";
import { COURSES, isCourseId, type CourseId, type Dish } from "@/components/banquet/banquet-model";
import { BQ_NATIVE_SELECT, togglePill } from "@/components/banquet/ui";
import { DietIcon, useDietLabel } from "@/components/diet-icons";
import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import { DIALOG_CONTENT, DIALOG_TITLE, FIELD, FIELD_LABEL } from "@/components/guests/brand-dialog";
import { useRestoreFocus } from "@/components/timeline/use-restore-focus";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ALLERGEN_IDS, DIET_ONLY_IDS, type AllergenId, type DietId, type DietOnlyId } from "@/lib/diets";
import { cn } from "@/lib/utils";

interface DishFormDialogProps {
  planId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Plato a editar; sin él se crea uno nuevo. */
  dish?: Dish;
  /** Tipo con el que arranca un plato nuevo. */
  defaultCourse: CourseId;
}

export function DishFormDialog({ planId, open, onOpenChange, dish, defaultCourse }: DishFormDialogProps) {
  const restoreFocus = useRestoreFocus();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className={DIALOG_CONTENT}
        onOpenAutoFocus={restoreFocus.onOpenAutoFocus}
        onCloseAutoFocus={restoreFocus.onCloseAutoFocus}
      >
        {/* Montado solo mientras está abierto: los campos arrancan siempre con valores nuevos. */}
        {open && (
          <DishForm planId={planId} dish={dish} defaultCourse={defaultCourse} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function toggle<T extends string>(list: T[], id: T): T[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

function DietPicker<T extends DietId>({
  legend,
  hint,
  ids,
  value,
  onChange,
}: {
  legend: string;
  hint: string;
  ids: readonly T[];
  value: T[];
  onChange: (next: T[]) => void;
}) {
  const label = useDietLabel();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={FIELD_LABEL}>{legend}</legend>
      <p className="text-xs text-ink-muted">{hint}</p>
      <div className="flex flex-wrap gap-2">
        {ids.map((id) => {
          const selected = value.includes(id);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(toggle(value, id))}
              className={togglePill(selected)}
            >
              <DietIcon id={id} size={16} decorative />
              {label(id)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function DishForm({
  planId,
  dish,
  defaultCourse,
  onDone,
}: {
  planId: string;
  dish?: Dish;
  defaultCourse: CourseId;
  onDone: () => void;
}) {
  const { t } = useTranslation("banquet");
  const isEdit = Boolean(dish);
  const [course, setCourse] = React.useState<CourseId>(dish?.course ?? defaultCourse);
  const [name, setName] = React.useState(dish?.name ?? "");
  const [notes, setNotes] = React.useState(dish?.notes ?? "");
  const [contains, setContains] = React.useState<AllergenId[]>(dish?.contains ?? []);
  const [suitableFor, setSuitableFor] = React.useState<DietOnlyId[]>(dish?.suitableFor ?? []);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const input = { course, name: name.trim(), notes: notes.trim(), contains, suitableFor };
      if (dish) {
        await updateDish(planId, dish.id, input);
        toast.success(t("dish.updated"));
      } else {
        await addDish(planId, input);
        toast.success(t("dish.added"));
      }
      onDone();
    } catch {
      toast.error(t("dish.saveError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle className={DIALOG_TITLE}>{isEdit ? t("dish.editTitle") : t("dish.newTitle")}</DialogTitle>
      </DialogHeader>
      <div className="mt-5 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="dish-course" className={FIELD_LABEL}>
            {t("dish.course")}
          </Label>
          <select
            id="dish-course"
            value={course}
            onChange={(e) => isCourseId(e.target.value) && setCourse(e.target.value)}
            className={BQ_NATIVE_SELECT}
          >
            {COURSES.map((c) => (
              <option key={c} value={c}>
                {t(`courses.${c}.name`)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dish-name" className={FIELD_LABEL}>
            {t("dish.name")}
          </Label>
          <Input
            id="dish-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("dish.namePlaceholder")}
            maxLength={120}
            required
            autoFocus
            autoComplete="off"
            className={FIELD}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dish-notes" className={FIELD_LABEL}>
            {t("dish.notes")}
          </Label>
          <Input
            id="dish-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("dish.notesPlaceholder")}
            maxLength={200}
            autoComplete="off"
            className={FIELD}
          />
        </div>
        <DietPicker
          legend={t("dish.contains")}
          hint={t("dish.containsHint")}
          ids={ALLERGEN_IDS}
          value={contains}
          onChange={setContains}
        />
        <DietPicker
          legend={t("dish.suitableFor")}
          hint={t("dish.suitableForHint")}
          ids={DIET_ONLY_IDS}
          value={suitableFor}
          onChange={setSuitableFor}
        />
      </div>
      <DialogFooter className="mt-6 gap-2 sm:gap-3">
        <button type="button" onClick={onDone} className={cn(CTA_SECONDARY, "h-11")}>
          {t("actions.cancel")}
        </button>
        <button type="submit" disabled={submitting} className={cn(CTA_PRIMARY, "disabled:opacity-60")}>
          {submitting && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          {t("actions.save")}
        </button>
      </DialogFooter>
    </form>
  );
}
