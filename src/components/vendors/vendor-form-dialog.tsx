"use client";

import * as React from "react";
import { Loader2, PlusIcon, PencilIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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

const VENDOR_CATEGORIES = [
  "Catering",
  "Fotografía",
  "Vídeo",
  "Música / DJ",
  "Flores",
  "Pastel",
  "Transporte",
  "Decoración",
  "Otros",
];

const STATUS_OPTIONS: { value: VendorStatus; label: string }[] = [
  { value: "considering", label: "Valorando" },
  { value: "contacted", label: "Contactado" },
  { value: "booked", label: "Contratado" },
  { value: "declined", label: "Descartado" },
];

interface VendorFormDialogProps {
  planId: string;
  vendor?: Vendor;
  trigger?: React.ReactNode;
}

export function VendorFormDialog({ planId, vendor, trigger }: VendorFormDialogProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <PlusIcon />
            Añadir proveedor
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        {open && (
          <VendorForm planId={planId} vendor={vendor} onDone={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function VendorForm({
  planId,
  vendor,
  onDone,
}: {
  planId: string;
  vendor?: Vendor;
  onDone: () => void;
}) {
  const isEdit = Boolean(vendor);
  const [category, setCategory] = React.useState(vendor?.category ?? VENDOR_CATEGORIES[0]);
  const [name, setName] = React.useState(vendor?.name ?? "");
  const [contactEmail, setContactEmail] = React.useState(vendor?.contactEmail ?? "");
  const [contactPhone, setContactPhone] = React.useState(vendor?.contactPhone ?? "");
  const [cost, setCost] = React.useState(vendor?.cost != null ? String(vendor.cost) : "");
  const [status, setStatus] = React.useState<VendorStatus>(vendor?.status ?? "considering");
  const [notes, setNotes] = React.useState(vendor?.notes ?? "");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const data = {
        category,
        name: name.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        cost: cost ? Number(cost) : null,
        status,
        notes,
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

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
      </DialogHeader>
      <div className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="vendor-name">Nombre</Label>
          <Input id="vendor-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="vendor-category">Categoría</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="vendor-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VENDOR_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vendor-email">Email de contacto</Label>
            <Input
              id="vendor-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vendor-phone">Teléfono</Label>
            <Input
              id="vendor-phone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vendor-cost">Coste (€)</Label>
            <Input
              id="vendor-cost"
              type="number"
              min="0"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vendor-status">Estado</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as VendorStatus)}>
              <SelectTrigger id="vendor-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="vendor-notes">Notas</Label>
          <Textarea id="vendor-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
      </div>
      <DialogFooter className="mt-6">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" />}
          Guardar
        </Button>
      </DialogFooter>
    </form>
  );
}

export function EditVendorTrigger() {
  return (
    <Button variant="ghost" size="icon" className="size-8">
      <PencilIcon className="size-4" />
    </Button>
  );
}
