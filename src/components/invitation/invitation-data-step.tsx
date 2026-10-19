"use client";

import Link from "next/link";
import { RefreshCwIcon, SparklesIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { FIELD } from "@/components/guests/brand-dialog";
import {
  AREA,
  Field,
  PlaceFields,
  StepCard,
  SWITCH,
} from "@/components/invitation/invitation-form-bits";
import { LIMITS, type InvitationContent, type InvitationPlace } from "@/components/invitation/invitation-model";
import { giftToolHref } from "@/components/plan/task-links";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { PlanGift } from "@/lib/types";

export interface GiftState {
  /** Hay algo que enseñar (datos de dinero o cosas en la lista). */
  available: boolean;
  planGift: PlanGift | null;
}

/** Paso 1 — Datos: nombres, fecha, lugares y regalo, en tarjetas. */
export function InvitationDataStep({
  planId,
  form,
  onSet,
  onPlace,
  badUrls,
  showFillNote,
  filledFromPlan,
  onRefresh,
  gift,
  readOnly = false,
}: {
  planId: string;
  form: InvitationContent;
  onSet: <K extends keyof InvitationContent>(key: K, value: InvitationContent[K]) => void;
  onPlace: (key: "ceremony" | "banquet", patch: Partial<InvitationPlace>) => void;
  badUrls: ("ceremony" | "banquet")[];
  /** Hay algo que rellenar o ya rellenado desde el plan. */
  showFillNote: boolean;
  /** Algún campo sigue valiendo lo que puso el plan. */
  filledFromPlan: boolean;
  onRefresh: () => void;
  gift: GiftState;
  /** Solo ver: sin enlace para configurar el regalo (se hace en el Resumen, editando). */
  readOnly?: boolean;
}) {
  const { t } = useTranslation("invitationPage");
  const giftIsList = gift.planGift?.mode === "list";

  return (
    <div className="flex flex-col gap-4">
      {showFillNote && (
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-raised px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="flex min-w-0 flex-1 items-start gap-2 text-sm text-ink-muted">
            <SparklesIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-lilac" />
            <span className="min-w-0">{filledFromPlan ? t("fill.filled") : t("fill.canFill")}</span>
          </p>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-medium text-ink outline-none ring-1 ring-line-strong transition-colors hover:bg-lilac-soft focus-visible:ring-2 focus-visible:ring-lilac"
          >
            <RefreshCwIcon aria-hidden="true" className="size-3.5" />
            {t("fill.refresh")}
          </button>
        </div>
      )}

      <StepCard title={t("couple.title")}>
        <Field label={t("couple.names")} htmlFor="inv-names">
          <Input
            id="inv-names"
            value={form.names}
            onChange={(e) => onSet("names", e.target.value)}
            maxLength={LIMITS.names}
            placeholder="Ana & Luis"
            autoComplete="off"
            className={FIELD}
          />
        </Field>
        <Field label={t("couple.message")} htmlFor="inv-message" hint={t("couple.messageHint")}>
          <Textarea
            id="inv-message"
            value={form.message}
            onChange={(e) => onSet("message", e.target.value)}
            maxLength={LIMITS.message}
            rows={4}
            className={AREA}
          />
        </Field>
      </StepCard>

      <StepCard title={t("when.title")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("when.date")} htmlFor="inv-date">
            <DatePicker id="inv-date" value={form.date} onChange={(v) => onSet("date", v)} className={FIELD} />
          </Field>
          <Field label={t("when.deadline")} htmlFor="inv-deadline" hint={t("when.deadlineHint")}>
            <DatePicker
              id="inv-deadline"
              value={form.rsvpDeadline}
              onChange={(v) => onSet("rsvpDeadline", v)}
              className={FIELD}
              placeholder={t("when.noDeadline")}
            />
          </Field>
        </div>
      </StepCard>

      <StepCard title={t("where.title")} note={t("where.note")}>
        <PlaceFields
          id="inv-ceremony"
          kind="ceremony"
          place={form.ceremony}
          onChange={(patch) => onPlace("ceremony", patch)}
          badUrl={badUrls.includes("ceremony")}
        />
        <PlaceFields
          id="inv-banquet"
          kind="banquet"
          place={form.banquet}
          onChange={(patch) => onPlace("banquet", patch)}
          badUrl={badUrls.includes("banquet")}
        />
      </StepCard>

      <StepCard title={t("gift.title")}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <label htmlFor="inv-gift" className="text-sm font-medium text-ink">
              {t("gift.label")}
            </label>
            <p id="inv-gift-help" className="mt-1 text-sm text-ink-muted">
              {gift.available
                ? giftIsList
                  ? t("gift.helpList")
                  : t("gift.helpMoney")
                : gift.planGift?.showOnInvitation
                  ? giftIsList
                    ? t("gift.emptyList")
                    : t("gift.emptyMoney")
                  : gift.planGift
                    ? t("gift.notShown")
                    : t("gift.notChosen")}
            </p>
            {!gift.available && !readOnly && (
              <Link
                href={giftToolHref(planId)}
                className="mt-2 inline-flex min-h-11 items-center rounded-md text-sm font-medium text-ink underline decoration-lilac decoration-2 underline-offset-4 outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-lilac"
              >
                {t("gift.configure")}
              </Link>
            )}
          </div>
          <Switch
            id="inv-gift"
            checked={gift.available && form.showGift}
            onCheckedChange={(v) => onSet("showGift", v)}
            disabled={!gift.available}
            aria-describedby="inv-gift-help"
            className={SWITCH}
          />
        </div>
      </StepCard>
    </div>
  );
}
