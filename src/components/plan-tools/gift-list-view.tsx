"use client";

import * as React from "react";
import { ExternalLinkIcon, Loader2, PlusIcon, RepeatIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import {
  CHECKBOX,
  DeleteIconButton,
  EditIconButton,
  FIELD,
  FIELD_LABEL,
  SELECT_CONTENT,
  SELECT_ITEM,
  SELECT_TRIGGER,
} from "@/components/guests/brand-dialog";
import { cleanUrl } from "@/components/invitation/invitation-model";
import {
  GIFT_ITEM_LIMITS,
  GIFT_ITEM_SUGGESTIONS,
  GIFT_MESSAGE_MAX,
  GIFT_PRIORITIES,
  emptyGift,
  giftListSummary,
  isGiftPriority,
  sortGiftItems,
  type GiftItem,
  type GiftItemInput,
  type GiftPriority,
} from "@/components/plan-tools/gift-model";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { usePlanContext } from "@/lib/context/plan-context";
import {
  addGiftItem,
  deleteGiftItem,
  restoreGiftItem,
  restoreGiftItemFields,
  setGiftItemAchieved,
  updateGiftItem,
} from "@/lib/firebase/gift-items";
import { giftItemsQuery, mapGiftItem } from "@/lib/firebase/gift-list";
import { saveGift } from "@/lib/firebase/plan-tools";
import { useCollection } from "@/lib/hooks/use-collection";
import type { Lang } from "@/lib/i18n/config";
import { useLanguage } from "@/lib/i18n/provider";
import { toastWithUndo } from "@/lib/undo-toast";
import { cn, formatCurrency, parseAmount } from "@/lib/utils";

export const GIFT_LIST_FORM_ID = "gift-list-form";

const NO_PRIORITY = "none";

type ItemForm = { kind: "new"; name: string } | { kind: "edit"; item: GiftItem };

/** Texto de un precio aproximado: «≈ 120 €». */
const approx = (price: number, lang: Lang) => `≈ ${formatCurrency(price, lang)}`;

function hostOf(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return link;
  }
}

function PriorityChip({ priority }: { priority: GiftPriority }) {
  const { t } = useTranslation("tools");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        priority === "high" && "bg-btn-soft text-ink-on-lilac",
        priority === "medium" && "bg-lilac-soft text-ink",
        priority === "low" && "border border-line-strong text-ink-muted"
      )}
    >
      {t(`planTools.gift.list.priorities.${priority}.label`)}
    </span>
  );
}

export function GiftListView({
  onChangeMode,
  onSavingChange,
  onClose,
}: {
  onChangeMode: () => void;
  onSavingChange: (saving: boolean) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation("tools");
  const { lang } = useLanguage();
  const { planId, plan } = usePlanContext();
  const gift = plan?.gift ?? null;
  const { data, loading, error } = useCollection(giftItemsQuery(planId), mapGiftItem);
  const items = React.useMemo(() => sortGiftItems(data), [data]);
  const summary = giftListSummary(items);

  const [form, setForm] = React.useState<ItemForm | null>(null);
  const [formKey, setFormKey] = React.useState(0);
  const [message, setMessage] = React.useState(gift?.listMessage ?? "");
  const [show, setShow] = React.useState(gift?.showOnInvitation ?? false);

  const openForm = (next: ItemForm) => {
    setForm(next);
    setFormKey((k) => k + 1);
  };

  async function handleSubmitItem(input: GiftItemInput) {
    if (form?.kind === "edit") {
      const before = form.item;
      try {
        await updateGiftItem(planId, before.id, input);
      } catch {
        toast.error(t("planTools.gift.list.errors.saveChanges"));
        return;
      }
      setForm(null);
      toastWithUndo(t("planTools.gift.list.toasts.changesSaved"), () => restoreGiftItemFields(planId, before));
      return;
    }
    try {
      const id = await addGiftItem(planId, input);
      setForm(null);
      toastWithUndo(t("planTools.gift.list.toasts.added", { name: input.name }), () => deleteGiftItem(planId, id));
    } catch {
      toast.error(t("planTools.gift.list.errors.add"));
    }
  }

  async function handleDelete(item: GiftItem) {
    try {
      await deleteGiftItem(planId, item.id);
      if (form?.kind === "edit" && form.item.id === item.id) setForm(null);
      toastWithUndo(t("planTools.gift.list.toasts.removed", { name: item.name }), () => restoreGiftItem(planId, item));
    } catch {
      toast.error(t("planTools.gift.list.errors.remove"));
    }
  }

  async function handleAchieved(item: GiftItem, achieved: boolean) {
    try {
      await setGiftItemAchieved(planId, item.id, achieved);
    } catch {
      toast.error(t("planTools.gift.list.errors.update"));
    }
  }

  async function handleSaveMessage(e: React.FormEvent) {
    e.preventDefault();
    onSavingChange(true);
    try {
      await saveGift(planId, {
        ...(gift ?? emptyGift("list")),
        mode: "list",
        listMessage: message.trim(),
        showOnInvitation: show,
      });
      toast.success(t("planTools.gift.list.toasts.saved"));
      onClose();
    } catch {
      toast.error(t("planTools.gift.list.errors.saveMessage"));
    } finally {
      onSavingChange(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-line bg-lilac-soft px-3.5 py-3 text-sm text-ink">
        <span>{t("planTools.gift.list.intro")}</span>
        <button
          type="button"
          onClick={onChangeMode}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full text-sm font-medium text-ink underline decoration-lilac decoration-2 underline-offset-4 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <RepeatIcon aria-hidden="true" className="size-3.5" />
          {t("planTools.gift.list.switchToMoney")}
        </button>
      </p>

      <section aria-labelledby="gift-list-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="flex flex-col gap-0.5">
            <h3 id="gift-list-title" className="font-display text-xl font-semibold text-ink">
              {t("planTools.gift.list.heading")}
            </h3>
            <p className="text-sm text-ink-muted" aria-live="polite">
              {summary.total === 0
                ? t("planTools.gift.list.summary.empty")
                : [
                    t("planTools.gift.list.summary.pending", { count: summary.pending }),
                    summary.achieved > 0 ? t("planTools.gift.list.summary.achieved", { count: summary.achieved }) : "",
                    summary.pendingPrice > 0
                      ? t("planTools.gift.list.summary.price", { price: formatCurrency(summary.pendingPrice, lang) })
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
            </p>
          </div>
          {!form && (
            <button type="button" onClick={() => openForm({ kind: "new", name: "" })} className={CTA_SECONDARY}>
              <PlusIcon aria-hidden="true" className="size-4" />
              {t("planTools.gift.list.addItem")}
            </button>
          )}
        </div>

        {form && (
          <GiftItemForm
            key={formKey}
            initial={form.kind === "edit" ? form.item : null}
            prefillName={form.kind === "new" ? form.name : ""}
            onCancel={() => setForm(null)}
            onSubmit={handleSubmitItem}
          />
        )}

        {error && (
          <p role="alert" className="text-sm text-danger">
            {t("planTools.gift.list.loadError")}
          </p>
        )}

        {loading ? (
          <div role="status" aria-label={t("planTools.gift.list.loading")} className="h-24 animate-pulse rounded-2xl bg-track motion-reduce:animate-none" />
        ) : items.length === 0 ? (
          !form && (
            <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-line-strong px-4 py-5">
              <p className="text-sm text-ink">
                {t("planTools.gift.list.emptyHint")}
              </p>
              <div className="flex flex-wrap gap-2">
                {GIFT_ITEM_SUGGESTIONS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => openForm({ kind: "new", name: t(`planTools.gift.list.suggestions.${key}`) })}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line-strong bg-field px-3.5 text-sm text-ink transition-colors hover:bg-lilac-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  >
                    <PlusIcon aria-hidden="true" className="size-3.5" />
                    {t(`planTools.gift.list.suggestions.${key}`)}
                  </button>
                ))}
              </div>
            </div>
          )
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-line">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-2 border-t border-line bg-surface py-1 pl-3 pr-1 first:border-t-0 sm:pl-4"
              >
                <Checkbox
                  checked={item.achieved}
                  onCheckedChange={(v) => void handleAchieved(item, v === true)}
                  aria-label={t("planTools.gift.list.haveAria", { name: item.name })}
                  title={t("planTools.gift.list.have")}
                  className={cn(CHECKBOX, "mt-3.5")}
                />
                <div className="min-w-0 flex-1 py-2.5">
                  <p
                    className={cn(
                      "break-words text-sm",
                      item.achieved ? "text-ink-muted line-through" : "font-medium text-ink-strong"
                    )}
                  >
                    {item.name}
                  </p>
                  {(item.priority || item.price !== null || item.link || item.achieved) && (
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-muted">
                      {item.achieved && <span className="font-medium text-ink">{t("planTools.gift.list.have")}</span>}
                      {item.priority && !item.achieved && <PriorityChip priority={item.priority} />}
                      {item.price !== null && <span className="tabular-nums">{approx(item.price, lang)}</span>}
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex max-w-full items-center gap-1 rounded text-ink underline decoration-lilac decoration-2 underline-offset-4 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac"
                        >
                          <ExternalLinkIcon aria-hidden="true" className="size-3 shrink-0" />
                          <span className="truncate">{hostOf(item.link)}</span>
                          <span className="sr-only"> {t("planTools.gift.list.newTab")}</span>
                        </a>
                      )}
                    </p>
                  )}
                  {item.note && <p className="mt-1 break-words text-xs text-ink-muted">{item.note}</p>}
                </div>
                <EditIconButton
                  label={t("planTools.gift.list.editAria", { name: item.name })}
                  className="mt-1.5"
                  onClick={() => openForm({ kind: "edit", item })}
                />
                <DeleteIconButton ariaLabel={t("planTools.gift.list.removeAria", { name: item.name })} onDelete={() => handleDelete(item)} />
              </li>
            ))}
          </ul>
        )}
        {items.length > 0 && (
          <p className="text-xs text-ink-muted">{t("planTools.gift.list.achievedHint")}</p>
        )}
      </section>

      <form id={GIFT_LIST_FORM_ID} onSubmit={handleSaveMessage} noValidate className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="gift-list-message" className={FIELD_LABEL}>
              {t("planTools.gift.messageLabel")}
            </Label>
            {!message.trim() && (
              <button
                type="button"
                onClick={() => setMessage(t("planTools.gift.list.messageExample").slice(0, GIFT_MESSAGE_MAX))}
                className="rounded text-sm font-medium text-ink underline decoration-lilac decoration-2 underline-offset-4 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                {t("planTools.gift.useExample")}
              </button>
            )}
          </div>
          <Textarea
            id="gift-list-message"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, GIFT_MESSAGE_MAX))}
            rows={4}
            placeholder={t("planTools.gift.messagePlaceholder")}
            aria-describedby="gift-list-message-count"
            className={cn(FIELD, "h-auto min-h-28 py-2.5")}
          />
          <p id="gift-list-message-count" className="text-right text-xs tabular-nums text-ink-muted">
            {message.length}/{GIFT_MESSAGE_MAX}
          </p>
        </div>

        <div className="flex items-start justify-between gap-4 rounded-2xl border border-line p-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <Label htmlFor="gift-list-show" className="text-sm font-medium text-ink">
              {t("planTools.gift.showOnInvitation")}
            </Label>
            <p id="gift-list-show-help" className="text-sm text-ink-muted">
              {show
                ? t("planTools.gift.list.showOn")
                : t("planTools.gift.showOff")}
              {show && summary.pending === 0 && ` ${t("planTools.gift.list.addFirst")}`}
            </p>
          </div>
          <Switch
            id="gift-list-show"
            checked={show}
            onCheckedChange={setShow}
            aria-describedby="gift-list-show-help"
            className="mt-0.5 h-6 w-11 data-[state=checked]:bg-cta data-[state=unchecked]:bg-line-strong focus-visible:ring-lilac [&>span]:size-5 [&>span]:data-[state=checked]:translate-x-[1.375rem] [&>span]:data-[state=unchecked]:translate-x-0.5"
          />
        </div>
      </form>
    </div>
  );
}

function GiftItemForm({
  initial,
  prefillName,
  onCancel,
  onSubmit,
}: {
  initial: GiftItem | null;
  prefillName: string;
  onCancel: () => void;
  onSubmit: (input: GiftItemInput) => Promise<void>;
}) {
  const { t } = useTranslation("tools");
  const { lang } = useLanguage();
  const uid = React.useId();
  const nameRef = React.useRef<HTMLInputElement>(null);
  const [name, setName] = React.useState(initial?.name ?? prefillName);
  const [link, setLink] = React.useState(initial?.link ?? "");
  const [priceText, setPriceText] = React.useState(
    initial?.price != null ? (lang === "en" ? String(initial.price) : String(initial.price).replace(".", ",")) : ""
  );
  const [priority, setPriority] = React.useState<string>(initial?.priority ?? NO_PRIORITY);
  const [note, setNote] = React.useState(initial?.note ?? "");
  const [touched, setTouched] = React.useState({ name: false, link: false, price: false });
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const price = priceText.trim() ? parseAmount(priceText, lang) : null;
  const nameProblem = name.trim() ? null : t("planTools.gift.list.form.errors.name");
  const linkProblem =
    link.trim() && !cleanUrl(link) ? t("planTools.gift.list.form.errors.link") : null;
  const priceProblem =
    price !== null && (!Number.isFinite(price) || price < 0 || price > GIFT_ITEM_LIMITS.price)
      ? t("planTools.gift.list.form.errors.price")
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nameProblem || linkProblem || priceProblem) {
      setTouched({ name: true, link: true, price: true });
      toast.error(t("planTools.gift.money.reviewErrors"));
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        name: name.trim(),
        link: link.trim() ? cleanUrl(link) : "",
        price,
        note: note.trim(),
        priority: isGiftPriority(priority) ? priority : null,
      });
    } finally {
      setBusy(false);
    }
  }

  const help = (id: string, problem: string | null, shown: boolean, fallback: string) => (
    <p
      id={id}
      role={shown && problem ? "alert" : undefined}
      className={cn("text-sm", shown && problem ? "text-danger" : "text-ink-muted")}
    >
      {shown && problem ? problem : fallback}
    </p>
  );

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label={initial ? t("planTools.gift.list.editAria", { name: initial.name }) : t("planTools.gift.list.form.addAria")}
      className="flex flex-col gap-4 rounded-2xl border border-line-strong bg-lilac-soft p-4 sm:p-5"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${uid}-name`} className={FIELD_LABEL}>
          {t("planTools.gift.list.form.name")}
        </Label>
        <Input
          ref={nameRef}
          id={`${uid}-name`}
          value={name}
          maxLength={GIFT_ITEM_LIMITS.name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          placeholder={t("planTools.gift.list.form.namePlaceholder")}
          autoComplete="off"
          aria-invalid={touched.name && nameProblem ? true : undefined}
          aria-describedby={touched.name && nameProblem ? `${uid}-name-help` : undefined}
          className={FIELD}
        />
        {touched.name && nameProblem && help(`${uid}-name-help`, nameProblem, true, "")}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${uid}-price`} className={FIELD_LABEL}>
            {t("planTools.gift.list.form.price")}
          </Label>
          <Input
            id={`${uid}-price`}
            value={priceText}
            inputMode="decimal"
            onChange={(e) => setPriceText(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, price: true }))}
            placeholder="120"
            autoComplete="off"
            aria-invalid={touched.price && priceProblem ? true : undefined}
            aria-describedby={`${uid}-price-help`}
            className={FIELD}
          />
          {help(`${uid}-price-help`, priceProblem, touched.price, t("planTools.gift.list.form.priceHelp"))}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${uid}-priority`} className={FIELD_LABEL}>
            {t("planTools.gift.list.form.priority")}
          </Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger id={`${uid}-priority`} className={cn(SELECT_TRIGGER, "w-full")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={SELECT_CONTENT}>
              <SelectItem value={NO_PRIORITY} className={SELECT_ITEM}>
                {t("planTools.gift.list.form.noPriority")}
              </SelectItem>
              {GIFT_PRIORITIES.map((p) => (
                <SelectItem key={p.id} value={p.id} className={SELECT_ITEM}>
                  {t(`planTools.gift.list.priorities.${p.id}.label`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-ink-muted">{t("planTools.gift.list.form.priorityHelp")}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${uid}-link`} className={FIELD_LABEL}>
          {t("planTools.gift.list.form.link")}
        </Label>
        <Input
          id={`${uid}-link`}
          type="url"
          value={link}
          maxLength={GIFT_ITEM_LIMITS.link}
          onChange={(e) => setLink(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, link: true }))}
          placeholder="https://…"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={touched.link && linkProblem ? true : undefined}
          aria-describedby={`${uid}-link-help`}
          className={FIELD}
        />
        {help(`${uid}-link-help`, linkProblem, touched.link, t("planTools.gift.list.form.linkHelp"))}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${uid}-note`} className={FIELD_LABEL}>
          {t("planTools.gift.list.form.note")}
        </Label>
        <Textarea
          id={`${uid}-note`}
          value={note}
          maxLength={GIFT_ITEM_LIMITS.note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder={t("planTools.gift.list.form.notePlaceholder")}
          className={cn(FIELD, "h-auto min-h-20 py-2.5")}
        />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className={CTA_SECONDARY}>
          {t("planTools.actions.cancel")}
        </button>
        <button type="submit" disabled={busy} className={cn(CTA_PRIMARY, "disabled:opacity-50")}>
          {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          {initial ? t("planTools.gift.list.form.saveChanges") : t("planTools.gift.list.form.addToList")}
        </button>
      </div>
    </form>
  );
}
