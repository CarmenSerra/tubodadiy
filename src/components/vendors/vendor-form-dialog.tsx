"use client";

import * as React from "react";
import { Loader2, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { CTA_PRIMARY } from "@/components/dashboard/ui";
import {
  DIALOG_CONTENT,
  DIALOG_TITLE,
  FIELD,
  FIELD_ERROR,
  FIELD_LABEL,
  SELECT_CONTENT,
  SELECT_ITEM,
  SELECT_TRIGGER,
} from "@/components/vendors/vendor-brand";
import {
  CATEGORY_OPTIONS,
  OTHER_CATEGORY,
  canonicalCategory,
  isHttpUrl,
  isLooseEmail,
} from "@/components/vendors/vendor-model";
import { useRestoreFocus } from "@/components/timeline/use-restore-focus";
import { PhotoUpload } from "@/components/vendors/photo-upload";
import { PlaceSearch } from "@/components/vendors/place-search";
import { VENDOR_STATUS_OPTIONS } from "@/components/vendors/vendor-status";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { addVendor, updateVendor } from "@/lib/firebase/mutations";
import { mapsUrlForPlace, siteInfo } from "@/lib/places/client";
import { PROVINCES, communityOf, normalizeProvince } from "@/lib/places/spain";
import type { PlaceDetails } from "@/lib/places/types";
import type { Vendor, VendorStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface VendorFormDialogProps {
  planId: string;
  vendor?: Vendor;
  /** Categoría preseleccionada al crear (p. ej. desde el hueco vacío de "Finca"). */
  defaultCategory?: string;
  trigger?: React.ReactNode;
  /** Modo controlado (sin botón propio): lo abre quien lo usa, p. ej. el panel de ideas. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Modo controlado: a quién devolver el foco al cerrar (por defecto, a quien lo tenía al abrir). */
  returnFocusTo?: HTMLElement | null;
}

export function VendorFormDialog({
  planId,
  vendor,
  defaultCategory,
  trigger,
  open: openProp,
  onOpenChange,
  returnFocusTo,
}: VendorFormDialogProps) {
  const [openState, setOpenState] = React.useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : openState;
  const setOpen = controlled ? (onOpenChange ?? (() => {})) : setOpenState;
  // Sin DialogTrigger, Radix no sabe a dónde devolver el foco: se recuerda quién lo tenía.
  const restoreFocus = useRestoreFocus();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!controlled && (
        <DialogTrigger asChild>
          {trigger ?? (
            <button type="button" className={CTA_PRIMARY}>
              <PlusIcon className="size-4" aria-hidden="true" />
              Añadir proveedor
            </button>
          )}
        </DialogTrigger>
      )}
      <DialogContent
        className={DIALOG_CONTENT}
        // Escape dentro del buscador cierra su lista (o el campo del enlace), no el diálogo.
        onEscapeKeyDown={(event) => {
          if ((event.target as HTMLElement | null)?.closest?.('[data-escape-guard="true"]')) {
            event.preventDefault();
          }
        }}
        onOpenAutoFocus={controlled ? restoreFocus.onOpenAutoFocus : undefined}
        onCloseAutoFocus={
          controlled
            ? (event) => {
                if (returnFocusTo?.isConnected) {
                  event.preventDefault();
                  returnFocusTo.focus();
                } else {
                  restoreFocus.onCloseAutoFocus(event);
                }
              }
            : undefined
        }
      >
        {open && (
          <VendorForm
            planId={planId}
            vendor={vendor}
            defaultCategory={defaultCategory}
            onDone={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type Errors = Partial<
  Record<"name" | "category" | "email" | "photoUrl" | "mapsUrl" | "cost" | "website", string>
>;

/** Valor interno de "Sin provincia" en el desplegable (Radix no admite valores vacíos). */
const NO_PROVINCE = "__none";

/** Añade https:// si la web se escribió sin esquema ("mifinca.es"). */
function normalizeWebsite(value: string): string {
  const v = value.trim();
  if (!v) return "";
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`;
}

function Field({
  id,
  label,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </Label>
      {children}
      {hint && !error && <p className="text-sm text-ink-muted">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className={FIELD_ERROR}>
          {error}
        </p>
      )}
    </div>
  );
}

function VendorForm({
  planId,
  vendor,
  defaultCategory,
  onDone,
}: {
  planId: string;
  vendor?: Vendor;
  defaultCategory?: string;
  onDone: () => void;
}) {
  const isEdit = Boolean(vendor);
  const initialCategory = canonicalCategory(vendor?.category ?? defaultCategory ?? CATEGORY_OPTIONS[0]);
  const isKnown = (CATEGORY_OPTIONS as readonly string[]).includes(initialCategory);

  const [categorySelect, setCategorySelect] = React.useState(isKnown ? initialCategory : OTHER_CATEGORY);
  const [customCategory, setCustomCategory] = React.useState(isKnown ? "" : initialCategory);
  const [name, setName] = React.useState(vendor?.name ?? "");
  const [contactEmail, setContactEmail] = React.useState(vendor?.contactEmail ?? "");
  const [contactPhone, setContactPhone] = React.useState(vendor?.contactPhone ?? "");
  const [cost, setCost] = React.useState(vendor?.cost != null ? String(vendor.cost) : "");
  const [status, setStatus] = React.useState<VendorStatus>(vendor?.status ?? "exploring");
  const [notes, setNotes] = React.useState(vendor?.notes ?? "");
  const [photoUrl, setPhotoUrl] = React.useState(vendor?.photoUrl ?? "");
  const [mapsUrl, setMapsUrl] = React.useState(vendor?.mapsUrl ?? "");
  const [placeId, setPlaceId] = React.useState(vendor?.placeId ?? "");
  const [placeKind, setPlaceKind] = React.useState(vendor?.placeKind ?? "");
  const [address, setAddress] = React.useState(vendor?.address ?? vendor?.location ?? "");
  const [website, setWebsite] = React.useState(vendor?.website ?? "");
  const [municipality, setMunicipality] = React.useState(vendor?.municipality ?? "");
  const [province, setProvince] = React.useState(vendor?.province ?? "");
  const [community, setCommunity] = React.useState(vendor?.community ?? "");
  const [country, setCountry] = React.useState(vendor?.country ?? "");
  const [photoData, setPhotoData] = React.useState(vendor?.photoData ?? "");
  const [errors, setErrors] = React.useState<Errors>({});
  const [submitting, setSubmitting] = React.useState(false);

  // Evita que el rastreo en segundo plano de una web antigua rellene un lugar ya cambiado.
  const siteRequest = React.useRef(0);
  const mounted = React.useRef(true);
  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  function applyPlace(place: PlaceDetails) {
    if (place.name) setName(place.name);
    if (place.address) setAddress(place.address);
    if (place.phone) setContactPhone(place.phone);
    if (place.website) setWebsite(place.website);
    if (place.municipality) setMunicipality(place.municipality);
    const normalized = place.province ? (normalizeProvince(place.province) ?? place.province) : "";
    if (normalized) {
      setProvince(normalized);
      setCommunity(communityOf(normalized) ?? place.community ?? "");
    } else if (place.community) {
      setCommunity(place.community);
    }
    if (place.country) setCountry(place.country);
    setPlaceId(place.placeId);
    setPlaceKind(place.primaryType ?? "");

    // Segundo plano: correo y foto enlazada desde su web, solo si siguen vacíos. Si falla, silencio.
    const request = ++siteRequest.current;
    if (!place.website || !isHttpUrl(place.website)) return;
    siteInfo(place.website)
      .then((info) => {
        if (!mounted.current || request !== siteRequest.current) return;
        if (info.email) setContactEmail((cur) => (cur.trim() ? cur : (info.email ?? "")));
        if (info.image && isHttpUrl(info.image)) setPhotoUrl((cur) => (cur.trim() ? cur : (info.image ?? "")));
      })
      .catch(() => {});
  }

  function handleProvinceChange(value: string) {
    const next = value === NO_PROVINCE ? "" : value;
    setProvince(next);
    setCommunity(next ? (communityOf(next) ?? "") : "");
  }

  function validate(): Errors {
    const next: Errors = {};
    if (!name.trim()) next.name = "Ponle un nombre para reconocerlo.";
    if (categorySelect === OTHER_CATEGORY && !customCategory.trim()) {
      next.category = "Escribe el nombre de la categoría.";
    }
    if (contactEmail.trim() && !isLooseEmail(contactEmail)) {
      next.email = "Revisa el correo electrónico: debería parecerse a nombre@dominio.com.";
    }
    if (photoUrl.trim() && !isHttpUrl(photoUrl)) {
      next.photoUrl = "El enlace debe empezar por http:// o https://.";
    }
    if (website.trim() && !isHttpUrl(normalizeWebsite(website))) {
      next.website = "Escribe una web válida, por ejemplo https://mifinca.es.";
    }
    if (!placeId && mapsUrl.trim() && !isHttpUrl(mapsUrl)) {
      next.mapsUrl = "El enlace debe empezar por http:// o https://.";
    }
    if (cost.trim() && (Number.isNaN(Number(cost)) || Number(cost) < 0)) {
      next.cost = "Escribe un importe válido, sin símbolos.";
    }
    return next;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      const finalName = name.trim();
      const finalAddress = address.trim();
      const finalProvince = province.trim();
      // Con lugar de Google el enlace se construye solo; sin él, vale el manual.
      const finalMapsUrl = placeId ? mapsUrlForPlace(placeId, finalName) : mapsUrl.trim();
      // Siempre cadenas ("" para vaciar): Firestore no admite undefined.
      const data = {
        category: categorySelect === OTHER_CATEGORY ? canonicalCategory(customCategory) : categorySelect,
        name: finalName,
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        cost: cost.trim() ? Number(cost) : null,
        status,
        notes,
        photoUrl: photoUrl.trim(),
        // `location` se mantiene igual que `address` para quien aún lea el campo antiguo.
        location: finalAddress,
        address: finalAddress,
        mapsUrl: finalMapsUrl,
        placeId,
        placeKind: placeId ? placeKind : "",
        website: normalizeWebsite(website),
        municipality: municipality.trim(),
        province: finalProvince,
        community: finalProvince ? (communityOf(finalProvince) ?? community.trim()) : community.trim(),
        country: country.trim(),
        photoData,
      };
      if (isEdit && vendor) {
        await updateVendor(planId, vendor.id, data);
        toast.success("Proveedor actualizado");
      } else {
        await addVendor(planId, data);
        toast.success("Proveedor añadido");
      }
      onDone();
    } catch {
      toast.error("No se ha podido guardar el proveedor.");
    } finally {
      setSubmitting(false);
    }
  }

  const invalid = (key: keyof Errors) => (errors[key] ? true : undefined);
  const describedBy = (key: keyof Errors, id: string) => (errors[key] ? `${id}-error` : undefined);

  return (
    <form onSubmit={handleSubmit} noValidate>
      <DialogHeader className="gap-1.5 pr-6">
        <DialogTitle className={DIALOG_TITLE}>{isEdit ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
        <DialogDescription className="text-sm text-ink-muted">
          Solo el nombre es obligatorio; el resto puedes completarlo cuando quieras.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-6 flex flex-col gap-5">
        <PlaceSearch onPlace={applyPlace} />

        <Field id="vendor-name" label="Nombre" error={errors.name}>
          <Input
            id="vendor-name"
            className={FIELD}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={invalid("name")}
            aria-describedby={describedBy("name", "vendor-name")}
            autoComplete="off"
          />
        </Field>

        <Field id="vendor-category" label="Categoría" error={errors.category}>
          <Select value={categorySelect} onValueChange={setCategorySelect}>
            <SelectTrigger id="vendor-category" className={cn(SELECT_TRIGGER, "w-full")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={SELECT_CONTENT}>
              {CATEGORY_OPTIONS.map((c) => (
                <SelectItem key={c} value={c} className={SELECT_ITEM}>
                  {c}
                </SelectItem>
              ))}
              <SelectItem value={OTHER_CATEGORY} className={SELECT_ITEM}>
                Otra categoría…
              </SelectItem>
            </SelectContent>
          </Select>
          {categorySelect === OTHER_CATEGORY && (
            <Input
              aria-label="Nombre de la categoría"
              placeholder="Por ejemplo: Invitaciones"
              className={FIELD}
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              aria-invalid={invalid("category")}
              aria-describedby={describedBy("category", "vendor-category")}
              maxLength={40}
              // Con la categoría ya puesta (p. ej. desde Ideas), el foco se queda en el nombre.
              autoFocus={!customCategory}
            />
          )}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="vendor-cost" label="Precio (€)" error={errors.cost}>
            <Input
              id="vendor-cost"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              className={FIELD}
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              aria-invalid={invalid("cost")}
              aria-describedby={describedBy("cost", "vendor-cost")}
            />
          </Field>
          <Field id="vendor-status" label="Estado">
            <Select value={status} onValueChange={(v) => setStatus(v as VendorStatus)}>
              <SelectTrigger id="vendor-status" className={cn(SELECT_TRIGGER, "w-full")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={SELECT_CONTENT}>
                {VENDOR_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className={SELECT_ITEM}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="flex flex-col gap-2">
          <span className={FIELD_LABEL}>Foto</span>
          <PhotoUpload value={photoData} onChange={setPhotoData} />
        </div>

        <Field
          id="vendor-photo"
          label="O enlace de la foto"
          error={errors.photoUrl}
          hint="Pega el enlace de una imagen. Si no hay foto, verás una ilustración."
        >
          <Input
            id="vendor-photo"
            type="url"
            inputMode="url"
            placeholder="https://…"
            className={FIELD}
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            aria-invalid={invalid("photoUrl")}
            aria-describedby={describedBy("photoUrl", "vendor-photo")}
          />
        </Field>

        <Field id="vendor-website" label="Web" error={errors.website}>
          <Input
            id="vendor-website"
            type="url"
            inputMode="url"
            placeholder="https://…"
            className={FIELD}
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            aria-invalid={invalid("website")}
            aria-describedby={describedBy("website", "vendor-website")}
            autoComplete="off"
          />
        </Field>

        <Field id="vendor-address" label="Dirección">
          <Input
            id="vendor-address"
            className={FIELD}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            autoComplete="off"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="vendor-municipality" label="Municipio">
            <Input
              id="vendor-municipality"
              className={FIELD}
              value={municipality}
              onChange={(e) => setMunicipality(e.target.value)}
              autoComplete="off"
            />
          </Field>
          <Field
            id="vendor-province"
            label="Provincia"
            hint={community ? `Comunidad: ${community}` : undefined}
          >
            <Select value={province} onValueChange={handleProvinceChange}>
              <SelectTrigger id="vendor-province" className={cn(SELECT_TRIGGER, "w-full")}>
                <SelectValue placeholder="Elige provincia" />
              </SelectTrigger>
              <SelectContent className={SELECT_CONTENT}>
                <SelectItem value={NO_PROVINCE} className={SELECT_ITEM}>
                  Sin provincia
                </SelectItem>
                {province && !PROVINCES.includes(province) && (
                  <SelectItem value={province} className={SELECT_ITEM}>
                    {province}
                  </SelectItem>
                )}
                {PROVINCES.map((p) => (
                  <SelectItem key={p} value={p} className={SELECT_ITEM}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        {placeId ? (
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
            <span>Enlazado con Google Maps: el enlace se crea automáticamente.</span>
            <button
              type="button"
              onClick={() => {
                setPlaceId("");
                setPlaceKind("");
              }}
              className="font-medium text-ink underline decoration-lilac decoration-2 underline-offset-4 outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-lilac"
            >
              Desvincular
            </button>
          </p>
        ) : (
          <Field id="vendor-maps" label="Enlace de Google Maps" error={errors.mapsUrl}>
            <Input
              id="vendor-maps"
              type="url"
              inputMode="url"
              placeholder="https://maps.google.com/…"
              className={FIELD}
              value={mapsUrl}
              onChange={(e) => setMapsUrl(e.target.value)}
              aria-invalid={invalid("mapsUrl")}
              aria-describedby={describedBy("mapsUrl", "vendor-maps")}
            />
          </Field>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="vendor-email" label="Correo de contacto" error={errors.email}>
            <Input
              id="vendor-email"
              type="email"
              className={FIELD}
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              aria-invalid={invalid("email")}
              aria-describedby={describedBy("email", "vendor-email")}
            />
          </Field>
          <Field id="vendor-phone" label="Teléfono">
            <Input
              id="vendor-phone"
              type="tel"
              className={FIELD}
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </Field>
        </div>

        <Field id="vendor-notes" label="Notas">
          <Textarea
            id="vendor-notes"
            rows={3}
            className={cn(FIELD, "h-auto min-h-24 py-2.5")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
      </div>

      <DialogFooter className="mt-7">
        <button type="submit" disabled={submitting} className={cn(CTA_PRIMARY, "disabled:opacity-60")}>
          {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Guardar
        </button>
      </DialogFooter>
    </form>
  );
}
