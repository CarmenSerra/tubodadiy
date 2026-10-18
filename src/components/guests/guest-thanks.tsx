"use client";

import * as React from "react";
import { CheckIcon, GiftIcon, HeartHandshakeIcon, PencilIcon, WalletIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CARD, CTA_PRIMARY, CTA_SECONDARY, IconCircle, SECTION_TITLE } from "@/components/dashboard/ui";
import { ICON_BUTTON } from "@/components/guests/brand-dialog";
import { AddGiftButton, GiftDialog } from "@/components/guests/gift-dialog";
import { StatTile } from "@/components/guests/guest-summary";
import { hasGift, thankUnits, todayValue, type ThankUnit } from "@/components/guests/guest-model";
import { updateGuest } from "@/lib/firebase/mutations";
import { formatDateValue } from "@/lib/i18n/format";
import { useLanguage } from "@/lib/i18n/provider";
import type { Guest } from "@/lib/types";
import { toastWithUndo } from "@/lib/undo-toast";
import { cn, formatCurrency } from "@/lib/utils";

/**
 * Pestaña «Regalos»: regalos recibidos por invitado o familia y la lista de
 * agradecimientos pendientes. Marcar una familia como agradecida lo aplica a
 * todos sus regalos.
 */
export function GuestThanks({ planId, guests }: { planId: string; guests: Guest[] }) {
  const { t } = useTranslation("guests");
  const { lang } = useLanguage();
  const units = React.useMemo(() => thankUnits(guests), [guests]);
  const pending = units.filter((u) => !u.sent);
  const sent = units.filter((u) => u.sent);
  const giftCount = units.reduce((n, u) => n + u.guests.length, 0);
  const total = units.reduce((sum, u) => sum + u.amount, 0);
  const candidates = React.useMemo(() => guests.filter((g) => !hasGift(g)), [guests]);

  async function setSent(unit: ThankUnit, value: boolean) {
    const targets = unit.guests.filter((g) => g.thankYouSent !== value);
    const previous = targets.map((g) => ({ id: g.id, sent: g.thankYouSent, date: g.thankYouDate }));
    const date = todayValue();
    try {
      await Promise.all(
        targets.map((g) => updateGuest(planId, g.id, { thankYouSent: value, thankYouDate: value ? date : null }))
      );
    } catch {
      toast.error(t("gifts.saveError"));
      return;
    }
    toastWithUndo(value ? t("gifts.markedSent", { name: unit.label }) : t("gifts.markedPending", { name: unit.label }), async () => {
      await Promise.all(
        previous.map((p) => updateGuest(planId, p.id, { thankYouSent: p.sent, thankYouDate: p.date }))
      );
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div>
          <h2 className={SECTION_TITLE}>{t("gifts.title")}</h2>
          <p className="mt-1 text-sm text-ink-muted">{t("gifts.description")}</p>
        </div>
        <GiftDialog planId={planId} guests={candidates} trigger={<AddGiftButton />} />
      </div>

      {units.length === 0 ? (
        <div className={cn(CARD, "flex flex-col items-center px-6 py-12 text-center")}>
          <IconCircle tone="lilac" className="size-12 [&_svg]:size-6">
            <GiftIcon />
          </IconCircle>
          <h3 className="mt-4 font-display text-xl font-semibold text-ink">{t("gifts.empty.title")}</h3>
          <p className="mt-2 max-w-sm text-sm text-ink-muted">{t("gifts.empty.text")}</p>
        </div>
      ) : (
        <>
          <div className={cn("grid grid-cols-2 gap-3 sm:gap-4", total > 0 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
            <StatTile
              icon={<GiftIcon />}
              tone="lilac"
              label={t("gifts.summary.received")}
              value={giftCount}
              detail={t("gifts.summary.receivedDetail", { count: units.length })}
            />
            <StatTile
              icon={<HeartHandshakeIcon />}
              tone="sage"
              label={t("gifts.summary.pending")}
              value={pending.length}
              detail={t("gifts.summary.pendingDetail", { count: pending.length })}
            />
            <StatTile
              icon={<CheckIcon />}
              tone="sage"
              label={t("gifts.summary.sent")}
              value={sent.length}
              detail={t("gifts.summary.sentDetail")}
            />
            {total > 0 && (
              <StatTile
                icon={<WalletIcon />}
                tone="lilac"
                label={t("gifts.summary.money")}
                value={formatCurrency(total, lang)}
                detail={t("gifts.summary.moneyDetail")}
              />
            )}
          </div>

          <section aria-labelledby="thanks-pending-title" className="flex flex-col gap-3">
            <h3 id="thanks-pending-title" className="font-display text-lg font-semibold text-ink">
              {t("gifts.pending.title")}
            </h3>
            {pending.length === 0 ? (
              <p className={cn(CARD, "px-5 py-4 text-sm text-ink-muted")}>{t("gifts.pending.allDone")}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {pending.map((unit) => (
                  <UnitRow key={unit.key} planId={planId} unit={unit} onToggle={() => setSent(unit, true)} />
                ))}
              </ul>
            )}
          </section>

          {sent.length > 0 && (
            <section aria-labelledby="thanks-sent-title" className="flex flex-col gap-3">
              <h3 id="thanks-sent-title" className="font-display text-lg font-semibold text-ink">
                {t("gifts.sentList.title")}
              </h3>
              <ul className="flex flex-col gap-3">
                {sent.map((unit) => (
                  <UnitRow key={unit.key} planId={planId} unit={unit} onToggle={() => setSent(unit, false)} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function UnitRow({ planId, unit, onToggle }: { planId: string; unit: ThankUnit; onToggle: () => void }) {
  const { t } = useTranslation("guests");
  const { lang } = useLanguage();
  const date = unit.sentDate ? formatDateValue(unit.sentDate, lang) : null;
  return (
    <li className={cn(CARD, "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5")}>
      <div className="min-w-0 flex-1">
        <p className="break-words font-display text-lg font-semibold leading-snug text-ink-strong">
          {unit.label}
        </p>
        <ul className="mt-1 flex flex-col gap-0.5 text-sm text-ink-muted">
          {unit.guests.map((g) => (
            <li key={g.id} className="flex items-center gap-1">
              <span className="min-w-0 break-words">
                {unit.isHousehold && <span className="font-medium text-ink">{g.name}: </span>}
                {g.giftReceived.trim() || t("gifts.noDescription")}
                {g.giftAmount !== null && <> · {formatCurrency(g.giftAmount, lang)}</>}
              </span>
              <GiftDialog
                planId={planId}
                guest={g}
                trigger={
                  <button
                    type="button"
                    aria-label={t("gifts.editFor", { name: g.name })}
                    title={t("gifts.editFor", { name: g.name })}
                    className={cn(ICON_BUTTON, "shrink-0")}
                  >
                    <PencilIcon aria-hidden="true" />
                  </button>
                }
              />
            </li>
          ))}
        </ul>
        {unit.sent && (
          <p className="mt-1 text-xs text-ink-muted">
            {date ? t("gifts.sentOn", { date }) : t("gifts.sentNoDate")}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={cn(unit.sent ? cn(CTA_SECONDARY, "h-11") : CTA_PRIMARY, "shrink-0")}
      >
        {!unit.sent && <CheckIcon aria-hidden="true" className="size-4" />}
        {unit.sent ? t("gifts.markPending") : t("gifts.markSent")}
        <span className="sr-only"> — {unit.label}</span>
      </button>
    </li>
  );
}
