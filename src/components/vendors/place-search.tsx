"use client";

import * as React from "react";
import { CheckCircle2Icon, Loader2, MapPinIcon, SearchIcon } from "lucide-react";

import { FIELD, FIELD_LABEL } from "@/components/vendors/vendor-brand";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  newPlacesSession,
  placeDetails,
  placesAutocomplete,
  resolveMapsLink,
} from "@/lib/places/client";
import type { PlaceDetails, PlaceSuggestion } from "@/lib/places/types";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 250;
const MIN_CHARS = 3;
const LISTBOX_ID = "place-search-listbox";

interface PlaceSearchProps {
  /** Recibe los datos del lugar elegido (búsqueda o enlace de Maps). */
  onPlace: (place: PlaceDetails) => void;
  className?: string;
}

/**
 * Buscador de lugares con autocompletado (patrón combobox con lista) y una vía
 * secundaria para pegar un enlace de Google Maps. El token de sesión vive lo que
 * el formulario abierto; al elegir se hace UNA llamada de detalles con él y se
 * estrena otro.
 */
export function PlaceSearch({ onPlace, className }: PlaceSearchProps) {
  const [query, setQuery] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const [searching, setSearching] = React.useState(false);
  const [searched, setSearched] = React.useState(false);
  const [picking, setPicking] = React.useState(false);
  const [error, setError] = React.useState("");
  const [filled, setFilled] = React.useState("");

  const [linkOpen, setLinkOpen] = React.useState(false);
  const [link, setLink] = React.useState("");
  const [linkBusy, setLinkBusy] = React.useState(false);
  const [linkError, setLinkError] = React.useState("");

  const sessionRef = React.useRef<string | null>(null);
  const requestRef = React.useRef(0);
  const mountedRef = React.useRef(true);
  // Texto que viene de elegir una sugerencia: no debe lanzar otra búsqueda.
  const skipSearchRef = React.useRef("");

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  function session() {
    if (!sessionRef.current) sessionRef.current = newPlacesSession();
    return sessionRef.current;
  }

  // Búsqueda con debounce; las respuestas antiguas se descartan.
  React.useEffect(() => {
    const q = query.trim();
    if (skipSearchRef.current && skipSearchRef.current === query) return;
    const request = ++requestRef.current;
    if (q.length < MIN_CHARS) return; // el estado se limpia en onChange
    const timer = window.setTimeout(async () => {
      try {
        const found = await placesAutocomplete(q, session());
        if (!mountedRef.current || request !== requestRef.current) return;
        setSuggestions(found);
        setActive(-1);
        setError("");
        setSearched(true);
        setOpen(true);
      } catch {
        if (!mountedRef.current || request !== requestRef.current) return;
        setSuggestions([]);
        setError("No se ha podido buscar ahora. Puedes rellenar los datos a mano.");
        setSearched(false);
        setOpen(false);
      } finally {
        if (mountedRef.current && request === requestRef.current) setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  async function pick(suggestion: PlaceSuggestion) {
    requestRef.current++; // anula búsquedas pendientes
    skipSearchRef.current = suggestion.primary;
    setQuery(suggestion.primary);
    setOpen(false);
    setSearching(false);
    setPicking(true);
    setError("");
    setFilled("");
    const used = session();
    sessionRef.current = null; // los detalles cierran la sesión: la siguiente búsqueda estrena otra
    try {
      const place = await placeDetails(suggestion.placeId, used);
      if (!mountedRef.current) return;
      onPlace(place);
      setFilled(place.name || suggestion.primary);
    } catch {
      if (!mountedRef.current) return;
      setError("No se han podido cargar los datos de ese lugar. Prueba de nuevo o rellénalos a mano.");
    } finally {
      if (mountedRef.current) setPicking(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const visible = open && suggestions.length > 0;
    switch (e.key) {
      case "ArrowDown":
        if (!suggestions.length) return;
        e.preventDefault();
        setOpen(true);
        setActive((i) => (i + 1) % suggestions.length);
        break;
      case "ArrowUp":
        if (!suggestions.length) return;
        e.preventDefault();
        setOpen(true);
        setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
        break;
      case "Home":
        if (!visible) return;
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        if (!visible) return;
        e.preventDefault();
        setActive(suggestions.length - 1);
        break;
      case "Enter":
        // Nunca envía el formulario desde aquí.
        e.preventDefault();
        if (visible && active >= 0) void pick(suggestions[active]);
        break;
      case "Escape":
        if (open) {
          // Cierra la lista sin cerrar el diálogo.
          e.preventDefault();
          e.stopPropagation();
          setOpen(false);
          setActive(-1);
        }
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  async function resolveLink() {
    const url = link.trim();
    if (!url) return;
    setLinkError("");
    if (!/^https?:\/\//i.test(url)) {
      setLinkError("El enlace debe empezar por http:// o https://.");
      return;
    }
    setLinkBusy(true);
    setFilled("");
    try {
      const place = await resolveMapsLink(url);
      if (!mountedRef.current) return;
      if (!place) {
        setLinkError("No hemos encontrado ese lugar. Revisa el enlace o busca por nombre.");
        return;
      }
      onPlace(place);
      setFilled(place.name);
      setLink("");
      setLinkOpen(false);
    } catch {
      if (mountedRef.current) setLinkError("No se ha podido leer el enlace ahora. Prueba de nuevo.");
    } finally {
      if (mountedRef.current) setLinkBusy(false);
    }
  }

  const expanded = open && suggestions.length > 0;
  const statusText = picking
    ? "Cargando los datos del lugar…"
    : searching
      ? "Buscando…"
      : expanded
        ? `${suggestions.length} ${suggestions.length === 1 ? "resultado" : "resultados"}. Usa las flechas y Intro para elegir.`
        : searched && !suggestions.length
          ? "Sin resultados."
          : "";

  return (
    <section
      aria-labelledby="place-search-label"
      className={cn("rounded-2xl border border-line bg-lilac-soft p-4", className)}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="place-search-input" id="place-search-label" className={FIELD_LABEL}>
          Busca el lugar o la empresa
        </Label>
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <Input
            id="place-search-input"
            role="combobox"
            aria-expanded={expanded}
            aria-controls={LISTBOX_ID}
            aria-autocomplete="list"
            aria-activedescendant={expanded && active >= 0 ? `place-option-${active}` : undefined}
            aria-describedby="place-search-help"
            // Radix escucha Escape en el documento (captura): este atributo le dice que aquí
            // Escape solo cierra la lista, no el diálogo (ver onEscapeKeyDown en vendor-form-dialog).
            data-escape-guard={expanded ? "true" : undefined}
            className={cn(FIELD, "pl-10 pr-10")}
            placeholder="Por ejemplo: Finca Los Lavaderos de Rojas"
            value={query}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="search"
            onChange={(e) => {
              const value = e.target.value;
              skipSearchRef.current = "";
              setQuery(value);
              setFilled("");
              setError("");
              if (value.trim().length < MIN_CHARS) {
                setSuggestions([]);
                setSearching(false);
                setSearched(false);
                setOpen(false);
              } else {
                setSearching(true);
              }
            }}
            onKeyDown={onKeyDown}
            onFocus={() => {
              if (suggestions.length) setOpen(true);
            }}
            onBlur={(e) => {
              // Si el foco se va a una opción, no se cierra antes de tiempo.
              if (!e.relatedTarget || !(e.relatedTarget as HTMLElement).closest?.(`#${LISTBOX_ID}`)) setOpen(false);
            }}
          />
          {(searching || picking) && (
            <Loader2
              className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-ink-muted"
              aria-hidden="true"
            />
          )}
        </div>

        {/* Lista en el flujo del formulario (no flotante): no se recorta dentro del diálogo con scroll. */}
        <ul
          id={LISTBOX_ID}
          role="listbox"
          aria-label="Lugares encontrados"
          hidden={!expanded}
          className="max-h-60 overflow-y-auto rounded-xl border border-line-strong bg-field"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.placeId}
              id={`place-option-${i}`}
              role="option"
              aria-selected={i === active}
              className={cn(
                "flex cursor-pointer items-start gap-2.5 px-3 py-2.5",
                i === active ? "bg-lilac-soft" : "hover:bg-lilac-soft"
              )}
              // mousedown evita que el input pierda el foco antes del clic
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void pick(s)}
              onMouseMove={() => active !== i && setActive(i)}
            >
              <MapPinIcon className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink-strong">{s.primary}</span>
                {s.secondary && <span className="block truncate text-sm text-ink-muted">{s.secondary}</span>}
              </span>
            </li>
          ))}
        </ul>

        <p id="place-search-help" className="text-sm text-ink-muted">
          Elige un resultado de Google Maps y rellenamos los datos por ti; todo se puede editar después.
        </p>
        <p role="status" aria-live="polite" className="sr-only">
          {statusText}
        </p>
        {filled && !picking && (
          <p className="flex items-start gap-1.5 text-sm font-medium text-ink">
            <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
            <span>Datos de «{filled}» añadidos. Revísalos abajo.</span>
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm font-medium text-ink">
            {error}
          </p>
        )}

        <div className="mt-1">
          {!linkOpen ? (
            <button
              type="button"
              onClick={() => setLinkOpen(true)}
              className="text-sm text-ink-muted underline decoration-lilac decoration-2 underline-offset-4 outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-lilac"
            >
              ¿Tienes un enlace de Google Maps?
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="place-link-input" className={FIELD_LABEL}>
                Enlace de Google Maps
              </Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="place-link-input"
                  type="url"
                  inputMode="url"
                  placeholder="https://maps.app.goo.gl/…"
                  className={FIELD}
                  value={link}
                  autoFocus
                  autoComplete="off"
                  data-escape-guard="true"
                  aria-invalid={linkError ? true : undefined}
                  aria-describedby={linkError ? "place-link-error" : undefined}
                  onChange={(e) => {
                    setLink(e.target.value);
                    setLinkError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void resolveLink();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      e.stopPropagation();
                      setLinkOpen(false);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => void resolveLink()}
                  disabled={linkBusy || !link.trim()}
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-btn-soft px-5 text-sm font-medium text-ink-on-lilac outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-page disabled:opacity-60"
                >
                  {linkBusy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                  Rellenar
                </button>
              </div>
              {linkError && (
                <p id="place-link-error" role="alert" className="text-sm font-medium text-ink">
                  {linkError}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
