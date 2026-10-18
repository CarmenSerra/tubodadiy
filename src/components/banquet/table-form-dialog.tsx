"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { addTable, updateTable } from "@/components/banquet/banquet-firebase";
import {
  DEFAULT_CAPACITY,
  MAX_TABLE_CAPACITY,
  TABLE_SHAPES,
  type BanquetTable,
  type TableShape,
} from "@/components/banquet/banquet-model";
import { TableDiagram } from "@/components/banquet/table-diagram";
import { togglePill } from "@/components/banquet/ui";
import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import { DIALOG_CONTENT, DIALOG_TITLE, FIELD, FIELD_LABEL } from "@/components/guests/brand-dialog";
import { useRestoreFocus } from "@/components/timeline/use-restore-focus";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface TableFormDialogProps {
  planId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Mesa a editar; sin ella se crean mesas nuevas. */
  table?: BanquetTable;
  /** Plazas ocupadas de la mesa editada: la capacidad no puede bajar de ahí. */
  used?: number;
  /** Mesas existentes (para nombrar y ordenar las nuevas). */
  tables: BanquetTable[];
  onDelete?: (table: BanquetTable) => void;
}

export function TableFormDialog(props: TableFormDialogProps) {
  const restoreFocus = useRestoreFocus();
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className={DIALOG_CONTENT}
        onOpenAutoFocus={restoreFocus.onOpenAutoFocus}
        onCloseAutoFocus={restoreFocus.onCloseAutoFocus}
      >
        {props.open && <TableForm {...props} onDone={() => props.onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function clampCapacity(value: number): number {
  return Math.min(MAX_TABLE_CAPACITY, Math.max(1, Math.round(value) || 1));
}

function TableForm({
  planId,
  table,
  used = 0,
  tables,
  onDelete,
  onDone,
}: TableFormDialogProps & { onDone: () => void }) {
  const { t } = useTranslation("banquet");
  const isEdit = Boolean(table);
  const baseName = t("table.defaultName");
  const nextNumber = React.useMemo(() => {
    const taken = new Set(tables.map((x) => x.name.trim().toLowerCase()));
    let n = tables.length + 1;
    while (taken.has(`${baseName} ${n}`.toLowerCase())) n += 1;
    return n;
  }, [tables, baseName]);

  const [name, setName] = React.useState(table?.name ?? `${baseName} ${nextNumber}`);
  const [shape, setShape] = React.useState<TableShape>(table?.shape ?? "round");
  const [capacity, setCapacity] = React.useState(String(table?.capacity ?? DEFAULT_CAPACITY.round));
  const [quantity, setQuantity] = React.useState("1");
  const [submitting, setSubmitting] = React.useState(false);

  const minCapacity = Math.max(1, used);
  const capacityNumber = Number(capacity);
  const capacityValid = Number.isInteger(capacityNumber) && capacityNumber >= minCapacity && capacityNumber <= MAX_TABLE_CAPACITY;
  const count = isEdit ? 1 : clampCapacity(Number(quantity));
  const many = count > 1;

  function pickShape(next: TableShape) {
    // Si la capacidad es la de la forma anterior, sugiere la de la nueva.
    if (!isEdit && Number(capacity) === DEFAULT_CAPACITY[shape]) setCapacity(String(DEFAULT_CAPACITY[next]));
    setShape(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!capacityValid || (!many && !name.trim())) return;
    setSubmitting(true);
    try {
      if (table) {
        await updateTable(planId, table.id, { name: name.trim(), shape, capacity: capacityNumber });
        toast.success(t("table.updated"));
      } else {
        const firstOrder = tables.reduce((max, x) => Math.max(max, x.order), -1) + 1;
        for (let i = 0; i < count; i++) {
          await addTable(
            planId,
            { name: many ? `${baseName} ${nextNumber + i}` : name.trim(), shape, capacity: capacityNumber },
            firstOrder + i
          );
        }
        toast.success(t("table.added", { count }));
      }
      onDone();
    } catch {
      toast.error(t("table.saveError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle className={DIALOG_TITLE}>{isEdit ? t("table.editTitle") : t("table.newTitle")}</DialogTitle>
      </DialogHeader>
      <div className="mt-5 flex flex-col gap-5">
        {!many && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="table-name" className={FIELD_LABEL}>
              {t("table.name")}
            </Label>
            <Input
              id="table-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              required
              autoFocus
              autoComplete="off"
              className={FIELD}
            />
          </div>
        )}
        <fieldset className="flex flex-col gap-2">
          <legend className={FIELD_LABEL}>{t("table.shape")}</legend>
          <div className="flex flex-wrap gap-2">
            {TABLE_SHAPES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={shape === s}
                onClick={() => pickShape(s)}
                className={cn(togglePill(shape === s), "pr-4")}
              >
                <TableDiagram shape={s} capacity={s === "round" ? 6 : 6} used={0} className="size-8" />
                {t(`table.shapes.${s}`)}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-col gap-2">
          <Label htmlFor="table-capacity" className={FIELD_LABEL}>
            {t("table.capacity")}
          </Label>
          <Input
            id="table-capacity"
            type="number"
            inputMode="numeric"
            min={minCapacity}
            max={MAX_TABLE_CAPACITY}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            aria-describedby="table-capacity-hint"
            aria-invalid={!capacityValid}
            className={FIELD}
          />
          <p id="table-capacity-hint" className="text-xs text-ink-muted">
            {used > 0
              ? t("table.capacityHintUsed", { count: used, max: MAX_TABLE_CAPACITY })
              : t("table.capacityHint", { max: MAX_TABLE_CAPACITY })}
          </p>
        </div>
        {!isEdit && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="table-quantity" className={FIELD_LABEL}>
              {t("table.quantity")}
            </Label>
            <Input
              id="table-quantity"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_TABLE_CAPACITY}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              aria-describedby="table-quantity-hint"
              className={FIELD}
            />
            <p id="table-quantity-hint" className="text-xs text-ink-muted">
              {many
                ? t("table.quantityMany", { first: `${baseName} ${nextNumber}`, last: `${baseName} ${nextNumber + count - 1}` })
                : t("table.quantityHint")}
            </p>
          </div>
        )}
      </div>
      <DialogFooter className="mt-6 gap-2 sm:gap-3">
        {table && onDelete && (
          <button
            type="button"
            onClick={() => {
              onDelete(table);
              onDone();
            }}
            className={cn(CTA_SECONDARY, "h-11 sm:mr-auto")}
          >
            {t("table.delete")}
          </button>
        )}
        <button type="button" onClick={onDone} className={cn(CTA_SECONDARY, "h-11")}>
          {t("actions.cancel")}
        </button>
        <button type="submit" disabled={submitting || !capacityValid} className={cn(CTA_PRIMARY, "disabled:opacity-60")}>
          {submitting && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          {t("actions.save")}
        </button>
      </DialogFooter>
    </form>
  );
}
