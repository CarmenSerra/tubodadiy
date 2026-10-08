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
import type { Vendor, VendorStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface VendorFormDialogProps {
  planId: string;
  vendor?: Vendor;
  /** Categoría preseleccionada al crear (p. ej. desde el hueco vacío de "Finca"). */
  defaultCategory?: string;
  trigger?: React.ReactNode;
}

export function VendorFormDialog({ planId, vendor, defaultCategory, trigger }: VendorFormDialogProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button type="button" className={CTA_PRIMARY}>
            <PlusIcon className="size-4" aria-hidden="true" />
            Añadir proveedor
          </button>
        )}
      </DialogTrigger>
      <DialogContent className={DIALOG_CONTENT}>
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

type Errors = Partial<Record<"name" | "category" | "email" | "photoUrl" | "mapsUrl" | "cost", string>>;

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
      {hint && !error && <p className="text-sm text-[#586C64]">{hint}</p>}
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
  const [location, setLocation] = React.useState(vendor?.location ?? "");
  const [mapsUrl, setMapsUrl] = React.useState(vendor?.mapsUrl ?? "");
  const [errors, setErrors] = React.useState<Errors>({});
  const [submitting, setSubmitting] = React.useState(false);

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
    if (mapsUrl.trim() && !isHttpUrl(mapsUrl)) {
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
      const data = {
        category: categorySelect === OTHER_CATEGORY ? canonicalCategory(customCategory) : categorySelect,
        name: name.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        cost: cost.trim() ? Number(cost) : null,
        status,
        notes,
        photoUrl: photoUrl.trim(),
        location: location.trim(),
        mapsUrl: mapsUrl.trim(),
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
        <DialogDescription className="text-sm text-[#586C64]">
          Solo el nombre es obligatorio; el resto puedes completarlo cuando quieras.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-6 flex flex-col gap-5">
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
              autoFocus
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

        <Field
          id="vendor-photo"
          label="Enlace de la foto"
          error={errors.photoUrl}
          hint="Pega el enlace de una imagen. Si no, verás una ilustración."
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

        <Field id="vendor-location" label="Dirección / ubicación">
          <Input
            id="vendor-location"
            className={FIELD}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            autoComplete="off"
          />
        </Field>

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
