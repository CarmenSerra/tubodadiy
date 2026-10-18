"use client";

import * as React from "react";
import { GiftIcon, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  CHECKBOX,
  DIALOG_CONTENT,
  DIALOG_TITLE,
  FIELD,
  FIELD_LABEL,
  SELECT_CONTENT,
  SELECT_ITEM,
  SELECT_TRIGGER,
} from "@/components/guests/brand-dialog";
import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import { todayValue } from "@/components/guests/guest-model";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateGuest } from "@/lib/firebase/mutations";
import { useLanguage } from "@/lib/i18n/provider";
import type { Guest } from "@/lib/types";
import { cn, parseAmount } from "@/lib/utils";

/**
 * Diálogo para registrar (o editar) el regalo recibido de un invitado y si ya
 * se le dio las gracias. Sin `guest`, ofrece elegir a quién se lo regaló entre
 * `guests`.
 */
export function GiftDialog({
  planId,
  guests,
  guest,
  trigger,
}: {
  planId: string;
  /** Candidatos cuando no se pasa `guest` (los que aún no tienen regalo). */
  guests?: Guest[];
  guest?: Guest;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent aria-describedby={undefined} className={DIALOG_CONTENT}>
        {open && <GiftForm planId={planId} guests={guests ?? []} guest={guest} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function GiftForm({
  planId,
  guests,
  guest,
  onDone,
}: {
  planId: string;
  guests: Guest[];
  guest?: Guest;
  onDone: () => void;
}) {
  const { t } = useTranslation("guests");
  const { lang } = useLanguage();
  const [guestId, setGuestId] = React.useState(guest?.id ?? "");
  const [gift, setGift] = React.useState(guest?.giftReceived ?? "");
  const [amount, setAmount] = React.useState(guest?.giftAmount != null ? String(guest.giftAmount) : "");
  const [sent, setSent] = React.useState(guest?.thankYouSent ?? false);
  const [sentDate, setSentDate] = React.useState(guest?.thankYouDate ?? "");
  const [submitting, setSubmitting] = React.useState(false);
  const [amountError, setAmountError] = React.useState(false);

  const sorted = React.useMemo(
    () => [...guests].sort((a, b) => a.name.localeCompare(b.name, lang)),
    [guests, lang]
  );
  const editing = Boolean(guest && (guest.giftReceived.trim() || guest.giftAmount !== null));
  const target = guest ?? guests.find((g) => g.id === guestId);

  async function save(clear: boolean) {
    if (!target) return;
    let giftAmount: number | null = null;
    if (!clear && amount.trim()) {
      const parsed = parseAmount(amount, lang);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setAmountError(true);
        return;
      }
      giftAmount = parsed;
    }
    const giftReceived = clear ? "" : gift.trim();
    if (!clear && !giftReceived && giftAmount === null) return;
    setSubmitting(true);
    try {
      await updateGuest(planId, target.id, {
        giftReceived,
        giftAmount,
        thankYouSent: clear ? false : sent,
        thankYouDate: !clear && sent ? sentDate || todayValue() : null,
      });
      toast.success(clear ? t("gifts.removed") : t("gifts.saved"));
      onDone();
    } catch {
      toast.error(t("gifts.saveError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save(false);
      }}
    >
      <DialogHeader>
        <DialogTitle className={DIALOG_TITLE}>
          {guest ? t("gifts.dialog.editTitle", { name: guest.name }) : t("gifts.dialog.newTitle")}
        </DialogTitle>
      </DialogHeader>
      <div className="mt-5 flex flex-col gap-4">
        {!guest && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="gift-guest" className={FIELD_LABEL}>
              {t("gifts.dialog.from")}
            </Label>
            <Select value={guestId} onValueChange={setGuestId}>
              <SelectTrigger id="gift-guest" className={SELECT_TRIGGER}>
                <SelectValue placeholder={t("gifts.dialog.fromPlaceholder")} />
              </SelectTrigger>
              <SelectContent className={SELECT_CONTENT}>
                {sorted.map((g) => (
                  <SelectItem key={g.id} value={g.id} className={SELECT_ITEM}>
                    {g.name}
                    {g.householdName.trim() && ` · ${g.householdName.trim()}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="gift-what" className={FIELD_LABEL}>
            {t("gifts.dialog.what")}
          </Label>
          <Input
            id="gift-what"
            value={gift}
            onChange={(e) => setGift(e.target.value)}
            placeholder={t("gifts.dialog.whatPlaceholder")}
            maxLength={200}
            autoComplete="off"
            className={FIELD}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="gift-amount" className={FIELD_LABEL}>
            {t("gifts.dialog.amount")}
          </Label>
          <Input
            id="gift-amount"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setAmountError(false);
            }}
            inputMode="decimal"
            placeholder={t("gifts.dialog.amountPlaceholder")}
            aria-invalid={amountError || undefined}
            aria-describedby={amountError ? "gift-amount-error" : undefined}
            autoComplete="off"
            className={FIELD}
          />
          {amountError && (
            <p id="gift-amount-error" role="alert" className="text-xs text-ink">
              {t("gifts.dialog.amountError")}
            </p>
          )}
        </div>
        <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-ink-strong">
          <Checkbox
            checked={sent}
            onCheckedChange={(v) => {
              const on = Boolean(v);
              setSent(on);
              if (on && !sentDate) setSentDate(todayValue());
            }}
            className={CHECKBOX}
          />
          {t("gifts.dialog.thankYouSent")}
        </label>
        {sent && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="gift-date" className={FIELD_LABEL}>
              {t("gifts.dialog.thankYouDate")}
            </Label>
            <DatePicker
              id="gift-date"
              value={sentDate}
              onChange={setSentDate}
              className="h-11 rounded-xl border-line-strong bg-field text-base text-ink-strong shadow-none focus-visible:ring-lilac focus-visible:ring-offset-0 sm:text-sm"
            />
          </div>
        )}
      </div>
      <DialogFooter className="mt-6 gap-2 sm:gap-3">
        {editing && (
          <button
            type="button"
            disabled={submitting}
            onClick={() => void save(true)}
            className={cn(CTA_SECONDARY, "h-11 sm:mr-auto")}
          >
            {t("gifts.dialog.remove")}
          </button>
        )}
        <button type="button" onClick={onDone} className={cn(CTA_SECONDARY, "h-11")}>
          {t("form.cancel")}
        </button>
        <button
          type="submit"
          disabled={submitting || !target || (!gift.trim() && !amount.trim())}
          className={cn(CTA_PRIMARY, "disabled:opacity-60")}
        >
          {submitting && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          {t("form.save")}
        </button>
      </DialogFooter>
    </form>
  );
}

/** Disparador «Registrar regalo»; recibe las props que le inyecta DialogTrigger. */
export function AddGiftButton({ className, ...props }: React.ComponentProps<"button">) {
  const { t } = useTranslation("guests");
  return (
    <button type="button" {...props} className={cn(CTA_PRIMARY, className)}>
      <GiftIcon aria-hidden="true" className="size-4" />
      {t("gifts.add")}
    </button>
  );
}
