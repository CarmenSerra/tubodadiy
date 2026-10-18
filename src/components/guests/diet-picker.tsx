"use client";

import { useTranslation } from "react-i18next";

import { ROW_FOCUS } from "@/components/guests/brand-dialog";
import { DietIcon } from "@/components/diet-icons";
import { DIET_GROUPS, DIET_IDS, DIET_IDS_BY_GROUP, type DietId } from "@/lib/diets";
import { cn } from "@/lib/utils";

/** Un chip activable (alergia/dieta) con icono; seleccionado = borde lila de 2px + fondo lavanda. */
export function DietChip({
  id,
  selected,
  onToggle,
  label,
  count,
}: {
  id: DietId;
  selected: boolean;
  onToggle: () => void;
  label: string;
  /** Número a mostrar tras el nombre (resumen por dieta). */
  count?: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full border-2 px-3.5 text-sm text-ink transition-colors",
        ROW_FOCUS,
        selected ? "border-lilac bg-lilac-soft font-semibold" : "border-line-strong bg-raised font-medium hover:bg-lilac-soft"
      )}
    >
      <DietIcon id={id} size={18} decorative />
      <span>{label}</span>
      {count !== undefined && <span className="text-ink-muted">{count}</span>}
    </button>
  );
}

/** Selector múltiple de alergias, intolerancias y dietas, en dos grupos con su título. */
export function DietPicker({
  value,
  onChange,
}: {
  value: DietId[];
  onChange: (next: DietId[]) => void;
}) {
  const { t } = useTranslation(["diets", "guests"]);

  function toggle(id: DietId) {
    const next = new Set(value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(DIET_IDS.filter((d) => next.has(d)));
  }

  return (
    <div className="flex flex-col gap-3">
      {DIET_GROUPS.map((group) => (
        <fieldset key={group} className="min-w-0">
          <legend className="mb-2 text-xs font-medium text-ink-muted">{t(`diets:groups.${group}`)}</legend>
          <div className="flex flex-wrap gap-2">
            {DIET_IDS_BY_GROUP[group].map((id) => (
              <DietChip
                key={id}
                id={id}
                selected={value.includes(id)}
                onToggle={() => toggle(id)}
                label={t(`diets:items.${id}.label`)}
              />
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
