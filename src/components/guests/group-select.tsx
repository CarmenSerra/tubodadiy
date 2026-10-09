"use client";

import * as React from "react";

import {
  FIELD,
  FIELD_LABEL,
  SELECT_CONTENT,
  SELECT_ITEM,
  SELECT_TRIGGER,
} from "@/components/guests/brand-dialog";
import { normalizeText } from "@/components/guests/guest-filters";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Grupos que siempre se ofrecen, además de los que ya usa el plan. */
export const DEFAULT_GROUPS = ["Familia", "Amigos", "Otros"] as const;

// Radix Select no admite "" como valor: se usan centinelas para estas dos opciones.
const NONE = "__none__";
const CUSTOM = "__custom__";

/** Opciones del desplegable: las de siempre, los grupos del plan y, si hace falta, el valor actual. */
export function groupOptions(used: string[], current: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const label of [...DEFAULT_GROUPS, ...used, current]) {
    const trimmed = label.trim();
    const key = normalizeText(trimmed);
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

/**
 * Selector de grupo: desplegable con Familia, Amigos, Otros y los grupos que ya
 * usa el plan, más «Escribir otro grupo…», que muestra un campo de texto para
 * uno nuevo. `value` es el grupo final (cadena vacía = sin grupo).
 */
export function GroupSelect({
  id,
  value,
  onChange,
  groups,
  className,
}: {
  id: string;
  value: string;
  onChange: (group: string) => void;
  /** Grupos ya usados en el plan. */
  groups: string[];
  className?: string;
}) {
  // Las opciones se fijan al abrir el formulario: si no, al teclear un grupo nuevo
  // aparecería (y se seleccionaría) a cada letra.
  const [initial] = React.useState(value);
  const options = React.useMemo(() => groupOptions(groups, initial), [groups, initial]);
  const [custom, setCustom] = React.useState(false);
  const [customText, setCustomText] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  // Al cerrarse, el desplegable devuelve el foco a su botón: si se eligió «otro grupo», va al campo.
  const focusInputOnClose = React.useRef(false);

  const selected = custom
    ? CUSTOM
    : value.trim()
      ? (options.find((o) => normalizeText(o) === normalizeText(value)) ?? value.trim())
      : NONE;

  function handleSelect(next: string) {
    if (next === CUSTOM) {
      focusInputOnClose.current = true;
      setCustom(true);
      onChange(customText.trim());
      return;
    }
    setCustom(false);
    onChange(next === NONE ? "" : next);
  }

  function handleCustomBlur() {
    // Si lo escrito ya existe (p. ej. «familia»), se usa ese grupo en vez de duplicarlo.
    const match = options.find((o) => normalizeText(o) === normalizeText(customText));
    if (match) {
      setCustom(false);
      setCustomText("");
      onChange(match);
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Select value={selected} onValueChange={handleSelect}>
        <SelectTrigger id={id} className={SELECT_TRIGGER}>
          <SelectValue placeholder="Elige un grupo" />
        </SelectTrigger>
        <SelectContent
          className={SELECT_CONTENT}
          onCloseAutoFocus={(event) => {
            if (!focusInputOnClose.current) return;
            focusInputOnClose.current = false;
            event.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <SelectItem value={NONE} className={SELECT_ITEM}>
            Sin grupo
          </SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o} className={SELECT_ITEM}>
              {o}
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM} className={SELECT_ITEM}>
            Escribir otro grupo…
          </SelectItem>
        </SelectContent>
      </Select>
      {custom && (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-custom`} className={FIELD_LABEL}>
            Nombre del nuevo grupo
          </Label>
          <Input
            id={`${id}-custom`}
            value={customText}
            onChange={(e) => {
              setCustomText(e.target.value);
              onChange(e.target.value.trim());
            }}
            onBlur={handleCustomBlur}
            placeholder="Compañeros de trabajo, vecinos…"
            maxLength={60}
            autoComplete="off"
            ref={inputRef}
            className={FIELD}
          />
        </div>
      )}
    </div>
  );
}
