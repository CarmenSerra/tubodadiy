"use client";

import * as React from "react";
import { MailIcon, PencilIcon, PhoneIcon, PlusIcon, Trash2Icon, UserRoundIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CTA_PRIMARY, CTA_SECONDARY, IconCircle, LINK } from "@/components/dashboard/ui";
import { FIELD } from "@/components/vendors/vendor-brand";
import { ROW_ICON_BUTTON, VendorField } from "@/components/vendors/vendor-field";
import { isLooseEmail } from "@/components/vendors/vendor-model";
import { Input } from "@/components/ui/input";
import { updateVendor } from "@/lib/firebase/mutations";
import type { Vendor, VendorContact } from "@/lib/types";
import { toastWithUndo } from "@/lib/undo-toast";
import { newExtraId } from "@/lib/vendor-extras";
import { cn } from "@/lib/utils";

type Draft = Omit<VendorContact, "id">;
const EMPTY: Draft = { name: "", role: "", phone: "", email: "" };

/** Personas de contacto de un proveedor (además de los datos principales de su ficha). */
export function VendorContacts({ planId, vendor }: { planId: string; vendor: Vendor }) {
  const { t } = useTranslation("vendors");
  const contacts = vendor.contacts ?? [];
  // `null` = cerrado; "new" = añadiendo; un id = editando esa persona.
  const [editing, setEditing] = React.useState<string | null>(null);

  async function save(next: VendorContact[]) {
    await updateVendor(planId, vendor.id, { contacts: next });
  }

  async function handleDelete(contact: VendorContact) {
    const before = contacts;
    try {
      await save(contacts.filter((c) => c.id !== contact.id));
      toastWithUndo(t("contacts.deleted"), () => save(before));
    } catch {
      toast.error(t("contacts.saveError"));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-muted">{t("contacts.intro")}</p>

      {contacts.length === 0 && editing !== "new" && (
        <p className="rounded-xl bg-lilac-soft px-4 py-3.5 text-sm text-ink ring-1 ring-lilac-edge">
          {t("contacts.empty")}
        </p>
      )}

      {contacts.length > 0 && (
        <ul className="flex flex-col gap-3">
          {contacts.map((contact) =>
            editing === contact.id ? (
              <li key={contact.id}>
                <ContactForm
                  initial={contact}
                  onCancel={() => setEditing(null)}
                  onSave={async (draft) => {
                    // Se cierra ya: Firestore pinta el cambio al instante y confirma después.
                    setEditing(null);
                    await save(contacts.map((c) => (c.id === contact.id ? { ...draft, id: c.id } : c)));
                  }}
                />
              </li>
            ) : (
              <li key={contact.id} className="flex items-start gap-3 rounded-xl border border-line bg-raised p-3">
                <IconCircle tone="lilac">
                  <UserRoundIcon />
                </IconCircle>
                <div className="min-w-0 flex-1">
                  <p className="break-words font-medium text-ink-strong">{contact.name || t("contacts.noName")}</p>
                  {contact.role && <p className="text-sm text-ink-muted">{contact.role}</p>}
                  <div className="mt-1 flex flex-col gap-0.5 text-sm">
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
                        className={cn(LINK, "inline-flex min-h-11 w-fit items-center gap-1.5")}
                      >
                        <PhoneIcon className="size-3.5" aria-hidden="true" />
                        {contact.phone}
                      </a>
                    )}
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className={cn(LINK, "inline-flex min-h-11 w-fit items-center gap-1.5 break-all")}
                      >
                        <MailIcon className="size-3.5" aria-hidden="true" />
                        {contact.email}
                      </a>
                    )}
                  </div>
                </div>
                <div className="-mr-1 flex shrink-0">
                  <button
                    type="button"
                    className={ROW_ICON_BUTTON}
                    aria-label={t("contacts.edit", { name: contact.name })}
                    onClick={() => setEditing(contact.id)}
                  >
                    <PencilIcon aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={ROW_ICON_BUTTON}
                    aria-label={t("contacts.delete", { name: contact.name })}
                    onClick={() => void handleDelete(contact)}
                  >
                    <Trash2Icon aria-hidden="true" />
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
      )}

      {editing === "new" ? (
        <ContactForm
          initial={EMPTY}
          onCancel={() => setEditing(null)}
          onSave={async (draft) => {
            setEditing(null);
            await save([...contacts, { ...draft, id: newExtraId() }]);
          }}
        />
      ) : (
        <div>
          <button type="button" className={CTA_SECONDARY} onClick={() => setEditing("new")}>
            <PlusIcon className="size-4" aria-hidden="true" />
            {t("contacts.add")}
          </button>
        </div>
      )}
    </div>
  );
}

function ContactForm({
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
  const [draft, setDraft] = React.useState<Draft>({
    name: initial.name,
    role: initial.role,
    phone: initial.phone,
    email: initial.email,
  });
  const [errors, setErrors] = React.useState<{ name?: string; email?: string }>({});
  const [saving, setSaving] = React.useState(false);
  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next: { name?: string; email?: string } = {};
    if (!draft.name.trim()) next.name = t("contacts.errors.name");
    if (draft.email.trim() && !isLooseEmail(draft.email)) next.email = t("form.errors.email");
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    try {
      await onSave({
        name: draft.name.trim(),
        role: draft.role.trim(),
        phone: draft.phone.trim(),
        email: draft.email.trim(),
      });
    } catch {
      toast.error(t("contacts.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-xl border border-line-strong bg-raised p-4">
      <VendorField id={`${uid}-name`} label={t("contacts.fields.name")} error={errors.name}>
        <Input
          id={`${uid}-name`}
          className={FIELD}
          value={draft.name}
          onChange={set("name")}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? `${uid}-name-error` : undefined}
          autoComplete="off"
          autoFocus
        />
      </VendorField>
      <VendorField id={`${uid}-role`} label={t("contacts.fields.role")} hint={t("contacts.fields.roleHint")}>
        <Input id={`${uid}-role`} className={FIELD} value={draft.role} onChange={set("role")} autoComplete="off" />
      </VendorField>
      <div className="grid gap-4 sm:grid-cols-2">
        <VendorField id={`${uid}-phone`} label={t("contacts.fields.phone")}>
          <Input id={`${uid}-phone`} type="tel" className={FIELD} value={draft.phone} onChange={set("phone")} />
        </VendorField>
        <VendorField id={`${uid}-email`} label={t("contacts.fields.email")} error={errors.email}>
          <Input
            id={`${uid}-email`}
            type="email"
            className={FIELD}
            value={draft.email}
            onChange={set("email")}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? `${uid}-email-error` : undefined}
          />
        </VendorField>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className={cn(CTA_PRIMARY, "disabled:opacity-60")}>
          {t("contacts.save")}
        </button>
        <button type="button" onClick={onCancel} className={CTA_SECONDARY}>
          {t("contacts.cancel")}
        </button>
      </div>
    </form>
  );
}
