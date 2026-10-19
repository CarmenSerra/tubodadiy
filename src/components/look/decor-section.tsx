"use client";

import * as React from "react";
import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DeleteIconButton, EditIconButton, FIELD } from "@/components/guests/brand-dialog";
import { addItem, deleteItem, markInBudget, restoreItem, updateItem } from "@/components/look/look-firebase";
import { DECOR_KINDS, isDecorKind, type DecorInput, type DecorItem, type DecorKind } from "@/components/look/look-model";
import {
  AddButton,
  BudgetLink,
  EmptyState,
  Field,
  FormFooter,
  LK_CARD,
  LK_FOCUS,
  LK_NATIVE_SELECT,
  LookDialog,
  SectionHeader,
  StatusBadge,
  StatusSelect,
  VendorChip,
  VendorSelect,
  parsePrice,
  priceText,
} from "@/components/look/ui";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/i18n/format";
import { useLanguage } from "@/lib/i18n/provider";
import type { Vendor } from "@/lib/types";
import { toastWithUndo } from "@/lib/undo-toast";
import { cn } from "@/lib/utils";
import { usePlanPermission } from "@/lib/hooks/use-plan-permission";

interface DialogState {
  item?: DecorItem;
  kind: DecorKind;
}

const TEXTAREA =
  "min-h-20 rounded-xl border-line-strong bg-field text-base text-ink-strong shadow-none placeholder:text-ink-placeholder focus-visible:ring-lilac focus-visible:ring-offset-0 sm:text-sm";

/** Lista de elementos de decoración y flores (centros, ramo, prendidos, ceremonia, photocall…). */
export function DecorSection({ planId, items, vendors }: { planId: string; items: DecorItem[]; vendors: Vendor[] }) {
  const { t } = useTranslation("look");
  const { canEdit } = usePlanPermission("style");
  const [dialog, setDialog] = React.useState<DialogState | null>(null);
  const [shown, setShown] = React.useState<DialogState>({ kind: "centerpieces" });

  function openDialog(next: DialogState) {
    setShown(next);
    setDialog(next);
  }

  async function handleDelete(item: DecorItem) {
    try {
      await deleteItem(planId, "decor", item.id);
      toastWithUndo(t("decor.deleted"), () => restoreItem(planId, "decor", item));
    } catch {
      toast.error(t("decor.deleteError"));
    }
  }

  const missing = DECOR_KINDS.filter((k) => k !== "other" && !items.some((i) => i.kind === k));

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title={t("decor.title")}
        description={t("decor.description")}
        action={
          canEdit ? <AddButton primary label={t("decor.add")} onClick={() => openDialog({ kind: missing[0] ?? "other" })} /> : undefined
        }
      />

      {canEdit && missing.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-ink">{t("decor.suggestions")}</p>
          <ul className="flex flex-wrap gap-2">
            {missing.map((kind) => (
              <li key={kind}>
                <button
                  type="button"
                  onClick={() => openDialog({ kind })}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line-strong bg-field px-3.5 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft",
                    LK_FOCUS
                  )}
                >
                  <PlusIcon aria-hidden="true" className="size-3.5" />
                  {t(`decor.kinds.${kind}`)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState title={t("decor.empty.title")} text={t("decor.empty.text")} />
      ) : (
        <ul className="grid items-start gap-4 md:grid-cols-2">
          {items.map((item) => (
            <DecorCard
              key={item.id}
              planId={planId}
              item={item}
              vendors={vendors}
              onEdit={() => openDialog({ item, kind: item.kind })}
              onDelete={() => handleDelete(item)}
            />
          ))}
        </ul>
      )}

      {canEdit && (
        <LookDialog
          open={dialog !== null}
          onOpenChange={(open) => !open && setDialog(null)}
          title={shown.item ? t("decor.form.editTitle") : t("decor.form.newTitle")}
        >
          {(close) => <DecorForm planId={planId} item={shown.item} defaultKind={shown.kind} vendors={vendors} onDone={close} />}
        </LookDialog>
      )}
    </div>
  );
}

function DecorCard({
  planId,
  item,
  vendors,
  onEdit,
  onDelete,
}: {
  planId: string;
  item: DecorItem;
  vendors: Vendor[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation("look");
  const { lang } = useLanguage();
  const { canEdit } = usePlanPermission("style");
  const kind = t(`decor.kinds.${item.kind}`);
  const name = item.title || kind;

  return (
    <li className={cn(LK_CARD, "flex flex-col gap-3 p-4 sm:p-5")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {item.title && <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{kind}</p>}
          <h4 className="mt-0.5 break-words font-display text-lg font-semibold leading-snug text-ink">{name}</h4>
        </div>
        {canEdit && (
          <div className="flex shrink-0 items-center">
            <EditIconButton label={t("decor.card.edit", { name })} onClick={onEdit} />
            <DeleteIconButton ariaLabel={t("decor.card.delete", { name })} onDelete={onDelete} />
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={item.status} />
        {item.price !== null && <span className="text-sm font-medium tabular-nums text-ink">{formatMoney(item.price, lang)}</span>}
      </div>
      {item.provider && (
        <p className="text-sm text-ink-strong">
          <span className="text-ink-muted">{t("decor.card.provider")}</span> {item.provider}
        </p>
      )}
      <VendorChip planId={planId} vendorId={item.vendorId} savedName={item.vendorName} vendors={vendors} />
      {item.notes && <p className="break-words text-sm text-ink-muted">{item.notes}</p>}
      <BudgetLink
        planId={planId}
        price={item.price}
        category="Flores y decoración"
        concept={t("budget.concept.decor", { name })}
        inBudget={item.inBudget}
        onMarked={() => markInBudget(planId, "decor", item.id)}
      />
    </li>
  );
}

function DecorForm({
  planId,
  item,
  defaultKind,
  vendors,
  onDone,
}: {
  planId: string;
  item?: DecorItem;
  defaultKind: DecorKind;
  vendors: Vendor[];
  onDone: () => void;
}) {
  const { t } = useTranslation("look");
  const { lang } = useLanguage();
  const uid = React.useId();
  const [kind, setKind] = React.useState<DecorKind>(item?.kind ?? defaultKind);
  const [title, setTitle] = React.useState(item?.title ?? "");
  const [provider, setProvider] = React.useState(item?.provider ?? "");
  const [vendorId, setVendorId] = React.useState(item?.vendorId ?? "");
  const [vendorName, setVendorName] = React.useState(item?.vendorName ?? "");
  const [status, setStatus] = React.useState(item?.status ?? "searching");
  const [price, setPrice] = React.useState(priceText(item?.price ?? null));
  const [notes, setNotes] = React.useState(item?.notes ?? "");
  const [priceError, setPriceError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const id = (name: string) => `${uid}-${name}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parsePrice(price, lang);
    if (parsed === undefined) {
      setPriceError(t("form.errors.price"));
      document.getElementById(id("price"))?.focus();
      return;
    }
    setPriceError(null);
    const input: DecorInput = {
      kind,
      title: title.trim(),
      provider: provider.trim(),
      vendorId,
      vendorName: vendorId ? vendorName : "",
      status,
      price: parsed,
      notes: notes.trim(),
      inBudget: item?.inBudget ?? false,
    };
    setSubmitting(true);
    try {
      if (item) await updateItem(planId, "decor", item.id, input);
      else await addItem(planId, "decor", input);
      toast.success(item ? t("decor.updated") : t("decor.added"));
      onDone();
    } catch {
      toast.error(t("decor.saveError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mt-5 flex flex-col gap-4">
        <Field id={id("kind")} label={t("decor.form.kind")}>
          <select
            id={id("kind")}
            value={kind}
            onChange={(e) => isDecorKind(e.target.value) && setKind(e.target.value)}
            className={LK_NATIVE_SELECT}
          >
            {DECOR_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`decor.kinds.${k}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field id={id("title")} label={t("decor.form.title")} optional hint={t("decor.form.titleHint")}>
          <Input
            id={id("title")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("decor.form.titlePlaceholder")}
            maxLength={120}
            autoComplete="off"
            className={FIELD}
          />
        </Field>
        <Field id={id("provider")} label={t("decor.form.provider")} optional>
          <Input
            id={id("provider")}
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder={t("decor.form.providerPlaceholder")}
            maxLength={120}
            autoComplete="off"
            className={FIELD}
          />
        </Field>
        <VendorSelect
          id={id("vendor")}
          vendorId={vendorId}
          savedName={vendorName}
          vendors={vendors}
          onChange={(vid, name) => {
            setVendorId(vid);
            setVendorName(name);
            if (vid && !provider.trim()) setProvider(name);
          }}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id={id("status")} label={t("form.status")}>
            <StatusSelect id={id("status")} value={status} onChange={setStatus} />
          </Field>
          <Field id={id("price")} label={t("form.price")} optional error={priceError}>
            <Input
              id={id("price")}
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setPriceError(null);
              }}
              inputMode="decimal"
              placeholder={t("form.pricePlaceholder")}
              aria-invalid={priceError ? true : undefined}
              aria-describedby={priceError ? `${id("price")}-error` : undefined}
              autoComplete="off"
              className={FIELD}
            />
          </Field>
        </div>
        <Field id={id("notes")} label={t("form.notes")} optional>
          <Textarea id={id("notes")} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={600} className={TEXTAREA} />
        </Field>
      </div>
      <FormFooter submitting={submitting} onCancel={onDone} />
    </form>
  );
}
