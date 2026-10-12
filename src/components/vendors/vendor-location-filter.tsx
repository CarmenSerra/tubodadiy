"use client";

import { MapPinIcon, XIcon } from "lucide-react";

import {
  ROW_FOCUS,
  SELECT_CONTENT,
  SELECT_ITEM,
  SELECT_TRIGGER,
} from "@/components/vendors/vendor-brand";
import {
  hasLocations,
  isFilterAvailable,
  type LocationFilter,
  type LocationOptions,
} from "@/components/vendors/vendor-model";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ALL = "all";

function encode(filter: LocationFilter): string {
  if (!filter) return ALL;
  return `${filter.kind === "community" ? "c" : "p"}:${filter.value}`;
}

function decode(value: string): LocationFilter {
  if (value === ALL) return null;
  const kind = value.startsWith("c:") ? "community" : "province";
  return { kind, value: value.slice(2) };
}

/**
 * Filtro por lugar de la lista de proveedores guardados. Las opciones salen solo
 * de los proveedores que ya tiene la pareja; si ninguno tiene ubicación, no se muestra.
 */
export function VendorLocationFilter({
  options,
  value,
  onChange,
  shown,
  total,
}: {
  options: LocationOptions;
  value: LocationFilter;
  onChange: (next: LocationFilter) => void;
  shown: number;
  total: number;
}) {
  if (!hasLocations(options)) return null;
  const current = isFilterAvailable(value, options) ? value : null;

  return (
    <section
      aria-label="Filtrar proveedores por lugar"
      className="flex flex-wrap items-center gap-x-4 gap-y-2"
    >
      <div className="flex min-w-0 items-center gap-2">
        <MapPinIcon className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        <Select value={encode(current)} onValueChange={(v) => onChange(decode(v))}>
          <SelectTrigger
            aria-label="Filtrar por lugar"
            className={cn(SELECT_TRIGGER, "w-full min-w-0 sm:w-72")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={SELECT_CONTENT}>
            <SelectItem value={ALL} className={SELECT_ITEM}>
              Todos los lugares
            </SelectItem>
            {options.communities.map((community) => (
              <CommunityItems key={community.name} community={community} />
            ))}
          </SelectContent>
        </Select>
      </div>
      {current && (
        <p className="flex items-center gap-3 text-sm text-ink-muted" aria-live="polite">
          <span>
            {shown === 1 ? "1 opción" : `${shown} opciones`} de {total}
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className={cn(
              "inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm font-medium text-ink hover:bg-lilac-soft",
              ROW_FOCUS
            )}
          >
            <XIcon className="size-3.5" aria-hidden="true" />
            Quitar filtro
          </button>
        </p>
      )}
    </section>
  );
}

function CommunityItems({ community }: { community: { name: string; provinces: string[] } }) {
  // Con una sola provincia que coincide con la comunidad no hace falta repetirla.
  const onlyProvince = community.provinces.length === 1 ? community.provinces[0] : null;
  return (
    <>
      <SelectItem value={`c:${community.name}`} className={cn(SELECT_ITEM, "font-semibold")}>
        {community.name}
      </SelectItem>
      {onlyProvince && onlyProvince !== community.name && (
        <SelectItem value={`p:${onlyProvince}`} className={cn(SELECT_ITEM, "pl-6")}>
          {onlyProvince}
        </SelectItem>
      )}
      {community.provinces.length > 1 &&
        community.provinces.map((province) => (
          <SelectItem key={province} value={`p:${province}`} className={cn(SELECT_ITEM, "pl-6")}>
            {province}
          </SelectItem>
        ))}
    </>
  );
}
