"use client";

import { CheckIcon, SearchIcon, XIcon } from "lucide-react";

import { CARD, LINK } from "@/components/dashboard/ui";
import { FIELD, ROW_FOCUS, SELECT_CONTENT, SELECT_ITEM, SELECT_TRIGGER } from "@/components/guests/brand-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { GROUP_ALL, GROUP_NONE, isFiltering, type GuestFilters, type StatusFilter } from "./guest-filters";

const STATUS_CHIPS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "confirmed", label: "Confirmados" },
  { value: "pending", label: "Pendientes" },
  { value: "declined", label: "No asisten" },
];

export function GuestFilterBar({
  filters,
  onChange,
  onClear,
  groups,
  hasUngrouped,
  shown,
  total,
}: {
  filters: GuestFilters;
  onChange: (next: GuestFilters) => void;
  onClear: () => void;
  groups: string[];
  hasUngrouped: boolean;
  shown: number;
  total: number;
}) {
  const filtering = isFiltering(filters);
  const showGroupSelect = groups.length > 0;

  return (
    <section aria-label="Buscar y filtrar invitados" className={cn(CARD, "flex flex-col gap-4 p-4 sm:p-5")}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <SearchIcon
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            placeholder="Nombre, grupo o notas"
            aria-label="Buscar invitados por nombre, grupo o notas"
            autoComplete="off"
            className={cn(FIELD, "pl-10 pr-10 [&::-webkit-search-cancel-button]:appearance-none")}
          />
          {filters.query && (
            <button
              type="button"
              aria-label="Borrar búsqueda"
              onClick={() => onChange({ ...filters, query: "" })}
              className={cn(
                "absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:bg-lilac-soft",
                ROW_FOCUS
              )}
            >
              <XIcon className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
        {showGroupSelect && (
          <Select value={filters.group} onValueChange={(group) => onChange({ ...filters, group })}>
            <SelectTrigger aria-label="Filtrar por grupo" className={cn(SELECT_TRIGGER, "sm:w-60")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={SELECT_CONTENT}>
              <SelectItem value={GROUP_ALL} className={SELECT_ITEM}>
                Todos los grupos
              </SelectItem>
              {groups.map((g) => (
                <SelectItem key={g} value={g} className={SELECT_ITEM}>
                  {g}
                </SelectItem>
              ))}
              {hasUngrouped && (
                <SelectItem value={GROUP_NONE} className={SELECT_ITEM}>
                  Sin grupo
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div role="group" aria-label="Filtrar por respuesta" className="flex flex-wrap gap-2">
          {STATUS_CHIPS.map((chip) => {
            const active = filters.status === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ ...filters, status: chip.value })}
                className={cn(
                  "inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm transition-colors sm:h-9",
                  ROW_FOCUS,
                  active
                    ? "border-lilac bg-lilac-mid font-semibold text-ink"
                    : "border-line-strong bg-raised font-medium text-ink-muted hover:bg-lilac-soft"
                )}
              >
                {active && <CheckIcon className="size-3.5" aria-hidden="true" />}
                {chip.label}
              </button>
            );
          })}
        </div>
        <p className="flex items-center gap-3 text-sm text-ink-muted" aria-live="polite">
          <span>
            {filtering ? (
              <>
                <span className="font-medium text-ink">{shown}</span> de {total}{" "}
                {total === 1 ? "invitado" : "invitados"}
              </>
            ) : (
              <>
                {total} {total === 1 ? "invitado" : "invitados"}
              </>
            )}
          </span>
          {filtering && (
            <button type="button" onClick={onClear} className={cn(LINK, "rounded-sm", ROW_FOCUS)}>
              Limpiar filtros
            </button>
          )}
        </p>
      </div>
    </section>
  );
}
