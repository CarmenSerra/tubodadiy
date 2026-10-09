"use client";

import * as React from "react";
import { Loader2, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import {
  CHECKBOX,
  DIALOG_CONTENT,
  DIALOG_TITLE,
  EditIconButton,
  FIELD,
  FIELD_LABEL,
  SELECT_CONTENT,
  SELECT_ITEM,
  SELECT_TRIGGER,
} from "@/components/guests/brand-dialog";
import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
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
import { companionName, visibleNotes } from "@/components/guests/guest-filters";
import { GroupSelect } from "@/components/guests/group-select";
import { useRestoreFocus } from "@/components/timeline/use-restore-focus";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
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
  /** Grupos ya usados en el plan, que se ofrecen en el desplegable. */
  groups?: string[];
  /** Grupo con el que arranca un invitado nuevo (p. ej. desde el panel de ideas). */
  defaultGroup?: string;
  /** Modo controlado (sin botón propio): lo abre quien lo usa. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Modo controlado: a quién devolver el foco al cerrar (por defecto, a quien lo tenía al abrir). */
  returnFocusTo?: HTMLElement | null;
}

export function GuestFormDialog({
  planId,
  guest,
  trigger,
  groups = [],
  defaultGroup,
  open: openProp,
  onOpenChange,
  returnFocusTo,
}: GuestFormDialogProps) {
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
              <PlusIcon aria-hidden="true" className="size-4" />
              Añadir invitado
            </button>
          )}
        </DialogTrigger>
      )}
      <DialogContent
        aria-describedby={undefined}
        className={DIALOG_CONTENT}
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
        {/* Mounted only while open so form fields always start from fresh values. */}
        {open && (
          <GuestForm
            planId={planId}
            guest={guest}
            groups={groups}
            defaultGroup={defaultGroup}
            onDone={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function GuestForm({
  planId,
  guest,
  groups,
  defaultGroup,
  onDone,
}: {
  planId: string;
  guest?: Guest;
  groups: string[];
  defaultGroup?: string;
  onDone: () => void;
}) {
  const isEdit = Boolean(guest);
  const [name, setName] = React.useState(guest?.name ?? "");
  const [groupName, setGroupName] = React.useState(guest?.groupName ?? defaultGroup ?? "");
  const [rsvpStatus, setRsvpStatus] = React.useState<RsvpStatus>(guest?.rsvpStatus ?? "pending");
  const [plusOne, setPlusOne] = React.useState(guest?.plusOne ?? false);
  const [plusOneName, setPlusOneName] = React.useState(guest ? companionName(guest) : "");
  const [dietaryNotes, setDietaryNotes] = React.useState(guest?.dietaryNotes ?? "");
  const [notes, setNotes] = React.useState(guest ? visibleNotes(guest) : "");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const data = {
        name: name.trim(),
        groupName: groupName.trim(),
        rsvpStatus,
        plusOne,
        plusOneName: plusOne ? plusOneName.trim() : "",
        dietaryNotes,
        notes,
      };
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
        <DialogTitle className={DIALOG_TITLE}>{isEdit ? "Editar invitado" : "Nuevo invitado"}</DialogTitle>
      </DialogHeader>
      <div className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="guest-name" className={FIELD_LABEL}>
            Nombre
          </Label>
          <Input
            id="guest-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre y apellidos"
            required
            autoFocus
            className={FIELD}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="guest-group" className={FIELD_LABEL}>
            Grupo
          </Label>
          <GroupSelect id="guest-group" value={groupName} onChange={setGroupName} groups={groups} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="guest-rsvp" className={FIELD_LABEL}>
            Respuesta
          </Label>
          <Select value={rsvpStatus} onValueChange={(v) => setRsvpStatus(v as RsvpStatus)}>
            <SelectTrigger id="guest-rsvp" className={SELECT_TRIGGER}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={SELECT_CONTENT}>
              {RSVP_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className={SELECT_ITEM}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-ink-strong">
          <Checkbox
            checked={plusOne}
            onCheckedChange={(v) => setPlusOne(Boolean(v))}
            className={CHECKBOX}
          />
          Lleva acompañante
        </label>
        {plusOne && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="guest-plusone-name" className={FIELD_LABEL}>
              Nombre del acompañante
            </Label>
            <Input
              id="guest-plusone-name"
              value={plusOneName}
              onChange={(e) => setPlusOneName(e.target.value)}
              placeholder="Opcional: se puede añadir más tarde"
              maxLength={120}
              autoComplete="off"
              className={FIELD}
            />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="guest-diet" className={FIELD_LABEL}>
            Notas dietéticas
          </Label>
          <Input
            id="guest-diet"
            value={dietaryNotes}
            onChange={(e) => setDietaryNotes(e.target.value)}
            placeholder="Vegetariano, alergias..."
            className={FIELD}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="guest-notes" className={FIELD_LABEL}>
            Notas
          </Label>
          <Textarea
            id="guest-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={cn(FIELD, "h-auto min-h-20 py-2.5")}
          />
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
export function EditGuestTrigger({
  guestName,
  ...props
}: React.ComponentProps<"button"> & { guestName?: string }) {
  return <EditIconButton label={guestName ? `Editar a ${guestName}` : "Editar invitado"} {...props} />;
}
