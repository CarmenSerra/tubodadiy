"use client";

import * as React from "react";
import {
  AlertCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  Loader2,
  PlusIcon,
  SearchIcon,
  StarIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Skeleton } from "@/components/dashboard/ui";
import { useRestoreFocus } from "@/components/timeline/use-restore-focus";
import { Collapse } from "@/components/ui/collapse";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DIALOG_CONTENT, DIALOG_TITLE, FIELD_LABEL, ROW_FOCUS } from "@/components/vendors/vendor-brand";
import { isHttpUrl, isLooseEmail } from "@/components/vendors/vendor-model";
import { VendorIllustration } from "@/components/vendors/vendor-illustration";
import { addVendor, updateVendor } from "@/lib/firebase/mutations";
import {
  mapsUrlForPlace,
  placeDetails,
  searchVenues,
  siteInfo,
} from "@/lib/places/client";
import { COMMUNITIES, PROVINCES } from "@/lib/places/spain";
import type { VenueResult } from "@/lib/places/types";
import { cn } from "@/lib/utils";

/** Estilos opcionales: se añaden al texto de la búsqueda («finca para bodas en Toledo rústica»). */
const STYLE_OPTIONS = [
  "rústica",
  "con jardín",
  "junto al mar",
  "cortijo",
  "masía",
  "palacio",
  "en la montaña",
  "moderna",
] as const;

/** Espera tras el último cambio de filtro antes de buscar. */
const DEBOUNCE_MS = 500;
/** Una llamada por provincia: se limita para no disparar decenas de búsquedas. */
const MAX_PROVINCES = 10;

interface SearchResult {
  key: string;
  places: VenueResult[];
  /** Token de la siguiente página, por provincia (solo las que tienen más). */
  tokens: Record<string, string>;
  /** Provincias cuya búsqueda falló. */
  failed: string[];
  /** Todas las búsquedas fallaron. */
  error: boolean;
}

function mergeUnique(current: VenueResult[], incoming: VenueResult[]): VenueResult[] {
  const seen = new Set(current.map((p) => p.placeId));
  const merged = [...current];
  for (const place of incoming) {
    if (seen.has(place.placeId)) continue;
    seen.add(place.placeId);
    merged.push(place);
  }
  return merged;
}

function sortProvinces(list: string[]): string[] {
  return [...list].sort((a, b) => PROVINCES.indexOf(a) - PROVINCES.indexOf(b));
}

/** «Toledo, Comunidad de Madrid»: las comunidades completas por su nombre y el resto, por provincia. */
function summarize(provinces: string[]): string {
  const selected = new Set(provinces);
  const parts: string[] = [];
  const covered = new Set<string>();
  for (const community of COMMUNITIES) {
    if (community.provinces.length > 0 && community.provinces.every((p) => selected.has(p))) {
      parts.push(community.name);
      community.provinces.forEach((p) => covered.add(p));
    }
  }
  for (const province of provinces) if (!covered.has(province)) parts.push(province);
  return parts.join(", ");
}

const chip = (active: boolean, disabled = false) =>
  cn(
    "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors",
    ROW_FOCUS,
    active
      ? "border-lilac bg-lilac-mid font-semibold text-ink"
      : "border-line-strong bg-raised font-medium text-ink-muted hover:bg-lilac-soft",
    disabled && "pointer-events-none opacity-50"
  );

interface VenueDiscoveryProps {
  planId: string;
  /** placeId de los proveedores ya guardados: esas fincas salen marcadas como guardadas. */
  existingPlaceIds: Set<string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VenueDiscovery({ planId, existingPlaceIds, open, onOpenChange }: VenueDiscoveryProps) {
  const restoreFocus = useRestoreFocus();
  const [provinces, setProvinces] = React.useState<string[]>([]);
  const [styles, setStyles] = React.useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = React.useState(true);
  const [attempt, setAttempt] = React.useState(0);
  // Los resultados viven solo en el estado del componente: no se guarda nada de Google.
  const [result, setResult] = React.useState<SearchResult | null>(null);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [saving, setSaving] = React.useState<Set<string>>(new Set());

  const style = styles.join(" ");
  const wantedKey = `${attempt}#${provinces.join("|")}#${style}`;
  const searching = provinces.length > 0;
  const loading = open && searching && result?.key !== wantedKey;
  const current = result?.key === wantedKey ? result : null;

  // Búsqueda automática al cambiar el filtro (con espera), una llamada por provincia.
  React.useEffect(() => {
    if (!open || provinces.length === 0) return;
    let cancelled = false;
    const key = `${attempt}#${provinces.join("|")}#${style}`;
    const timer = window.setTimeout(async () => {
      const outcomes = await Promise.allSettled(
        provinces.map((province) => searchVenues(province, style || undefined))
      );
      if (cancelled) return;
      let places: VenueResult[] = [];
      const tokens: Record<string, string> = {};
      const failed: string[] = [];
      outcomes.forEach((outcome, i) => {
        if (outcome.status === "fulfilled") {
          places = mergeUnique(places, outcome.value.places);
          if (outcome.value.nextPageToken) tokens[provinces[i]] = outcome.value.nextPageToken;
        } else {
          failed.push(provinces[i]);
        }
      });
      setResult({ key, places, tokens, failed, error: failed.length === provinces.length });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, provinces, style, attempt]);

  async function loadMore() {
    if (!current || loadingMore) return;
    const { key, tokens } = current;
    const entries = Object.entries(tokens);
    if (entries.length === 0) return;
    setLoadingMore(true);
    const outcomes = await Promise.allSettled(
      entries.map(([province, token]) => searchVenues(province, style || undefined, token))
    );
    const nextTokens: Record<string, string> = {};
    let incoming: VenueResult[] = [];
    let anyFailed = false;
    outcomes.forEach((outcome, i) => {
      const [province, token] = entries[i];
      if (outcome.status === "fulfilled") {
        incoming = mergeUnique(incoming, outcome.value.places);
        if (outcome.value.nextPageToken) nextTokens[province] = outcome.value.nextPageToken;
      } else {
        anyFailed = true;
        nextTokens[province] = token; // se podrá reintentar
      }
    });
    setResult((prev) =>
      prev && prev.key === key
        ? { ...prev, places: mergeUnique(prev.places, incoming), tokens: nextTokens }
        : prev
    );
    setLoadingMore(false);
    if (anyFailed) toast.error("No se han podido cargar todas las fincas. Inténtalo de nuevo.");
  }

  function toggleProvince(province: string) {
    setProvinces((prev) =>
      prev.includes(province) ? prev.filter((p) => p !== province) : sortProvinces([...prev, province])
    );
  }

  function toggleCommunity(list: string[]) {
    setProvinces((prev) => {
      const all = list.every((p) => prev.includes(p));
      if (all) return prev.filter((p) => !list.includes(p));
      return sortProvinces([...new Set([...prev, ...list])]);
    });
  }

  function toggleStyle(value: string) {
    setStyles((prev) =>
      STYLE_OPTIONS.filter((s) => (s === value ? !prev.includes(s) : prev.includes(s)))
    );
  }

  async function save(venue: VenueResult) {
    if (saving.has(venue.placeId) || existingPlaceIds.has(venue.placeId)) return;
    setSaving((prev) => new Set(prev).add(venue.placeId));
    try {
      const details = await placeDetails(venue.placeId);
      const name = details.name || venue.name;
      const id = await addVendor(planId, {
        category: "Finca",
        name,
        contactEmail: "",
        contactPhone: details.phone ?? "",
        cost: null,
        status: "exploring",
        notes: "",
        photoUrl: "",
        location: details.address ?? "",
        mapsUrl: mapsUrlForPlace(venue.placeId, name),
        placeId: venue.placeId,
        address: details.address ?? "",
        website: details.website ?? "",
        municipality: details.municipality ?? venue.municipality ?? "",
        province: details.province ?? venue.province ?? "",
        community: details.community ?? "",
        country: details.country ?? "",
        placeKind: details.primaryType || venue.primaryType || "",
      });
      toast.success(`«${name}» guardada en Fincas`);
      if (isHttpUrl(details.website)) void completeFromSite(id, details.website);
    } catch {
      toast.error("No se ha podido guardar la finca. Inténtalo de nuevo.");
    } finally {
      setSaving((prev) => {
        const next = new Set(prev);
        next.delete(venue.placeId);
        return next;
      });
    }
  }

  /** Mejor esfuerzo: correo y foto (solo enlazada) de la web de la finca. */
  async function completeFromSite(vendorId: string, website: string) {
    try {
      const info = await siteInfo(website);
      const data: { contactEmail?: string; photoUrl?: string } = {};
      if (info.email && isLooseEmail(info.email)) data.contactEmail = info.email.trim();
      if (info.image && isHttpUrl(info.image)) data.photoUrl = info.image.trim();
      if (Object.keys(data).length > 0) await updateVendor(planId, vendorId, data);
    } catch {
      /* la web puede no responder: la finca ya está guardada */
    }
  }

  const canLoadMore = !!current && Object.keys(current.tokens).length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(DIALOG_CONTENT, "max-w-3xl")}
        onOpenAutoFocus={restoreFocus.onOpenAutoFocus}
        onCloseAutoFocus={restoreFocus.onCloseAutoFocus}
      >
        <DialogHeader>
          <DialogTitle className={cn(DIALOG_TITLE, "pr-8")}>Descubre fincas para tu boda</DialogTitle>
          <DialogDescription className="text-sm text-ink-muted">
            Elige dónde buscar y guarda las que te gusten: se añaden a tus proveedores como «Explorando».
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span id="venue-where-label" className={FIELD_LABEL}>
              Dónde
            </span>
            <button
              type="button"
              aria-labelledby="venue-where-label venue-where-value"
              aria-expanded={pickerOpen}
              aria-controls="venue-where-panel"
              onClick={() => setPickerOpen((v) => !v)}
              className={cn(
                "flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-line-strong bg-field px-3 text-left text-base shadow-none sm:text-sm",
                ROW_FOCUS
              )}
            >
              <span
                id="venue-where-value"
                className={cn("min-w-0 truncate", provinces.length ? "text-ink-strong" : "text-ink-placeholder")}
              >
                {provinces.length ? summarize(provinces) : "Elige provincias o comunidades"}
              </span>
              <ChevronDownIcon
                className={cn("size-4 shrink-0 text-ink-muted transition-transform", pickerOpen && "rotate-180")}
                aria-hidden="true"
              />
            </button>
            <Collapse id="venue-where-panel" open={pickerOpen}>
              <ProvincePicker selected={provinces} onToggleProvince={toggleProvince} onToggleCommunity={toggleCommunity} />
            </Collapse>
          </div>

          <div className="flex flex-col gap-2">
            <span id="venue-style-label" className={FIELD_LABEL}>
              Estilo <span className="font-normal text-ink-muted">(opcional)</span>
            </span>
            <div role="group" aria-labelledby="venue-style-label" className="flex flex-wrap gap-2">
              {STYLE_OPTIONS.map((option) => {
                const active = styles.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleStyle(option)}
                    className={chip(active)}
                  >
                    {active && <CheckIcon className="size-3.5" aria-hidden="true" />}
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-line pt-5" aria-live="polite">
          {!searching ? (
            <StateMessage
              icon={<SearchIcon className="size-5" aria-hidden="true" />}
              title="Elige una o varias provincias para empezar"
              text="Buscaremos fincas para bodas en cada una y verás los resultados aquí."
            />
          ) : loading ? (
            <ResultsSkeleton />
          ) : current?.error ? (
            <StateMessage
              icon={<AlertCircleIcon className="size-5" aria-hidden="true" />}
              title="No hemos podido buscar fincas ahora mismo"
              text="Puede ser un fallo de conexión. Inténtalo de nuevo en unos segundos."
              action={
                <button type="button" onClick={() => setAttempt((a) => a + 1)} className={chip(false)}>
                  Reintentar
                </button>
              }
            />
          ) : current && current.places.length === 0 ? (
            <StateMessage
              icon={<SearchIcon className="size-5" aria-hidden="true" />}
              title="No hemos encontrado fincas con estos filtros"
              text="Prueba a quitar algún estilo o a añadir más provincias."
            />
          ) : current ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <p className="text-sm text-ink-muted">
                  {current.places.length === 1 ? "1 finca" : `${current.places.length} fincas`}
                </p>
                <GoogleAttribution />
              </div>
              {current.failed.length > 0 && (
                <p className="text-sm text-ink-muted">
                  No hemos podido consultar {current.failed.join(", ")}. El resto de resultados sí se muestran.
                </p>
              )}
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {current.places.map((venue) => (
                  <VenueCard
                    key={venue.placeId}
                    venue={venue}
                    saved={existingPlaceIds.has(venue.placeId)}
                    saving={saving.has(venue.placeId)}
                    onSave={() => void save(venue)}
                  />
                ))}
              </ul>
              {canLoadMore && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => void loadMore()}
                    disabled={loadingMore}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-btn-soft px-6 text-sm font-medium text-ink-on-lilac transition-opacity hover:opacity-90 disabled:opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  >
                    {loadingMore && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                    {loadingMore ? "Cargando…" : "Ver más"}
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Atribución obligatoria de Google al mostrar datos de Places sin mapa: texto «Google Maps» sin alterar. */
function GoogleAttribution() {
  return (
    <p className="flex items-baseline gap-1.5 text-xs text-ink-muted">
      <span>Resultados de</span>
      <span
        translate="no"
        lang="en"
        className="whitespace-nowrap text-xs font-normal text-[#5F6368] dark:text-white"
        style={{ fontFamily: "Roboto, Arial, sans-serif" }}
      >
        Google Maps
      </span>
    </p>
  );
}

function ProvincePicker({
  selected,
  onToggleProvince,
  onToggleCommunity,
}: {
  selected: string[];
  onToggleProvince: (province: string) => void;
  onToggleCommunity: (provinces: string[]) => void;
}) {
  const full = selected.length >= MAX_PROVINCES;
  return (
    <div className="mt-1 flex max-h-72 flex-col gap-4 overflow-y-auto rounded-xl border border-line bg-surface p-3 sm:p-4">
      <p className="text-xs text-ink-muted">
        Elige una comunidad para marcar todas sus provincias, o provincias sueltas. Máximo {MAX_PROVINCES}.
      </p>
      {COMMUNITIES.map((community) => {
        const count = community.provinces.filter((p) => selected.includes(p)).length;
        const all = count === community.provinces.length;
        const missing = community.provinces.length - count;
        const single = community.provinces.length === 1;
        const communityDisabled = !all && selected.length + missing > MAX_PROVINCES;
        return (
          <div key={community.name} className="flex flex-col gap-2">
            <div>
              <button
                type="button"
                aria-pressed={all}
                disabled={communityDisabled}
                onClick={() => onToggleCommunity(community.provinces)}
                className={cn(chip(all || count > 0, communityDisabled), count > 0 && !all && "font-semibold")}
              >
                {all && <CheckIcon className="size-3.5" aria-hidden="true" />}
                {community.name}
                {!single && count > 0 && !all && (
                  <span className="text-xs font-normal">
                    {count}/{community.provinces.length}
                  </span>
                )}
              </button>
            </div>
            {!single && (
              <div className="flex flex-wrap gap-2 pl-1 sm:pl-3">
                {community.provinces.map((province) => {
                  const active = selected.includes(province);
                  return (
                    <button
                      key={province}
                      type="button"
                      aria-pressed={active}
                      disabled={!active && full}
                      onClick={() => onToggleProvince(province)}
                      className={chip(active, !active && full)}
                    >
                      {active && <CheckIcon className="size-3.5" aria-hidden="true" />}
                      {province}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function VenueCard({
  venue,
  saved,
  saving,
  onSave,
}: {
  venue: VenueResult;
  saved: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  const place = venue.municipality
    ? venue.province
      ? `${venue.municipality} (${venue.province})`
      : venue.municipality
    : venue.province;
  const rating =
    typeof venue.rating === "number"
      ? venue.rating.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
      : null;

  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-line bg-raised">
      <div className="aspect-[16/9] w-full overflow-hidden bg-lilac-soft">
        <VendorIllustration seed={venue.placeId} kind={venue.primaryType} className="h-full w-full" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h4 className="line-clamp-2 font-display text-lg leading-snug font-semibold text-ink-strong">
            {venue.name}
          </h4>
          {place && <p className="mt-1 text-sm text-ink-muted">{place}</p>}
          {rating && (
            <p className="mt-1 flex items-center gap-1 text-sm text-ink" aria-label={`Valoración ${rating} de 5`}>
              <StarIcon className="size-3.5 fill-current" aria-hidden="true" />
              <span aria-hidden="true">{rating}</span>
            </p>
          )}
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
          <a
            href={mapsUrlForPlace(venue.placeId, venue.name)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink hover:bg-lilac-soft",
              ROW_FOCUS
            )}
          >
            Ver en Maps
            <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
            <span className="sr-only">(se abre en una pestaña nueva)</span>
          </a>
          {saved ? (
            <span className="inline-flex h-10 items-center gap-1.5 rounded-full bg-sage-pale px-4 text-sm font-medium text-ink">
              <CheckIcon className="size-4" aria-hidden="true" />
              Guardada
            </span>
          ) : (
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              aria-label={`Guardar ${venue.name}`}
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-cta px-5 text-sm font-medium text-on-cta transition-opacity hover:opacity-90 disabled:opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <PlusIcon className="size-4" aria-hidden="true" />
              )}
              {saving ? "Guardando…" : "Guardar"}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function ResultsSkeleton() {
  return (
    <div role="status" aria-label="Buscando fincas" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-line bg-raised">
          <Skeleton className="aspect-[16/9] w-full rounded-none bg-lilac-soft" />
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex justify-end pt-1">
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StateMessage({
  icon,
  title,
  text,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-2 py-8 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-lilac-soft text-ink">{icon}</span>
      <p className="font-display text-lg font-semibold text-ink-strong">{title}</p>
      <p className="max-w-sm text-sm text-ink-muted">{text}</p>
      {action}
    </div>
  );
}
