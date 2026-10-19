"use client";

import * as React from "react";
import {
  ExternalLinkIcon,
  FileTextIcon,
  LinkIcon,
  PencilIcon,
  PlusIcon,
  ReceiptTextIcon,
  ScrollTextIcon,
  Trash2Icon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CTA_PRIMARY, CTA_SECONDARY, IconCircle, LINK } from "@/components/dashboard/ui";
import { FIELD, FIELD_LABEL, SELECT_CONTENT, SELECT_ITEM, SELECT_TRIGGER } from "@/components/vendors/vendor-brand";
import { ROW_ICON_BUTTON, VendorField } from "@/components/vendors/vendor-field";
import { isHttpUrl } from "@/components/vendors/vendor-model";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateVendor } from "@/lib/firebase/mutations";
import { useLanguage } from "@/lib/i18n/provider";
import type { Vendor, VendorDocument, VendorDocumentType } from "@/lib/types";
import { toastWithUndo } from "@/lib/undo-toast";
import { VENDOR_DOCUMENT_TYPES, newExtraId } from "@/lib/vendor-extras";
import { cn, formatDate } from "@/lib/utils";
import { usePlanPermission } from "@/lib/hooks/use-plan-permission";

type Draft = Omit<VendorDocument, "id">;
const EMPTY: Draft = { type: "contract", title: "", url: "", date: "", signed: false, notes: "" };

const TYPE_ICON: Record<VendorDocumentType, React.ComponentType<{ className?: string; "aria-hidden"?: "true" }>> = {
  contract: ScrollTextIcon,
  quote: FileTextIcon,
  invoice: ReceiptTextIcon,
  other: LinkIcon,
};

/** Añade https:// si el enlace se escribió sin esquema ("drive.google.com/…"). */
function normalizeUrl(value: string): string {
  const v = value.trim();
  if (!v) return "";
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`;
}

/**
 * Contratos, presupuestos y facturas de un proveedor. No se suben ficheros: se guarda el ENLACE
 * a donde ya los tengan (Drive, un correo, una web…).
 */
export function VendorDocuments({ planId, vendor }: { planId: string; vendor: Vendor }) {
  const { t } = useTranslation("vendors");
  const { lang } = useLanguage();
  const { canEdit } = usePlanPermission("vendors");
  const documents = vendor.documents ?? [];
  const [editing, setEditing] = React.useState<string | null>(null);

  async function save(next: VendorDocument[]) {
    await updateVendor(planId, vendor.id, { documents: next });
  }

  async function handleDelete(doc: VendorDocument) {
    const before = documents;
    try {
      await save(documents.filter((d) => d.id !== doc.id));
      toastWithUndo(t("docs.deleted"), () => save(before));
    } catch {
      toast.error(t("docs.saveError"));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-start gap-3 rounded-xl bg-lilac-soft px-4 py-3.5 text-sm text-ink ring-1 ring-lilac-edge">
        <LinkIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{t("docs.intro")}</span>
      </p>

      {documents.length === 0 && editing !== "new" && (
        <p className="text-sm text-ink-muted">{t("docs.empty")}</p>
      )}

      {documents.length > 0 && (
        <ul className="flex flex-col gap-3">
          {documents.map((doc) => {
            if (editing === doc.id) {
              return (
                <li key={doc.id}>
                  <DocumentForm
                    initial={doc}
                    onCancel={() => setEditing(null)}
                    onSave={async (draft) => {
                      // Se cierra ya: Firestore pinta el cambio al instante y confirma después.
                      setEditing(null);
                      await save(documents.map((d) => (d.id === doc.id ? { ...draft, id: d.id } : d)));
                    }}
                  />
                </li>
              );
            }
            const Icon = TYPE_ICON[doc.type];
            const title = doc.title || t(`docs.types.${doc.type}`);
            const safeUrl = isHttpUrl(doc.url) ? doc.url : "";
            return (
              <li key={doc.id} className="flex items-start gap-3 rounded-xl border border-line bg-raised p-3">
                <IconCircle tone="sage">
                  <Icon aria-hidden="true" />
                </IconCircle>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-ink-muted">{t(`docs.types.${doc.type}`)}</p>
                  {safeUrl ? (
                    <a
                      href={safeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(LINK, "inline-flex min-h-11 items-center gap-1.5 break-words")}
                    >
                      {title}
                      <ExternalLinkIcon className="size-3.5 shrink-0" aria-hidden="true" />
                      <span className="sr-only">{t("contact.newTab")}</span>
                    </a>
                  ) : (
                    <p className="break-words font-medium text-ink-strong">{title}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-ink-muted">
                    {doc.date && <span>{formatDate(doc.date, lang)}</span>}
                    {doc.signed ? (
                      <Badge variant="outline" className="rounded-full border-transparent bg-deep px-2.5 py-0.5 text-xs font-medium text-on-solid">
                        {t("docs.signed")}
                      </Badge>
                    ) : (
                      doc.type === "contract" && (
                        <Badge variant="outline" className="rounded-full border-line-strong bg-lilac-soft px-2.5 py-0.5 text-xs font-medium text-ink">
                          {t("docs.unsigned")}
                        </Badge>
                      )
                    )}
                  </div>
                  {doc.notes && <p className="mt-1.5 whitespace-pre-line break-words text-sm text-ink">{doc.notes}</p>}
                </div>
                {canEdit && (
                <div className="-mr-1 flex shrink-0">
                  <button
                    type="button"
                    className={ROW_ICON_BUTTON}
                    aria-label={t("docs.edit", { title })}
                    onClick={() => setEditing(doc.id)}
                  >
                    <PencilIcon aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={ROW_ICON_BUTTON}
                    aria-label={t("docs.delete", { title })}
                    onClick={() => void handleDelete(doc)}
                  >
                    <Trash2Icon aria-hidden="true" />
                  </button>
                </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!canEdit ? null : editing === "new" ? (
        <DocumentForm
          initial={EMPTY}
          onCancel={() => setEditing(null)}
          onSave={async (draft) => {
            setEditing(null);
            await save([...documents, { ...draft, id: newExtraId() }]);
          }}
        />
      ) : (
        <div>
          <button type="button" className={CTA_SECONDARY} onClick={() => setEditing("new")}>
            <PlusIcon className="size-4" aria-hidden="true" />
            {t("docs.add")}
          </button>
        </div>
      )}
    </div>
  );
}

function DocumentForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Draft;
  onSave: (draft: Draft) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation("vendors");
  const uid = React.useId();
  const [draft, setDraft] = React.useState<Draft>({ ...initial });
  const [errors, setErrors] = React.useState<{ title?: string; url?: string }>({});
  const [saving, setSaving] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next: { title?: string; url?: string } = {};
    if (!draft.title.trim()) next.title = t("docs.errors.title");
    const url = normalizeUrl(draft.url);
    if (url && !isHttpUrl(url)) next.url = t("form.errors.link");
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    try {
      await onSave({ ...draft, title: draft.title.trim(), url, notes: draft.notes.trim() });
    } catch {
      toast.error(t("docs.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-xl border border-line-strong bg-raised p-4">
      <VendorField id={`${uid}-type`} label={t("docs.fields.type")}>
        <Select value={draft.type} onValueChange={(v) => setDraft((d) => ({ ...d, type: v as VendorDocumentType }))}>
          <SelectTrigger id={`${uid}-type`} className={cn(SELECT_TRIGGER, "w-full")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={SELECT_CONTENT}>
            {VENDOR_DOCUMENT_TYPES.map((type) => (
              <SelectItem key={type} value={type} className={SELECT_ITEM}>
                {t(`docs.types.${type}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </VendorField>
      <VendorField id={`${uid}-title`} label={t("docs.fields.title")} error={errors.title}>
        <Input
          id={`${uid}-title`}
          className={FIELD}
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? `${uid}-title-error` : undefined}
          autoComplete="off"
          autoFocus
        />
      </VendorField>
      <VendorField id={`${uid}-url`} label={t("docs.fields.link")} error={errors.url} hint={t("docs.fields.linkHint")}>
        <Input
          id={`${uid}-url`}
          type="url"
          inputMode="url"
          placeholder="https://…"
          className={FIELD}
          value={draft.url}
          onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
          aria-invalid={errors.url ? true : undefined}
          aria-describedby={errors.url ? `${uid}-url-error` : undefined}
          autoComplete="off"
        />
      </VendorField>
      <div className="grid gap-4 sm:grid-cols-2">
        <VendorField id={`${uid}-date`} label={t("docs.fields.date")}>
          <DatePicker
            id={`${uid}-date`}
            value={draft.date}
            onChange={(v) => setDraft((d) => ({ ...d, date: v }))}
            className="h-11 rounded-xl border-line-strong bg-field text-base text-ink-strong shadow-none focus-visible:ring-lilac focus-visible:ring-offset-0 sm:text-sm"
          />
        </VendorField>
        <div className="flex flex-col gap-2">
          <span className={FIELD_LABEL}>{t("docs.fields.signedLabel")}</span>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
            <Checkbox
              checked={draft.signed}
              onCheckedChange={(v) => setDraft((d) => ({ ...d, signed: v === true }))}
              className="size-5 rounded-[4px] border-line-strong bg-field data-[state=checked]:border-green-solid data-[state=checked]:bg-green-solid data-[state=checked]:text-on-solid focus-visible:ring-lilac"
            />
            {t("docs.fields.signed")}
          </label>
        </div>
      </div>
      <VendorField id={`${uid}-notes`} label={t("docs.fields.notes")}>
        <Textarea
          id={`${uid}-notes`}
          rows={2}
          className={cn(FIELD, "h-auto min-h-20 py-2.5")}
          value={draft.notes}
          onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
        />
      </VendorField>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className={cn(CTA_PRIMARY, "disabled:opacity-60")}>
          {t("docs.save")}
        </button>
        <button type="button" onClick={onCancel} className={CTA_SECONDARY}>
          {t("docs.cancel")}
        </button>
      </div>
    </form>
  );
}
