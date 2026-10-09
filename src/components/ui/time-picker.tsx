"use client";

import * as React from "react";
import { Clock } from "lucide-react";

import { BRAND_POPOVER_SURFACE } from "@/components/ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const VALUE_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const DEFAULT_HOUR = 12;

const pad = (n: number) => String(n).padStart(2, "0");

function parseValue(value?: string | null): { h: number; m: number } | null {
  const match = value ? VALUE_RE.exec(value) : null;
  return match ? { h: Number(match[1]), m: Number(match[2]) } : null;
}

/**
 * Interpreta lo que se teclea: "17:30", "17.30", "1730", "930" y, con `loose`,
 * solo la hora ("9" → 09:00). Devuelve "HH:mm" o null.
 */
function parseTyped(text: string, loose: boolean): string | null {
  const t = text.trim();
  let h: number;
  let m: number;
  let match: RegExpExecArray | null;
  if ((match = /^(\d{1,2})[:.h](\d{2})$/.exec(t))) {
    h = Number(match[1]);
    m = Number(match[2]);
  } else if ((match = /^(\d{1,2})(\d{2})$/.exec(t))) {
    h = Number(match[1]);
    m = Number(match[2]);
  } else if (loose && (match = /^(\d{1,2})$/.exec(t))) {
    h = Number(match[1]);
    m = 0;
  } else {
    return null;
  }
  return h <= 23 && m <= 59 ? `${pad(h)}:${pad(m)}` : null;
}

const OPTION =
  "mx-auto flex h-9 w-full shrink-0 items-center justify-center rounded-full text-sm tabular-nums text-ink outline-none transition-colors hover:bg-sage-pale focus-visible:ring-2 focus-visible:ring-lilac-bright aria-selected:bg-cta aria-selected:font-medium aria-selected:text-on-cta";
const TEXT_BUTTON =
  "rounded-md px-2 py-1 text-sm font-medium text-green outline-none hover:underline focus-visible:ring-2 focus-visible:ring-lilac-bright";

interface ColumnProps {
  label: string;
  values: number[];
  selected: number | null;
  /** Valor que recibe el foco con Tab cuando no hay ninguno seleccionado. */
  fallback: number;
  onPick: (value: number) => void;
  onSide: (direction: -1 | 1) => void;
  column: "h" | "m";
}

/** Columna de opciones (listbox) con flechas, Inicio/Fin y desplazamiento propio. */
function Column({ label, values, selected, fallback, onPick, onSide, column }: ColumnProps) {
  const listRef = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState<number | null>(null);
  const tabStop = active ?? selected ?? fallback;

  // Muestra lo elegido al abrir (sin animación: el popover ya entra con la suya).
  React.useEffect(() => {
    const list = listRef.current;
    const target =
      list?.querySelector<HTMLElement>('[aria-selected="true"]') ??
      list?.querySelector<HTMLElement>('[tabindex="0"]');
    if (list && target) {
      list.scrollTop = target.offsetTop - (list.clientHeight - target.offsetHeight) / 2;
    }
  }, []);

  // Dentro de un diálogo modal, la rueda y el tacto se bloquean fuera del diálogo (el popover
  // va en un portal): se frenan aquí para que la columna se desplace.
  React.useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const stop = (event: Event) => event.stopPropagation();
    list.addEventListener("wheel", stop, { passive: true });
    list.addEventListener("touchmove", stop, { passive: true });
    return () => {
      list.removeEventListener("wheel", stop);
      list.removeEventListener("touchmove", stop);
    };
  }, []);

  const focusAt = (index: number) => {
    const options = listRef.current?.querySelectorAll<HTMLElement>('[role="option"]');
    const next = options?.[Math.max(0, Math.min(values.length - 1, index))];
    next?.focus();
    next?.scrollIntoView({ block: "nearest" });
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = values.indexOf(tabStop);
    switch (event.key) {
      case "ArrowDown":
        focusAt(index + 1);
        break;
      case "ArrowUp":
        focusAt(index - 1);
        break;
      case "PageDown":
        focusAt(index + 6);
        break;
      case "PageUp":
        focusAt(index - 6);
        break;
      case "Home":
        focusAt(0);
        break;
      case "End":
        focusAt(values.length - 1);
        break;
      case "ArrowLeft":
        onSide(-1);
        break;
      case "ArrowRight":
        onSide(1);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="mb-1 text-center text-xs font-medium tracking-wide text-ink-muted">{label}</div>
      <div
        ref={listRef}
        role="listbox"
        aria-label={label}
        data-column={column}
        onKeyDown={onKeyDown}
        className="flex max-h-48 flex-col gap-0.5 overflow-y-auto overscroll-contain rounded-xl bg-field p-1 [scrollbar-width:thin]"
      >
        {values.map((value) => (
          <button
            key={value}
            type="button"
            role="option"
            aria-selected={selected === value}
            tabIndex={value === tabStop ? 0 : -1}
            onFocus={() => setActive(value)}
            onClick={() => onPick(value)}
            className={OPTION}
          >
            {pad(value)}
          </button>
        ))}
      </div>
    </div>
  );
}

interface TimePickerProps {
  /** Hora en formato `HH:mm` (24 h), o cadena vacía. */
  value: string;
  /** Recibe `HH:mm`, o cadena vacía al borrar. */
  onChange: (value: string) => void;
  id?: string;
  "aria-describedby"?: string;
  /** Marca el campo como erróneo (data-invalid); el mensaje va en `aria-describedby`. */
  "aria-invalid"?: boolean;
  "aria-label"?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Paso de los minutos de la columna (la hora tecleada puede ser cualquier minuto). */
  minuteStep?: number;
  placeholder?: string;
  /** Clases del disparador (altura, borde, radio…) para casar con los inputs vecinos. */
  className?: string;
}

/**
 * Selector de hora de marca (misma superficie que `DatePicker`): disparador con la hora
 * y un reloj, y un popover con columnas de hora y minutos (de 5 en 5) y un campo para
 * teclearla. Valor `HH:mm` o vacío; se puede borrar. Teclado: flechas, Inicio/Fin, Enter.
 */
export function TimePicker({
  value,
  onChange,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
  disabled,
  autoFocus,
  minuteStep = 5,
  placeholder = "--:--",
  className,
}: TimePickerProps) {
  const parsed = React.useMemo(() => parseValue(value), [value]);
  const [open, setOpen] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const inputId = React.useId();
  // Texto en edición del campo; null = muestra el valor.
  const [draft, setDraft] = React.useState<string | null>(null);

  const minutes = React.useMemo(() => {
    const steps = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep);
    // Una hora tecleada (17:32) también aparece en la columna.
    if (parsed && !steps.includes(parsed.m)) steps.push(parsed.m);
    return steps.sort((a, b) => a - b);
  }, [minuteStep, parsed]);

  const commit = (h: number, m: number) => onChange(`${pad(h)}:${pad(m)}`);

  const focusColumn = (column: "h" | "m") => {
    const list = contentRef.current?.querySelector<HTMLElement>(`[data-column="${column}"]`);
    const target =
      list?.querySelector<HTMLElement>('[aria-selected="true"]') ??
      list?.querySelector<HTMLElement>('[tabindex="0"]');
    target?.focus();
  };

  const onTyped = (text: string) => {
    setDraft(text);
    if (text.trim() === "") {
      if (value) onChange("");
      return;
    }
    const strict = parseTyped(text, false);
    if (strict) onChange(strict);
  };

  const shown = parsed ? `${pad(parsed.h)}:${pad(parsed.m)}` : "";

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setDraft(null);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-describedby={ariaDescribedBy}
          data-invalid={ariaInvalid || undefined}
          aria-label={ariaLabel ? `${ariaLabel}${shown ? `: ${shown}` : ""}` : undefined}
          data-slot="time-picker-trigger"
          className={cn(
            "flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-left text-sm tabular-nums shadow-sm transition-colors outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "data-[state=open]:ring-2 data-[state=open]:ring-lilac",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <span className={cn("truncate", !shown && "text-ink-muted")}>{shown || placeholder}</span>
          <Clock aria-hidden className="size-4 shrink-0 text-lilac" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        ref={contentRef}
        align="start"
        sideOffset={6}
        collisionPadding={16}
        aria-label="Elegir hora"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          focusColumn("h");
        }}
        className={cn(BRAND_POPOVER_SURFACE, "w-[min(15rem,calc(100vw-2rem))]")}
      >
        <div className="mb-2 flex items-center gap-2">
          <label htmlFor={inputId} className="shrink-0 text-xs font-medium tracking-wide text-ink-muted">
            Escribir
          </label>
          <input
            id={inputId}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="HH:mm"
            maxLength={5}
            value={draft ?? shown}
            onChange={(event) => onTyped(event.target.value)}
            onBlur={() => {
              if (draft !== null) {
                const next = parseTyped(draft, true);
                if (next && next !== value) onChange(next);
                setDraft(null);
              }
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              const next = draft === null ? shown : draft.trim() === "" ? "" : parseTyped(draft, true);
              if (next === null) return;
              if (next !== value) onChange(next);
              setDraft(null);
              setOpen(false);
            }}
            className="h-9 min-w-0 flex-1 rounded-lg border border-line-strong bg-field px-3 text-center text-sm tabular-nums text-ink-strong outline-none placeholder:text-ink-placeholder focus-visible:ring-2 focus-visible:ring-lilac"
          />
        </div>

        <div className="flex gap-2">
          <Column
            label="Hora"
            column="h"
            values={HOURS}
            selected={parsed?.h ?? null}
            fallback={DEFAULT_HOUR}
            onPick={(h) => {
              commit(h, parsed?.m ?? 0);
              setDraft(null);
              // Sigue con los minutos.
              requestAnimationFrame(() => focusColumn("m"));
            }}
            onSide={(d) => d > 0 && focusColumn("m")}
          />
          <Column
            label="Min"
            column="m"
            values={minutes}
            selected={parsed?.m ?? null}
            fallback={0}
            onPick={(m) => {
              commit(parsed?.h ?? DEFAULT_HOUR, m);
              setDraft(null);
              setOpen(false);
            }}
            onSide={(d) => d < 0 && focusColumn("h")}
          />
        </div>

        <div className="mt-2 flex min-h-8 items-center justify-between border-t border-line pt-2">
          {value ? (
            <button
              type="button"
              className={TEXT_BUTTON}
              onClick={() => {
                onChange("");
                setDraft(null);
                setOpen(false);
              }}
            >
              Borrar
            </button>
          ) : (
            <span />
          )}
          <button type="button" className={TEXT_BUTTON} onClick={() => setOpen(false)}>
            Listo
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
