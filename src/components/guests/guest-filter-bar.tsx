"use client";

import { CheckIcon, SearchIcon, XIcon } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

import { CARD, LINK } from "@/components/dashboard/ui";
import { FIELD, ROW_FOCUS, SELECT_CONTENT, SELECT_ITEM, SELECT_TRIGGER } from "@/components/guests/brand-dialog";
import { DietIcon } from "@/components/diet-icons";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DIET_IDS, type DietId } from "@/lib/diets";
import { DIET_ALL, GROUP_ALL, GROUP_NONE, isFiltering, type GuestFilters, type StatusFilter } from "./guest-filters";
import type { GroupBy } from "./guest-model";

// El texto sale de guests:filters.status.<valor>.
const STATUS_CHIPS: StatusFilter[] = ["all", "confirmed", "pending", "declined"];
// El texto sale de guests:groupBy.<valor>.
const GROUP_BY_OPTIONS: GroupBy[] = ["none", "group", "household"];

export function GuestFilterBar({
  filters,
  onChange,
  onClear,
  groups,
  hasUngrouped,
  hasDiets,
  groupBy,
  onGroupByChange,
  shown,
  total,
}: {
  filters: GuestFilters;
  onChange: (next: GuestFilters) => void;
  onClear: () => void;
  groups: string[];
  hasUngrouped: boolean;
  /** Si algún invitado tiene alergias o dietas (activa el filtro por dieta). */
  hasDiets: boolean;
  groupBy: GroupBy;
  onGroupByChange: (next: GroupBy) => void;
  shown: number;
  total: number;
}) {
  const { t } = useTranslation(["guests", "diets"]);
  const filtering = isFiltering(filters);
  const showGroupSelect = groups.length > 0;
  const showDietSelect = hasDiets || filters.diet !== DIET_ALL;

  return (
    <section aria-label={t("filters.section")} className={cn(CARD, "flex flex-col gap-4 p-4 sm:p-5")}>
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
            placeholder={t("filters.searchPlaceholder")}
            aria-label={t("filters.searchLabel")}
            autoComplete="off"
            className={cn(FIELD, "pl-10 pr-10 [&::-webkit-search-cancel-button]:appearance-none")}
          />
          {filters.query && (
            <button
              type="button"
              aria-label={t("filters.clearSearch")}
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
            <SelectTrigger aria-label={t("filters.groupLabel")} className={cn(SELECT_TRIGGER, "sm:w-60")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={SELECT_CONTENT}>
              <SelectItem value={GROUP_ALL} className={SELECT_ITEM}>
                {t("filters.allGroups")}
              </SelectItem>
              {groups.map((g) => (
                <SelectItem key={g} value={g} className={SELECT_ITEM}>
                  {g}
                </SelectItem>
              ))}
              {hasUngrouped && (
                <SelectItem value={GROUP_NONE} className={SELECT_ITEM}>
                  {t("filters.noGroup")}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        )}
        {showDietSelect && (
          <Select
            value={filters.diet}
            onValueChange={(diet) => onChange({ ...filters, diet: diet as DietId | typeof DIET_ALL })}
          >
            <SelectTrigger aria-label={t("filters.dietLabel")} className={cn(SELECT_TRIGGER, "sm:w-60")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={SELECT_CONTENT}>
              <SelectItem value={DIET_ALL} className={SELECT_ITEM}>
                {t("filters.allDiets")}
              </SelectItem>
              {DIET_IDS.map((id) => (
                <SelectItem key={id} value={id} className={SELECT_ITEM}>
                  <span className="inline-flex items-center gap-2">
                    <DietIcon id={id} size={16} decorative />
                    {t(`diets:items.${id}.label`)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div role="group" aria-label={t("filters.statusLabel")} className="flex flex-wrap gap-2">
          {STATUS_CHIPS.map((value) => {
            const active = filters.status === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ ...filters, status: value })}
                className={cn(
                  "inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm transition-colors sm:h-9",
                  ROW_FOCUS,
                  active
                    ? "border-lilac bg-lilac-mid font-semibold text-ink"
                    : "border-line-strong bg-raised font-medium text-ink-muted hover:bg-lilac-soft"
                )}
              >
                {active && <CheckIcon className="size-3.5" aria-hidden="true" />}
                {t(`filters.status.${value}`)}
              </button>
            );
          })}
        </div>
        <p className="flex items-center gap-3 text-sm text-ink-muted" aria-live="polite">
          <span>
            {filtering ? (
              <Trans
                ns="guests"
                i18nKey="filters.shownOf"
                count={total}
                values={{ shown }}
                components={{ hl: <span className="font-medium text-ink" /> }}
              />
            ) : (
              t("filters.total", { count: total })
            )}
          </span>
          {filtering && (
            <button type="button" onClick={onClear} className={cn(LINK, "rounded-sm", ROW_FOCUS)}>
              {t("filters.clear")}
            </button>
          )}
        </p>
      </div>

      <div role="group" aria-label={t("groupBy.label")} className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-ink-muted" aria-hidden="true">
          {t("groupBy.label")}
        </span>
        {GROUP_BY_OPTIONS.map((value) => {
          const active = groupBy === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => onGroupByChange(value)}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm transition-colors sm:h-9",
                ROW_FOCUS,
                active
                  ? "border-lilac bg-lilac-mid font-semibold text-ink"
                  : "border-line-strong bg-raised font-medium text-ink-muted hover:bg-lilac-soft"
              )}
            >
              {active && <CheckIcon className="size-3.5" aria-hidden="true" />}
              {t(`groupBy.${value}`)}
            </button>
          );
        })}
      </div>
    </section>
  );
}
