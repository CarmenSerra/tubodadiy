"use client";

import * as React from "react";
import {
  BanknoteIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  GiftIcon,
  ListChecksIcon,
  Loader2,
  PencilIcon,
  RepeatIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import { FIELD, FIELD_LABEL } from "@/components/guests/brand-dialog";
import { GIFT_LIST_FORM_ID, GiftListView } from "@/components/plan-tools/gift-list-view";
import {
  GIFT_MESSAGE_MAX,
  bizumError,
  formatBizum,
  formatIban,
  ibanError,
  maskIban,
  normalizeBizum,
  emptyGift,
  normalizeIban,
} from "@/components/plan-tools/gift-model";
import { ToolDialog } from "@/components/plan-tools/tool-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { usePlanContext } from "@/lib/context/plan-context";
import { saveGift, saveGiftMode } from "@/lib/firebase/plan-tools";
import type { GiftMode } from "@/lib/types";
import { cn } from "@/lib/utils";

const FORM_ID = "gift-form";

type View = "choose" | GiftMode;

export function GiftDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("tools");
  const { plan } = usePlanContext();
  const [saving, setSaving] = React.useState(false);
  // `null`: aún no se ha navegado; se abre en el modo elegido o, si no hay, en la elección.
  const [picked, setPicked] = React.useState<View | null>(null);
  const mode = plan?.gift?.mode ?? null;
  const view: View = picked ?? mode ?? "choose";

  function handleOpenChange(next: boolean) {
    if (!next) setPicked(null);
    onOpenChange(next);
  }

  return (
    <ToolDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t("planTools.gift.title")}
      description={t(`planTools.gift.descriptions.${view}`)}
      icon={<GiftIcon />}
      footer={
        view === "choose" ? (
          <button
            type="button"
            onClick={() => (mode ? setPicked(mode) : handleOpenChange(false))}
            className={CTA_SECONDARY}
          >
            {mode ? t("planTools.actions.back") : t("planTools.actions.cancel")}
          </button>
        ) : (
          <>
            <button type="button" onClick={() => handleOpenChange(false)} className={CTA_SECONDARY}>
              {view === "list" ? t("planTools.actions.close") : t("planTools.actions.cancel")}
            </button>
            <button
              type="submit"
              form={view === "money" ? FORM_ID : GIFT_LIST_FORM_ID}
              disabled={saving}
              className={cn(CTA_PRIMARY, "disabled:opacity-50")}
            >
              {saving && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
              {t("planTools.actions.save")}
            </button>
          </>
        )
      }
    >
      {open && view === "choose" && <GiftChoice onPick={setPicked} />}
      {open && view === "money" && (
        <GiftForm
          onClose={() => handleOpenChange(false)}
          onSavingChange={setSaving}
          onChangeMode={() => setPicked("choose")}
        />
      )}
      {open && view === "list" && (
        <GiftListView
          onClose={() => handleOpenChange(false)}
          onSavingChange={setSaving}
          onChangeMode={() => setPicked("choose")}
        />
      )}
    </ToolDialog>
  );
}

/** Textos en `tools:planTools.gift.choice.<modo>.title|text|points`. */
const CHOICES: { mode: GiftMode; icon: React.ReactNode }[] = [
  { mode: "money", icon: <BanknoteIcon aria-hidden="true" className="size-6" /> },
  { mode: "list", icon: <ListChecksIcon aria-hidden="true" className="size-6" /> },
];

function GiftChoice({ onPick }: { onPick: (view: View) => void }) {
  const { t } = useTranslation("tools");
  const { planId, plan } = usePlanContext();
  const gift = plan?.gift ?? null;
  const [busy, setBusy] = React.useState<GiftMode | null>(null);

  async function choose(mode: GiftMode) {
    setBusy(mode);
    try {
      await saveGiftMode(planId, gift, mode);
      onPick(mode);
    } catch {
      toast.error(t("planTools.gift.choice.error"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid gap-4 sm:grid-cols-2">
        {CHOICES.map((choice) => {
          const current = gift?.mode === choice.mode;
          const points = t(`planTools.gift.choice.${choice.mode}.points`, { returnObjects: true }) as unknown as string[];
          return (
            <li key={choice.mode} className="flex">
              <button
                type="button"
                onClick={() => void choose(choice.mode)}
                disabled={busy !== null}
                aria-describedby={`gift-choice-${choice.mode}`}
                className={cn(
                  "flex w-full flex-col items-start gap-3 rounded-2xl border bg-surface p-5 text-left transition-colors hover:bg-lilac-soft disabled:opacity-60",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                  current ? "border-lilac-edge bg-lilac-soft" : "border-line-strong"
                )}
              >
                <span className="flex w-full items-start justify-between gap-2">
                  <span className="inline-flex size-12 items-center justify-center rounded-full bg-btn-soft text-ink-on-lilac">
                    {busy === choice.mode ? <Loader2 aria-hidden="true" className="size-5 animate-spin" /> : choice.icon}
                  </span>
                  {current && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-cta px-2.5 py-0.5 text-xs font-medium text-on-cta">
                      <CheckIcon aria-hidden="true" className="size-3" />
                      {t("planTools.gift.choice.current")}
                    </span>
                  )}
                </span>
                <span className="font-display text-xl font-semibold leading-tight text-ink">{t(`planTools.gift.choice.${choice.mode}.title`)}</span>
                <span id={`gift-choice-${choice.mode}`} className="flex flex-col gap-2 text-sm text-ink-muted">
                  <span>{t(`planTools.gift.choice.${choice.mode}.text`)}</span>
                  <span className="flex flex-wrap gap-1.5">
                    {points.map((point) => (
                      <span key={point} className="rounded-full border border-line-strong px-2.5 py-0.5 text-xs text-ink">
                        {point}
                      </span>
                    ))}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-ink-muted">
        {t("planTools.gift.choice.note")}
      </p>
    </div>
  );
}

function GiftForm({
  onClose,
  onSavingChange,
  onChangeMode,
}: {
  onClose: () => void;
  onSavingChange: (saving: boolean) => void;
  onChangeMode: () => void;
}) {
  const { t } = useTranslation("tools");
  const { planId, plan } = usePlanContext();
  const gift = plan?.gift ?? null;
  const [iban, setIban] = React.useState(formatIban(gift?.iban ?? ""));
  const [bizum, setBizum] = React.useState(formatBizum(gift?.bizum ?? ""));
  const [message, setMessage] = React.useState(gift?.message ?? "");
  const [show, setShow] = React.useState(gift?.showOnInvitation ?? false);
  // Con un IBAN ya guardado se enseña oculto; «Cambiar» abre el campo.
  const [editingIban, setEditingIban] = React.useState(!gift?.iban);
  const [revealed, setRevealed] = React.useState(false);
  const [touched, setTouched] = React.useState({ iban: false, bizum: false });

  const ibanProblem = ibanError(iban);
  const bizumProblem = bizumError(bizum);
  const hasData = Boolean(normalizeIban(iban) || normalizeBizum(bizum));
  const ibanInputRef = React.useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (ibanProblem || bizumProblem) {
      setTouched({ iban: true, bizum: true });
      setEditingIban(true);
      toast.error(t("planTools.gift.money.reviewErrors"));
      return;
    }
    const clean = {
      ...(gift ?? emptyGift("money")),
      mode: "money" as const,
      iban: normalizeIban(iban),
      bizum: normalizeBizum(bizum),
      message: message.trim(),
      showOnInvitation: show,
    };
    const empty = !clean.iban && !clean.bizum && !clean.message;
    onSavingChange(true);
    try {
      await saveGift(planId, clean);
      toast.success(empty ? t("planTools.gift.money.cleared") : t("planTools.gift.money.saved"));
      onClose();
    } catch {
      toast.error(t("planTools.gift.money.saveError"));
    } finally {
      onSavingChange(false);
    }
  }

  const ibanShown = formatIban(iban);

  return (
    <form id={FORM_ID} onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <p className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-line bg-lilac-soft px-3.5 py-3 text-sm text-ink">
        <span>
          {t("planTools.gift.money.intro")}
        </span>
        <button
          type="button"
          onClick={onChangeMode}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full text-sm font-medium text-ink underline decoration-lilac decoration-2 underline-offset-4 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <RepeatIcon aria-hidden="true" className="size-3.5" />
          {t("planTools.gift.money.switchToList")}
        </button>
      </p>

      <div className="flex flex-col gap-2">
        <Label htmlFor="gift-iban" className={FIELD_LABEL}>
          {t("planTools.gift.money.ibanLabel")}
        </Label>
        {editingIban ? (
          <>
            <Input
              ref={ibanInputRef}
              id="gift-iban"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              onBlur={() => {
                setTouched((t) => ({ ...t, iban: true }));
                // Se agrupa de cuatro en cuatro al salir del campo (no al teclear, para no mover el cursor).
                setIban((v) => formatIban(v));
              }}
              placeholder="ES91 2100 0418 4502 0005 1332"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-invalid={touched.iban && ibanProblem ? true : undefined}
              aria-describedby="gift-iban-help"
              className={cn(FIELD, "font-mono uppercase tracking-wide placeholder:normal-case")}
            />
            <p
              id="gift-iban-help"
              role={touched.iban && ibanProblem ? "alert" : undefined}
              className={cn("text-sm", touched.iban && ibanProblem ? "text-danger" : "text-ink-muted")}
            >
              {touched.iban && ibanProblem
                ? t(`planTools.gift.money.ibanErrors.${ibanProblem}`)
                : t("planTools.gift.money.ibanHelp")}
            </p>
          </>
        ) : (
          <div
            id="gift-iban"
            className="flex items-center gap-2 rounded-xl border border-line-strong bg-field py-1.5 pl-3.5 pr-1.5"
          >
            <span className="min-w-0 flex-1 truncate font-mono text-[0.8125rem] text-ink-strong sm:text-sm sm:tracking-wide">
              <span className="sr-only">{revealed ? t("planTools.gift.money.ibanShown", { iban: ibanShown }) : t("planTools.gift.money.ibanHidden")}</span>
              <span aria-hidden="true">{revealed ? ibanShown : maskIban(iban)}</span>
            </span>
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              aria-pressed={revealed}
              aria-label={revealed ? t("planTools.gift.money.hideIban") : t("planTools.gift.money.showIban")}
              title={revealed ? t("planTools.gift.money.hideIban") : t("planTools.gift.money.showIban")}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-lilac-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac"
            >
              {revealed ? <EyeOffIcon aria-hidden="true" className="size-4" /> : <EyeIcon aria-hidden="true" className="size-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingIban(true);
                setRevealed(false);
                requestAnimationFrame(() => ibanInputRef.current?.focus());
              }}
              aria-label={t("planTools.gift.money.changeIban")}
              title={t("planTools.gift.money.changeIban")}
              className="inline-flex size-10 shrink-0 items-center justify-center gap-1.5 rounded-full text-sm font-medium text-ink transition-colors hover:bg-lilac-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac sm:w-auto sm:px-3"
            >
              <PencilIcon aria-hidden="true" className="size-3.5" />
              <span aria-hidden="true" className="hidden sm:inline">
                {t("planTools.gift.money.change")}
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="gift-bizum" className={FIELD_LABEL}>
          {t("planTools.gift.money.bizumLabel")}
        </Label>
        <Input
          id="gift-bizum"
          type="tel"
          value={bizum}
          onChange={(e) => setBizum(e.target.value)}
          onBlur={() => {
            setTouched((t) => ({ ...t, bizum: true }));
            if (!bizumError(bizum) && bizum) setBizum(formatBizum(bizum));
          }}
          placeholder="612 345 678"
          autoComplete="off"
          aria-invalid={touched.bizum && bizumProblem ? true : undefined}
          aria-describedby="gift-bizum-help"
          className={FIELD}
        />
        <p
          id="gift-bizum-help"
          role={touched.bizum && bizumProblem ? "alert" : undefined}
          className={cn("text-sm", touched.bizum && bizumProblem ? "text-danger" : "text-ink-muted")}
        >
          {touched.bizum && bizumProblem ? t("planTools.gift.money.bizumError") : t("planTools.gift.money.bizumHelp")}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="gift-message" className={FIELD_LABEL}>
            {t("planTools.gift.messageLabel")}
          </Label>
          {!message.trim() && (
            <button
              type="button"
              onClick={() => setMessage(t("planTools.gift.money.messageExample"))}
              className="rounded text-sm font-medium text-ink underline decoration-lilac decoration-2 underline-offset-4 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              {t("planTools.gift.useExample")}
            </button>
          )}
        </div>
        <Textarea
          id="gift-message"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, GIFT_MESSAGE_MAX))}
          rows={4}
          placeholder={t("planTools.gift.messagePlaceholder")}
          aria-describedby="gift-message-count"
          className={cn(FIELD, "h-auto min-h-28 py-2.5")}
        />
        <p id="gift-message-count" className="text-right text-xs tabular-nums text-ink-muted">
          {message.length}/{GIFT_MESSAGE_MAX}
        </p>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-2xl border border-line p-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Label htmlFor="gift-show" className="text-sm font-medium text-ink">
            {t("planTools.gift.showOnInvitation")}
          </Label>
          <p id="gift-show-help" className="text-sm text-ink-muted">
            {show
              ? t("planTools.gift.money.showOn")
              : t("planTools.gift.showOff")}
            {show && !hasData && ` ${t("planTools.gift.money.addFirst")}`}
          </p>
        </div>
        <Switch
          id="gift-show"
          checked={show}
          onCheckedChange={setShow}
          aria-describedby="gift-show-help"
          className="mt-0.5 h-6 w-11 data-[state=checked]:bg-cta data-[state=unchecked]:bg-line-strong focus-visible:ring-lilac [&>span]:size-5 [&>span]:data-[state=checked]:translate-x-[1.375rem] [&>span]:data-[state=unchecked]:translate-x-0.5"
        />
      </div>
    </form>
  );
}
