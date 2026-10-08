"use client";

import * as React from "react";
import { Loader2, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import { DIALOG_CONTENT, DIALOG_TITLE, EditIconButton, FIELD, FIELD_LABEL } from "@/components/guests/brand-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createDestination, updateDestination } from "@/lib/firebase/honeymoon";
import { normalizeUrl, type Destination } from "@/lib/honeymoon-model";
import { cn, parseAmount } from "@/lib/utils";

export const TEXTAREA = cn(FIELD, "h-auto min-h-24 resize-y py-2.5 leading-relaxed");

export function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="text-sm font-medium text-danger">
      {children}
    </p>
  );
}

export function DestinationFormDialog({
  planId,
  destination,
  trigger,
}: {
  planId: string;
  destination?: Destination;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button type="button" className={CTA_PRIMARY}>
            <PlusIcon aria-hidden="true" className="size-4" />
            Añadir destino
          </button>
        )}
      </DialogTrigger>
      <DialogContent aria-describedby={undefined} className={DIALOG_CONTENT}>
        {open && <DestinationForm planId={planId} destination={destination} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function DestinationForm({
  planId,
  destination,
  onDone,
}: {
  planId: string;
  destination?: Destination;
  onDone: () => void;
}) {
  const isEdit = Boolean(destination);
  const [name, setName] = React.useState(destination?.name ?? "");
  const [country, setCountry] = React.useState(destination?.country ?? "");
  const [price, setPrice] = React.useState(destination?.approxPrice != null ? String(destination.approxPrice) : "");
  const [notes, setNotes] = React.useState(destination?.notes ?? "");
  const [link, setLink] = React.useState(destination?.link ?? "");
  const [imageUrl, setImageUrl] = React.useState(destination?.imageUrl ?? "");
  const [errors, setErrors] = React.useState<{ price?: string; link?: string; imageUrl?: string }>({});
  const [submitting, setSubmitting] = React.useState(false);
  const uid = React.useId();
  const id = (field: string) => `${uid}-${field}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const next: typeof errors = {};
    let approxPrice: number | null = null;
    if (price.trim()) {
      approxPrice = parseAmount(price);
      if (Number.isNaN(approxPrice) || approxPrice < 0) next.price = "Escribe un importe válido, por ejemplo 1800.";
    }
    const cleanLink = normalizeUrl(link);
    if (link.trim() && !cleanLink) next.link = "El enlace no es válido. Debe empezar por http o https.";
    const cleanImage = normalizeUrl(imageUrl);
    if (imageUrl.trim() && !cleanImage) next.imageUrl = "La dirección de la imagen no es válida.";
    setErrors(next);
    if (next.price || next.link || next.imageUrl) {
      const first = next.price ? "price" : next.link ? "link" : "imageUrl";
      document.getElementById(id(first))?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        name: name.trim(),
        country: country.trim(),
        notes: notes.trim(),
        link: cleanLink,
        imageUrl: cleanImage,
        approxPrice,
      };
      if (destination) {
        await updateDestination(planId, destination.id, data);
        toast.success("Destino actualizado");
      } else {
        await createDestination(planId, data);
        toast.success("Destino añadido");
      }
      onDone();
    } catch {
      toast.error("No se ha podido guardar el destino.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <DialogHeader>
        <DialogTitle className={DIALOG_TITLE}>{isEdit ? "Editar destino" : "Nuevo destino"}</DialogTitle>
      </DialogHeader>
      <div className="mt-5 flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={id("name")} className={FIELD_LABEL}>
              Destino
            </Label>
            <Input
              id={id("name")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bali, Maldivas, Costa Rica…"
              required
              autoFocus
              autoComplete="off"
              className={FIELD}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={id("country")} className={FIELD_LABEL}>
              País
            </Label>
            <Input
              id={id("country")}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Indonesia"
              autoComplete="off"
              className={FIELD}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={id("price")} className={FIELD_LABEL}>
            Precio aproximado (€)
          </Label>
          <Input
            id={id("price")}
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="2500"
            aria-invalid={Boolean(errors.price)}
            aria-describedby={errors.price ? id("price-error") : undefined}
            className={FIELD}
          />
          {errors.price && <FieldError id={id("price-error")}>{errors.price}</FieldError>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={id("notes")} className={FIELD_LABEL}>
            Notas
          </Label>
          <Textarea
            id={id("notes")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Mejor época, qué nos atrae, cómo se llega…"
            className={TEXTAREA}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={id("link")} className={FIELD_LABEL}>
            Enlace <span className="font-normal text-ink-muted">(opcional)</span>
          </Label>
          <Input
            id={id("link")}
            type="url"
            inputMode="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://…"
            aria-invalid={Boolean(errors.link)}
            aria-describedby={errors.link ? id("link-error") : undefined}
            className={FIELD}
          />
          {errors.link && <FieldError id={id("link-error")}>{errors.link}</FieldError>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={id("image")} className={FIELD_LABEL}>
            Imagen <span className="font-normal text-ink-muted">(dirección web, opcional)</span>
          </Label>
          <Input
            id={id("image")}
            type="url"
            inputMode="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…/foto.jpg"
            aria-invalid={Boolean(errors.imageUrl)}
            aria-describedby={errors.imageUrl ? id("imageUrl-error") : id("image-help")}
            className={FIELD}
          />
          {errors.imageUrl ? (
            <FieldError id={id("imageUrl-error")}>{errors.imageUrl}</FieldError>
          ) : (
            <p id={id("image-help")} className="text-sm text-ink-muted">
              Se verá como miniatura. Sin imagen, se muestra un dibujo.
            </p>
          )}
        </div>
      </div>
      <DialogFooter className="mt-6 gap-2 sm:gap-3">
        <button type="button" onClick={onDone} className={cn(CTA_SECONDARY, "h-11")}>
          Cancelar
        </button>
        <button type="submit" disabled={submitting} className={cn(CTA_PRIMARY, "disabled:opacity-60")}>
          {submitting && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          Guardar
        </button>
      </DialogFooter>
    </form>
  );
}

/** Disparador de edición; recibe las props que le inyecta DialogTrigger. */
export function EditDestinationTrigger({ name, ...props }: React.ComponentProps<"button"> & { name: string }) {
  return <EditIconButton label={`Editar «${name}»`} {...props} />;
}
