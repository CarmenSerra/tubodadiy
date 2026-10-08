"use client";

import * as React from "react";
import { BriefcaseIcon, Loader2, PlusIcon, RotateCcwIcon } from "lucide-react";
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
  SUGGESTED_PACKING,
  isPackingGroup,
  packingProgress,
  type PackingGroup,
  type PackingItem,
} from "@/lib/honeymoon-model";
import { toastWithUndo } from "@/lib/undo-toast";
import { cn } from "@/lib/utils";

function AddItemForm({ planId, announce }: { planId: string; announce: (message: string) => void }) {
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
      announce(`«${clean}» añadido a ${group}`);
      setLabel("");
      document.getElementById(`${uid}-label`)?.focus();
    } catch {
      toast.error("No se ha podido añadir el artículo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(HM_CARD, "flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:p-5")}
      aria-label="Añadir a la maleta"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Label htmlFor={`${uid}-label`} className={FIELD_LABEL}>
          Añadir a la lista
        </Label>
        <Input
          id={`${uid}-label`}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Libro, gafas de snorkel…"
          autoComplete="off"
          className={FIELD}
        />
      </div>
      <div className="flex flex-col gap-2 sm:w-44">
        <Label htmlFor={`${uid}-group`} className={FIELD_LABEL}>
          Grupo
        </Label>
        <Select value={group} onValueChange={(v) => isPackingGroup(v) && setGroup(v)}>
          <SelectTrigger id={`${uid}-group`} className={cn(SELECT_TRIGGER, "w-full")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={SELECT_CONTENT}>
            {PACKING_GROUPS.map((g) => (
              <SelectItem key={g} value={g} className={SELECT_ITEM}>
                {g}
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
        Añadir
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
      announce(`«${item.label}»: ${checked ? "en la maleta" : "pendiente"}`);
    } catch {
      toast.error("No se ha podido actualizar el artículo.");
    }
  }

  async function handleDelete(item: PackingItem) {
    try {
      await deletePackingItem(planId, item.id);
      toastWithUndo("Artículo eliminado", () => restorePackingItem(planId, item));
      announce(`«${item.label}» eliminado de la lista`);
    } catch {
      toast.error("No se ha podido eliminar el artículo.");
    }
  }

  async function handleRestoreSuggested() {
    setRestoring(true);
    try {
      await restoreSuggestedPacking(planId, missing.map((m) => m.id));
      toast.success(missing.length === 1 ? "Artículo sugerido recuperado" : "Artículos sugeridos recuperados");
    } catch {
      toast.error("No se ha podido cargar la lista sugerida.");
    } finally {
      setRestoring(false);
    }
  }

  const restoreButton =
    missing.length > 0 ? (
      <button type="button" onClick={handleRestoreSuggested} disabled={restoring} className={cn(CTA_SECONDARY, "disabled:opacity-60")}>
        {restoring ? (
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <RotateCcwIcon aria-hidden="true" className="size-4" />
        )}
        {seeded ? `Recuperar sugeridos (${missing.length})` : "Cargar lista sugerida"}
      </button>
    ) : null;

  return (
    <section aria-labelledby="hm-maleta-title" className="flex flex-col gap-4">
      <SectionHeader
        id="hm-maleta-title"
        icon={<BriefcaseIcon />}
        title="Maleta y papeles"
        description="Todo lo que no se puede olvidar, para ir tachando."
        actions={items.length > 0 ? restoreButton : undefined}
      />

      {items.length === 0 ? (
        <EmptyState
          scene="montana"
          title={seeded ? "La maleta está vacía" : "Preparando tu lista…"}
          action={restoreButton}
        >
          {seeded
            ? "Has quitado todo de la lista. Puedes recuperar los artículos sugeridos o añadir los tuyos."
            : "Estamos dejando lista una maleta con lo típico: papeles, salud, ropa y tecnología."}
        </EmptyState>
      ) : (
        <div className={cn(HM_CARD, "flex flex-col gap-3 p-5 sm:p-6")}>
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
            <div>
              <p className="text-sm text-ink-muted">Maleta preparada</p>
              <p className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl" data-testid="packing-progress">
                {progress.done} de {progress.total}
              </p>
            </div>
            <p className="pb-1 text-sm text-ink-muted">
              {progress.done === progress.total
                ? "Todo listo para despegar."
                : `Faltan ${progress.total - progress.done} ${progress.total - progress.done === 1 ? "cosa" : "cosas"}.`}
            </p>
          </div>
          <div
            role="img"
            aria-label={`Maleta preparada al ${progress.percent}%`}
            className="h-3 w-full overflow-hidden rounded-full bg-track"
          >
            <div
              className="h-full rounded-full bg-green-solid transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}

      <AddItemForm planId={planId} announce={announce} />

      {groups.length > 0 && (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {groups.map(({ group, items: groupItems }) => {
            const done = groupItems.filter((i) => i.checked).length;
            return (
              <section key={group} aria-label={group} className={cn(HM_CARD, "overflow-hidden")}>
                <h3 className="flex items-center justify-between gap-3 bg-lilac-soft px-4 py-3 font-display text-lg font-semibold text-ink sm:px-5">
                  {group}
                  <span className="text-sm font-normal text-ink-muted">
                    <span className="sr-only">Preparados: </span>
                    {done}/{groupItems.length}
                  </span>
                </h3>
                <ul>
                  {groupItems.map((item) => (
                    <li key={item.id} className="flex items-center gap-1 border-t border-line first:border-t-0 pl-4 pr-1 sm:pl-5">
                      <label className="flex min-h-12 min-w-0 flex-1 cursor-pointer items-start gap-3 py-3">
                        <Checkbox
                          checked={item.checked}
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
                            {item.label}
                          </span>
                          {item.note && <span className="mt-0.5 block text-xs text-ink-muted">{item.note}</span>}
                        </span>
                      </label>
                      <DeleteIconButton ariaLabel={`Quitar «${item.label}» de la lista`} onDelete={() => handleDelete(item)} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
