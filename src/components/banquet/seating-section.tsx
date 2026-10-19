"use client";

import * as React from "react";
import { GripVerticalIcon, PencilIcon, PlusIcon, PrinterIcon, SearchIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { assignGuest, deleteTable, restoreTable } from "@/components/banquet/banquet-firebase";
import {
  buildTableViews,
  dietCounts,
  guestDietIds,
  inScope,
  seatsOf,
  unseatedGuests,
  type BanquetTable,
  type GuestScope,
  type TableView,
} from "@/components/banquet/banquet-model";
import { TableDiagram } from "@/components/banquet/table-diagram";
import { TableFormDialog } from "@/components/banquet/table-form-dialog";
import { BQ_CARD, BQ_FOCUS, BQ_NATIVE_SELECT, DietChip } from "@/components/banquet/ui";
import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import { DietBadges } from "@/components/diet-icons";
import { BanquetExportButton } from "@/components/export/export-buttons";
import { companionName, normalizeText } from "@/components/guests/guest-filters";
import { Input } from "@/components/ui/input";
import { FIELD } from "@/components/guests/brand-dialog";
import type { Guest } from "@/lib/types";
import { toastWithUndo } from "@/lib/undo-toast";
import { cn } from "@/lib/utils";

const SCOPES: GuestScope[] = ["confirmed", "all"];
const POOL = "pool";

interface DialogState {
  table?: BanquetTable;
}

/** Pestaña «Mesas»: invitados sin mesa a un lado y las mesas al otro; se asigna arrastrando o con el selector. */
export function SeatingSection({
  planId,
  guests,
  tables,
  printHref,
}: {
  planId: string;
  guests: Guest[];
  tables: BanquetTable[];
  printHref: string;
}) {
  const { t } = useTranslation("banquet");
  const [scope, setScope] = React.useState<GuestScope>("confirmed");
  const [query, setQuery] = React.useState("");
  const [dialog, setDialog] = React.useState<DialogState | null>(null);
  const [shown, setShown] = React.useState<DialogState>({});
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState("");

  const views = React.useMemo(() => buildTableViews(tables, guests), [tables, guests]);
  const unseated = React.useMemo(() => unseatedGuests(views, guests), [views, guests]);
  const pool = React.useMemo(() => {
    const q = normalizeText(query.trim());
    return unseated.filter(
      (g) => inScope(g, scope) && (!q || normalizeText(`${g.name} ${g.plusOneName}`).includes(q))
    );
  }, [unseated, scope, query]);

  const totals = React.useMemo(() => {
    const capacity = tables.reduce((sum, x) => sum + x.capacity, 0);
    const seated = views.reduce((sum, v) => sum + v.used, 0);
    const waiting = unseated.filter((g) => inScope(g, scope)).reduce((sum, g) => sum + seatsOf(g), 0);
    return { capacity, seated, waiting };
  }, [tables, views, unseated, scope]);

  function openDialog(next: DialogState) {
    setShown(next);
    setDialog(next);
  }

  const announce = React.useCallback((message: string) => {
    // El espacio final alterno hace que repetir el mismo mensaje se vuelva a anunciar.
    setAnnouncement((prev) => (prev.endsWith(" ") ? message : `${message} `));
  }, []);

  async function assign(guest: Guest, tableId: string | null) {
    const target = tableId ? views.find((v) => v.table.id === tableId) : null;
    if (tableId && !target) return;
    if (target && !target.guests.some((g) => g.id === guest.id) && seatsOf(guest) > target.free) {
      const message = t("seating.noRoom", { guest: guest.name, table: target.table.name, count: Math.max(0, target.free) });
      toast(message);
      announce(message);
      return;
    }
    try {
      await assignGuest(planId, guest.id, tableId, tables);
      announce(
        target
          ? t("seating.assigned", { guest: guest.name, table: target.table.name })
          : t("seating.unassigned", { guest: guest.name })
      );
    } catch {
      toast.error(t("seating.assignError"));
    }
  }

  async function handleDeleteTable(table: BanquetTable) {
    try {
      await deleteTable(planId, table.id);
      toastWithUndo(t("table.deleted", { name: table.name }), () => restoreTable(planId, table));
    } catch {
      toast.error(t("table.deleteError"));
    }
  }

  function dropOn(targetId: string, e: React.DragEvent) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || dragId;
    setDragId(null);
    setOverId(null);
    const guest = guests.find((g) => g.id === id);
    if (guest) void assign(guest, targetId === POOL ? null : targetId);
  }

  const dropProps = (targetId: string) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!dragId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (overId !== targetId) setOverId(targetId);
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOverId((cur) => (cur === targetId ? null : cur));
    },
    onDrop: (e: React.DragEvent) => dropOn(targetId, e),
  });

  const rowProps = (guest: Guest) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData("text/plain", guest.id);
      e.dataTransfer.effectAllowed = "move";
      setDragId(guest.id);
    },
    onDragEnd: () => {
      setDragId(null);
      setOverId(null);
    },
  });

  const dropRing = (id: string) => (dragId && overId === id ? "border-lilac bg-lilac-soft" : "");

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="bq-seat-summary" className={cn(BQ_CARD, "flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5")}>
        <div className="min-w-0">
          <h3 id="bq-seat-summary" className="font-display text-lg font-semibold text-ink sm:text-xl">
            {t("seating.title")}
          </h3>
          <p className="text-sm text-ink-muted">
            {tables.length === 0
              ? t("seating.summaryEmpty")
              : t("seating.summary", {
                  count: tables.length,
                  tables: tables.length,
                  seated: totals.seated,
                  capacity: totals.capacity,
                  waiting: totals.waiting,
                })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tables.length > 0 && (
            <>
              <BanquetExportButton tables={tables} guests={guests} />
              <Link href={printHref} className={cn(CTA_SECONDARY, "h-11")}>
                <PrinterIcon aria-hidden="true" className="size-4" />
                {t("seating.print")}
              </Link>
            </>
          )}
          <button type="button" onClick={() => openDialog({})} className={CTA_PRIMARY}>
            <PlusIcon aria-hidden="true" className="size-4" />
            {t("seating.addTable")}
          </button>
        </div>
      </section>

      <p className="text-sm text-ink-muted">{t("seating.howTo")}</p>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <section
          aria-labelledby="bq-pool-title"
          className={cn(BQ_CARD, "border-2 p-4 transition-colors sm:p-5 lg:sticky lg:top-4", dropRing(POOL))}
          {...dropProps(POOL)}
        >
          <h3 id="bq-pool-title" className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <UsersIcon aria-hidden="true" className="size-5" />
            {t("pool.title")}
          </h3>
          <div role="group" aria-label={t("pool.scopeLabel")} className="mt-3 flex flex-wrap gap-2">
            {SCOPES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={scope === s}
                onClick={() => setScope(s)}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full border-2 px-4 text-sm font-medium text-ink transition-colors",
                  BQ_FOCUS,
                  scope === s ? "border-lilac bg-lilac-soft" : "border-line-strong bg-field hover:bg-lilac-soft"
                )}
              >
                {t(`pool.scope.${s}`)}
              </button>
            ))}
          </div>
          <div className="relative mt-3">
            <SearchIcon aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-muted" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t("pool.search")}
              placeholder={t("pool.search")}
              className={cn(FIELD, "pl-10")}
            />
          </div>
          {guests.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">{t("pool.noGuests")}</p>
          ) : pool.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">
              {unseated.length === 0 ? t("pool.allSeated") : query ? t("pool.noMatch") : t("pool.noneInScope")}
            </p>
          ) : (
            <ul className="mt-3 flex max-h-[32rem] flex-col gap-2 overflow-y-auto pr-1">
              {pool.map((g) => (
                <GuestRow
                  key={g.id}
                  guest={g}
                  views={views}
                  currentTableId=""
                  dragging={dragId === g.id}
                  onAssign={assign}
                  {...rowProps(g)}
                />
              ))}
            </ul>
          )}
        </section>

        <div className="min-w-0">
          {tables.length === 0 ? (
            <div className={cn(BQ_CARD, "flex flex-col items-center gap-3 p-8 text-center")}>
              <TableDiagram shape="round" capacity={8} used={3} className="size-24" />
              <h3 className="font-display text-xl font-semibold text-ink">{t("seating.empty.title")}</h3>
              <p className="max-w-md text-sm text-ink-muted">{t("seating.empty.text")}</p>
              <button type="button" onClick={() => openDialog({})} className={cn(CTA_PRIMARY, "mt-1")}>
                <PlusIcon aria-hidden="true" className="size-4" />
                {t("seating.empty.action")}
              </button>
            </div>
          ) : (
            <ul className="grid gap-4">
              {views.map((view) => (
                <TableCard
                  key={view.table.id}
                  view={view}
                  views={views}
                  className={dropRing(view.table.id)}
                  dragId={dragId}
                  onEdit={() => openDialog({ table: view.table })}
                  onAssign={assign}
                  rowProps={rowProps}
                  dropProps={dropProps(view.table.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      <TableFormDialog
        planId={planId}
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        table={shown.table}
        used={shown.table ? views.find((v) => v.table.id === shown.table?.id)?.used : 0}
        tables={tables}
        onDelete={handleDeleteTable}
      />

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}

interface RowDragProps {
  draggable: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

function TableCard({
  view,
  views,
  className,
  dragId,
  onEdit,
  onAssign,
  rowProps,
  dropProps,
}: {
  view: TableView;
  views: TableView[];
  className?: string;
  dragId: string | null;
  onEdit: () => void;
  onAssign: (guest: Guest, tableId: string | null) => void;
  rowProps: (guest: Guest) => RowDragProps;
  dropProps: React.HTMLAttributes<HTMLElement>;
}) {
  const { t } = useTranslation("banquet");
  const { table, guests, used, free } = view;
  const headingId = `bq-table-${table.id}`;
  const diets = dietCounts(guests);
  const status =
    free < 0
      ? t("table.over", { count: -free })
      : free === 0
        ? t("table.full")
        : t("table.free", { count: free });

  return (
    <li className="min-w-0">
      <section
        aria-labelledby={headingId}
        className={cn(BQ_CARD, "flex h-full flex-col gap-3 border-2 p-4 transition-colors", className)}
        {...dropProps}
      >
        <div className="flex items-start gap-3">
          <TableDiagram shape={table.shape} capacity={table.capacity} used={used} className="size-16 shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 id={headingId} className="break-words font-display text-lg font-semibold leading-tight text-ink">
              {table.name}
            </h3>
            <p className="text-sm text-ink-muted">
              {t(`table.shapes.${table.shape}`)} · {t("table.seats", { used, capacity: table.capacity })}
            </p>
            <p className="text-sm font-medium text-ink">{status}</p>
          </div>
          <button
            type="button"
            onClick={onEdit}
            aria-label={t("table.editNamed", { name: table.name })}
            title={t("table.editNamed", { name: table.name })}
            className={cn(
              "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-lilac-soft hover:text-ink",
              BQ_FOCUS
            )}
          >
            <PencilIcon aria-hidden="true" className="size-4" />
          </button>
        </div>

        {guests.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-strong px-3 py-4 text-center text-sm text-ink-muted">
            {dragId ? t("table.dropHere") : t("table.empty")}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {guests.map((g) => (
              <GuestRow
                key={g.id}
                guest={g}
                views={views}
                currentTableId={table.id}
                compact
                dragging={dragId === g.id}
                onAssign={onAssign}
                {...rowProps(g)}
              />
            ))}
          </ul>
        )}

        {diets.length > 0 && (
          <div className="mt-auto border-t border-line pt-3">
            <p className="mb-2 text-xs font-medium text-ink-muted">{t("table.diets")}</p>
            <ul className="flex flex-wrap gap-1.5">
              {diets.map(([id, n]) => (
                <li key={id}>
                  <DietChip id={id} count={n} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </li>
  );
}

function GuestRow({
  guest,
  views,
  currentTableId,
  dragging,
  compact = false,
  onAssign,
  ...drag
}: {
  guest: Guest;
  views: TableView[];
  currentTableId: string;
  dragging: boolean;
  /** Dentro de una mesa: nombre y selector en la misma línea. */
  compact?: boolean;
  onAssign: (guest: Guest, tableId: string | null) => void;
} & RowDragProps) {
  const { t } = useTranslation("banquet");
  const companion = companionName(guest);
  const diets = guestDietIds(guest);
  const seats = seatsOf(guest);
  return (
    <li
      {...drag}
      className={cn(
        "flex cursor-grab gap-2 rounded-xl border border-line bg-field p-3 active:cursor-grabbing",
        compact ? "flex-col sm:flex-row sm:items-center" : "flex-col",
        dragging && "opacity-50"
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <GripVerticalIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-muted" />
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-medium text-ink-strong">
            {guest.name}
            {guest.rsvpStatus === "pending" && (
              <span className="ml-2 rounded-full bg-lilac-soft px-2 py-0.5 text-xs font-normal text-ink-muted">
                {t("pool.pending")}
              </span>
            )}
          </p>
          {guest.plusOne && (
            <p className="break-words text-xs text-ink-muted">
              {companion ? t("pool.withCompanion", { name: companion }) : t("pool.withUnnamedCompanion")}
            </p>
          )}
          {diets.length > 0 && <DietBadges ids={diets} size={14} max={6} className="mt-1.5" />}
        </div>
        {seats > 1 && (
          <span className="shrink-0 rounded-full bg-lilac-soft px-2 py-0.5 text-xs font-medium text-ink">
            {t("pool.seats", { count: seats })}
          </span>
        )}
      </div>
      <select
        aria-label={t("pool.tableOf", { name: guest.name })}
        value={currentTableId}
        onChange={(e) => onAssign(guest, e.target.value || null)}
        className={cn(BQ_NATIVE_SELECT, "h-11 cursor-pointer text-sm", compact && "sm:w-48 sm:shrink-0")}
      >
        <option value="">{t("pool.noTable")}</option>
        {views.map((v) => {
          const fits = v.table.id === currentTableId || seats <= v.free;
          return (
            <option key={v.table.id} value={v.table.id} disabled={!fits}>
              {t("pool.tableOption", { name: v.table.name, free: Math.max(0, v.free) })}
            </option>
          );
        })}
      </select>
    </li>
  );
}
