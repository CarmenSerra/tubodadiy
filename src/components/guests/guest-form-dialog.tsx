"use client";

import * as React from "react";
import { Loader2, PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
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
import { DietPicker } from "@/components/guests/diet-picker";
import { GroupSelect } from "@/components/guests/group-select";
import { useRestoreFocus } from "@/components/timeline/use-restore-focus";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { addGuest, updateGuest } from "@/lib/firebase/mutations";
import type { DietId } from "@/lib/diets";
import type { Guest, RsvpStatus } from "@/lib/types";

const RSVP_OPTIONS: RsvpStatus[] = ["pending", "confirmed", "declined"];

interface GuestFormDialogProps {
  planId: string;
  guest?: Guest;
  trigger?: React.ReactNode;
  /** Grupos ya usados en el plan, que se ofrecen en el desplegable. */
  groups?: string[];
  /** Familias ya usadas en el plan, que se sugieren al escribir la familia. */
  households?: string[];
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
  households = [],
  defaultGroup,
  open: openProp,
  onOpenChange,
  returnFocusTo,
}: GuestFormDialogProps) {
  const { t } = useTranslation("guests");
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
              {t("form.addGuest")}
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
            households={households}
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
  households,
  defaultGroup,
  onDone,
}: {
  planId: string;
  guest?: Guest;
  groups: string[];
  households: string[];
  defaultGroup?: string;
  onDone: () => void;
}) {
  const { t } = useTranslation("guests");
  const isEdit = Boolean(guest);
  const [name, setName] = React.useState(guest?.name ?? "");
  const [groupName, setGroupName] = React.useState(guest?.groupName ?? defaultGroup ?? "");
  const [rsvpStatus, setRsvpStatus] = React.useState<RsvpStatus>(guest?.rsvpStatus ?? "pending");
  const [plusOne, setPlusOne] = React.useState(guest?.plusOne ?? false);
  const [plusOneName, setPlusOneName] = React.useState(guest ? companionName(guest) : "");
  const [householdName, setHouseholdName] = React.useState(guest?.householdName ?? "");
  const [dietIds, setDietIds] = React.useState<DietId[]>(guest?.dietIds ?? []);
  const [needsLodging, setNeedsLodging] = React.useState(guest?.needsLodging ?? false);
  const [lodgingPlace, setLodgingPlace] = React.useState(guest?.lodgingPlace ?? "");
  const [needsTransport, setNeedsTransport] = React.useState(guest?.needsTransport ?? false);
  const [transportFrom, setTransportFrom] = React.useState(guest?.transportFrom ?? "");
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
        householdName: householdName.trim(),
        dietIds,
        needsLodging,
        lodgingPlace: needsLodging ? lodgingPlace.trim() : "",
        needsTransport,
        transportFrom: needsTransport ? transportFrom.trim() : "",
      };
      if (isEdit && guest) {
        await updateGuest(planId, guest.id, data);
        toast.success(t("form.updated"));
      } else {
        await addGuest(planId, data);
        toast.success(t("form.added"));
      }
      onDone();
    } catch {
      toast.error(t("form.saveError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle className={DIALOG_TITLE}>{isEdit ? t("form.editTitle") : t("form.newTitle")}</DialogTitle>
      </DialogHeader>
      <div className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="guest-name" className={FIELD_LABEL}>
            {t("form.name")}
          </Label>
          <Input
            id="guest-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("form.namePlaceholder")}
            required
            autoFocus
            className={FIELD}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="guest-group" className={FIELD_LABEL}>
            {t("form.group")}
          </Label>
          <GroupSelect id="guest-group" value={groupName} onChange={setGroupName} groups={groups} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="guest-household" className={FIELD_LABEL}>
            {t("form.household")}
          </Label>
          <Input
            id="guest-household"
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            placeholder={t("form.householdPlaceholder")}
            aria-describedby="guest-household-hint"
            list="guest-household-options"
            maxLength={80}
            autoComplete="off"
            className={FIELD}
          />
          <datalist id="guest-household-options">
            {households.map((h) => (
              <option key={h} value={h} />
            ))}
          </datalist>
          <p id="guest-household-hint" className="text-xs text-ink-muted">
            {t("form.householdHint")}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="guest-rsvp" className={FIELD_LABEL}>
            {t("form.response")}
          </Label>
          <Select value={rsvpStatus} onValueChange={(v) => setRsvpStatus(v as RsvpStatus)}>
            <SelectTrigger id="guest-rsvp" className={SELECT_TRIGGER}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={SELECT_CONTENT}>
              {RSVP_OPTIONS.map((value) => (
                <SelectItem key={value} value={value} className={SELECT_ITEM}>
                  {t(`rsvp.${value}`)}
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
          {t("form.plusOne")}
        </label>
        {plusOne && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="guest-plusone-name" className={FIELD_LABEL}>
              {t("form.plusOneName")}
            </Label>
            <Input
              id="guest-plusone-name"
              value={plusOneName}
              onChange={(e) => setPlusOneName(e.target.value)}
              placeholder={t("form.plusOnePlaceholder")}
              maxLength={120}
              autoComplete="off"
              className={FIELD}
            />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <span id="guest-diets-label" className={FIELD_LABEL}>
            {t("form.diets")}
          </span>
          <div role="group" aria-labelledby="guest-diets-label">
            <DietPicker value={dietIds} onChange={setDietIds} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="guest-diet" className={FIELD_LABEL}>
            {t("form.dietary")}
          </Label>
          <Input
            id="guest-diet"
            value={dietaryNotes}
            onChange={(e) => setDietaryNotes(e.target.value)}
            placeholder={t("form.dietaryPlaceholder")}
            className={FIELD}
          />
        </div>
        <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-ink-strong">
          <Checkbox
            checked={needsLodging}
            onCheckedChange={(v) => setNeedsLodging(Boolean(v))}
            className={CHECKBOX}
          />
          {t("form.needsLodging")}
        </label>
        {needsLodging && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="guest-lodging" className={FIELD_LABEL}>
              {t("form.lodgingPlace")}
            </Label>
            <Input
              id="guest-lodging"
              value={lodgingPlace}
              onChange={(e) => setLodgingPlace(e.target.value)}
              placeholder={t("form.lodgingPlaceholder")}
              maxLength={120}
              autoComplete="off"
              className={FIELD}
            />
          </div>
        )}
        <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-ink-strong">
          <Checkbox
            checked={needsTransport}
            onCheckedChange={(v) => setNeedsTransport(Boolean(v))}
            className={CHECKBOX}
          />
          {t("form.needsTransport")}
        </label>
        {needsTransport && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="guest-transport" className={FIELD_LABEL}>
              {t("form.transportFrom")}
            </Label>
            <Input
              id="guest-transport"
              value={transportFrom}
              onChange={(e) => setTransportFrom(e.target.value)}
              placeholder={t("form.transportPlaceholder")}
              maxLength={120}
              autoComplete="off"
              className={FIELD}
            />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="guest-notes" className={FIELD_LABEL}>
            {t("form.notes")}
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
          {t("form.cancel")}
        </button>
        <button type="submit" disabled={submitting} className={cn(CTA_PRIMARY, "disabled:opacity-60")}>
          {submitting && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          {t("form.save")}
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
  const { t } = useTranslation("guests");
  return <EditIconButton label={guestName ? t("form.editGuestNamed", { name: guestName }) : t("form.editTitle")} {...props} />;
}
