"use client";

import * as React from "react";
import { InfoIcon, PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { deleteDish, restoreDish } from "@/components/banquet/banquet-firebase";
import {
  COURSES,
  dietCounts,
  isComing,
  menuNotes,
  type CourseId,
  type Dish,
} from "@/components/banquet/banquet-model";
import { DishFormDialog } from "@/components/banquet/dish-form-dialog";
import { usePlanPermission } from "@/lib/hooks/use-plan-permission";
import { BQ_CARD, BQ_FOCUS, DietChip } from "@/components/banquet/ui";
import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import { DeleteIconButton, EditIconButton } from "@/components/guests/brand-dialog";
import { DietBadges, useDietLabel } from "@/components/diet-icons";
import type { Guest } from "@/lib/types";
import { toastWithUndo } from "@/lib/undo-toast";
import { cn } from "@/lib/utils";

interface DialogState {
  dish?: Dish;
  course: CourseId;
}

/** Pestaña «Menú»: platos por tipo con sus alérgenos y dietas, y avisos amables frente a los invitados. */
export function MenuSection({ planId, dishes, guests }: { planId: string; dishes: Dish[]; guests: Guest[] }) {
  const { canEdit } = usePlanPermission("banquet");
  const { t } = useTranslation("banquet");
  const dietLabel = useDietLabel();
  const [dialog, setDialog] = React.useState<DialogState | null>(null);
  // Se recuerda el último estado para que el diálogo no cambie de contenido mientras se cierra.
  const [shown, setShown] = React.useState<DialogState>({ course: "main" });

  function openDialog(next: DialogState) {
    setShown(next);
    setDialog(next);
  }

  const coming = React.useMemo(() => guests.filter(isComing), [guests]);
  const counts = React.useMemo(() => dietCounts(coming), [coming]);
  const notes = React.useMemo(() => menuNotes(guests, dishes), [guests, dishes]);

  async function handleDelete(dish: Dish) {
    try {
      await deleteDish(planId, dish.id);
      toastWithUndo(t("dish.deleted", { name: dish.name }), () => restoreDish(planId, dish));
    } catch {
      toast.error(t("dish.deleteError"));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {counts.length > 0 && (
        <section aria-labelledby="bq-needs-title" className={cn(BQ_CARD, "p-4 sm:p-5")}>
          <h3 id="bq-needs-title" className="font-display text-lg font-semibold text-ink">
            {t("menu.needs.title")}
          </h3>
          <p className="mt-1 text-sm text-ink-muted">{t("menu.needs.description")}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {counts.map(([id, n]) => (
              <li key={id}>
                <DietChip id={id} count={n} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {notes.length > 0 && (
        <section
          aria-labelledby="bq-notes-title"
          className="rounded-2xl bg-lilac-soft p-4 ring-1 ring-lilac-edge sm:p-5"
        >
          <h3 id="bq-notes-title" className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <InfoIcon aria-hidden="true" className="size-5 shrink-0" />
            {t("menu.notes.title")}
          </h3>
          <p className="mt-1 text-sm text-ink-muted">{t("menu.notes.description")}</p>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-strong">
            {notes.map((n) => (
              <li key={n.need}>
                {t("menu.notes.item", {
                  count: n.guests,
                  diet: dietLabel(n.need),
                  courses: n.courses.map((c) => t(`courses.${c}.name`).toLowerCase()).join(", "),
                })}
              </li>
            ))}
          </ul>
        </section>
      )}

      {COURSES.map((course) => {
        const items = dishes.filter((d) => d.course === course);
        const headingId = `bq-course-${course}`;
        return (
          <section key={course} aria-labelledby={headingId} className={cn(BQ_CARD, "p-4 sm:p-5")}>
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <div className="min-w-0">
                <h3 id={headingId} className="font-display text-lg font-semibold text-ink sm:text-xl">
                  {t(`courses.${course}.name`)}
                </h3>
                <p className="text-sm text-ink-muted">{t(`courses.${course}.hint`)}</p>
              </div>
              {canEdit && (
              <button
                type="button"
                onClick={() => openDialog({ course })}
                className={cn(CTA_SECONDARY, "h-11")}
                aria-label={t("menu.addTo", { course: t(`courses.${course}.name`) })}
              >
                <PlusIcon aria-hidden="true" className="size-4" />
                {t("menu.add")}
              </button>
              )}
            </div>
            {items.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">{t("menu.emptyCourse")}</p>
            ) : (
              <ul className="mt-3 flex flex-col divide-y divide-line">
                {items.map((dish) => (
                  <DishRow
                    key={dish.id}
                    dish={dish}
                    canEdit={canEdit}
                    onEdit={() => openDialog({ dish, course: dish.course })}
                    onDelete={() => handleDelete(dish)}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {canEdit && dishes.length === 0 && (
        <button type="button" onClick={() => openDialog({ course: "main" })} className={cn(CTA_PRIMARY, "self-start", BQ_FOCUS)}>
          <PlusIcon aria-hidden="true" className="size-4" />
          {t("menu.addFirst")}
        </button>
      )}

      {canEdit && (
      <DishFormDialog
        planId={planId}
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        dish={shown.dish}
        defaultCourse={shown.course}
      />
      )}
    </div>
  );
}

function DishRow({
  dish,
  canEdit,
  onEdit,
  onDelete,
}: {
  dish: Dish;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation("banquet");
  return (
    <li className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="break-words font-medium text-ink-strong">{dish.name}</p>
        {dish.notes && <p className="break-words text-sm text-ink-muted">{dish.notes}</p>}
        {(dish.contains.length > 0 || dish.suitableFor.length > 0) && (
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            {dish.contains.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-ink-muted">{t("dish.containsShort")}</span>
                <DietBadges ids={dish.contains} />
              </div>
            )}
            {dish.suitableFor.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-ink-muted">{t("dish.suitableShort")}</span>
                <DietBadges ids={dish.suitableFor} />
              </div>
            )}
          </div>
        )}
      </div>
      {canEdit && (
        <div className="flex shrink-0 items-center">
          <EditIconButton label={t("dish.editNamed", { name: dish.name })} onClick={onEdit} />
          <DeleteIconButton ariaLabel={t("dish.deleteNamed", { name: dish.name })} onDelete={onDelete} />
        </div>
      )}
    </li>
  );
}
