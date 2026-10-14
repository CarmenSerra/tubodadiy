"use client";

import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ChipOption<T extends string> {
  id: T;
  label: string;
  active: boolean;
}

/** Opciones en píldoras (una sola elegible), de al menos 44 px de alto. */
export function ChipGroup<T extends string>({
  label,
  options,
  onSelect,
  disabled = false,
  idPrefix,
}: {
  label: string;
  options: ChipOption<T>[];
  onSelect: (id: T) => void;
  disabled?: boolean;
  idPrefix?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={cn("flex flex-wrap gap-2", disabled && "opacity-50")}
    >
      {options.map(({ id, label: name, active }) => (
        <button
          key={id}
          type="button"
          role="radio"
          id={idPrefix ? `${idPrefix}-${id}` : undefined}
          aria-checked={active}
          disabled={disabled}
          onClick={() => onSelect(id)}
          className={cn(
            "inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 px-4 text-sm font-medium text-ink-strong outline-none transition-colors focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed",
            active ? "border-lilac bg-lilac-soft/60" : "border-line bg-raised enabled:hover:border-lilac"
          )}
        >
          {active && <CheckIcon aria-hidden="true" className="size-3.5 shrink-0 text-green" />}
          {name}
        </button>
      ))}
    </div>
  );
}
