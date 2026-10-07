"use client";

import * as React from "react";
import { Loader2, PlusIcon, PencilIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { addGuest, updateGuest } from "@/lib/firebase/mutations";
import type { Guest, RsvpStatus } from "@/lib/types";

const RSVP_OPTIONS: { value: RsvpStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "confirmed", label: "Confirmado" },
  { value: "declined", label: "No asiste" },
];

interface GuestFormDialogProps {
  planId: string;
  guest?: Guest;
  trigger?: React.ReactNode;
}

export function GuestFormDialog({ planId, guest, trigger }: GuestFormDialogProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <PlusIcon />
            Añadir invitado
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        {/* Mounted only while open so form fields always start from fresh values. */}
        {open && (
          <GuestForm planId={planId} guest={guest} onDone={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function GuestForm({
  planId,
  guest,
  onDone,
}: {
  planId: string;
  guest?: Guest;
  onDone: () => void;
}) {
  const isEdit = Boolean(guest);
  const [name, setName] = React.useState(guest?.name ?? "");
  const [groupName, setGroupName] = React.useState(guest?.groupName ?? "");
  const [rsvpStatus, setRsvpStatus] = React.useState<RsvpStatus>(guest?.rsvpStatus ?? "pending");
  const [plusOne, setPlusOne] = React.useState(guest?.plusOne ?? false);
  const [dietaryNotes, setDietaryNotes] = React.useState(guest?.dietaryNotes ?? "");
  const [notes, setNotes] = React.useState(guest?.notes ?? "");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const data = { name: name.trim(), groupName: groupName.trim(), rsvpStatus, plusOne, dietaryNotes, notes };
      if (isEdit && guest) {
        await updateGuest(planId, guest.id, data);
        toast.success("Invitado actualizado");
      } else {
        await addGuest(planId, data);
        toast.success("Invitado añadido");
      }
      onDone();
    } catch {
      toast.error("No se ha podido guardar el invitado.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Editar invitado" : "Nuevo invitado"}</DialogTitle>
      </DialogHeader>
      <div className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="guest-name">Nombre</Label>
          <Input id="guest-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="guest-group">Grupo / familia</Label>
          <Input
            id="guest-group"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Familia de la novia, amigos..."
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="guest-rsvp">Estado RSVP</Label>
          <Select value={rsvpStatus} onValueChange={(v) => setRsvpStatus(v as RsvpStatus)}>
            <SelectTrigger id="guest-rsvp">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RSVP_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={plusOne} onCheckedChange={(v) => setPlusOne(Boolean(v))} />
          Lleva acompañante
        </label>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="guest-diet">Notas dietéticas</Label>
          <Input
            id="guest-diet"
            value={dietaryNotes}
            onChange={(e) => setDietaryNotes(e.target.value)}
            placeholder="Vegetariano, alergias..."
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="guest-notes">Notas</Label>
          <Textarea id="guest-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
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

export function EditGuestTrigger() {
  return (
    <Button variant="ghost" size="icon" className="size-8">
      <PencilIcon className="size-4" />
    </Button>
  );
}
