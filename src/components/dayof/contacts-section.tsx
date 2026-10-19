"use client";

import * as React from "react";
import Link from "next/link";
import { PhoneCallIcon, PlusIcon, StoreIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CeremonySection } from "@/components/ceremony/section";
import { CTA_PRIMARY, CTA_SECONDARY, LINK } from "@/components/dashboard/ui";
import {
  DayDialog,
  FormFrame,
  ListBody,
  PhoneLink,
  ROW_MAIN,
  TextField,
  useEditor,
} from "@/components/dayof/ui";
import { CHECKBOX, ROW_FOCUS } from "@/components/guests/brand-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { categoryLabel } from "@/components/vendors/vendor-model";
import { usePlanContext } from "@/lib/context/plan-context";
import type { DayContact } from "@/lib/dayof-model";
import {
  addContacts,
  createDayOfItem,
  deleteDayOfItem,
  restoreDayOfItem,
  updateDayOfItem,
} from "@/lib/firebase/dayof";
import { mapVendor, vendorsQuery } from "@/lib/firebase/plans";
import { useCollection } from "@/lib/hooks/use-collection";
import { usePlanPermission } from "@/lib/hooks/use-plan-permission";
import { toastWithUndo } from "@/lib/undo-toast";
import type { Vendor } from "@/lib/types";
import { cn } from "@/lib/utils";

/** «Contactos del día»: quién llamar si algo se tuerce, con teléfono clicable. */
export function ContactsSection({
  contacts,
  loading,
  error,
}: {
  contacts: DayContact[];
  loading: boolean;
  error: string | null;
}) {
  const { t } = useTranslation("dayof");
  const { planId } = usePlanContext();
  const { canEdit } = usePlanPermission("dayof");
  // Copiar proveedores como contactos lee su sección.
  const { canView: canViewVendors } = usePlanPermission("vendors");
  const editor = useEditor<DayContact>();
  const [vendorsOpen, setVendorsOpen] = React.useState(false);

  const addButton = (
    <button type="button" onClick={editor.openNew} className={contacts.length > 0 ? CTA_SECONDARY : CTA_PRIMARY}>
      <PlusIcon aria-hidden="true" className="size-4" />
      {t("contacts.add")}
    </button>
  );
  const vendorsButton = (
    <button type="button" onClick={() => setVendorsOpen(true)} className={CTA_SECONDARY}>
      <StoreIcon aria-hidden="true" className="size-4" />
      {t("contacts.fromVendors")}
    </button>
  );

  return (
    <CeremonySection
      id="contactos"
      icon={<PhoneCallIcon />}
      title={t("contacts.title")}
      description={t("contacts.description")}
      action={
        canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            {canViewVendors && vendorsButton}
            {contacts.length > 0 && addButton}
          </div>
        ) : undefined
      }
    >
      <ListBody
        loading={loading}
        error={error}
        empty={contacts.length === 0}
        emptyText={t("contacts.empty")}
        emptyAction={canEdit ? addButton : undefined}
      >
        <ul>
          {contacts.map((contact) => (
            <li
              key={contact.id}
              className="flex flex-wrap items-center gap-x-2 border-b border-line py-1 last:border-b-0"
            >
              <button
                type="button"
                onClick={() => editor.openEdit(contact)}
                aria-label={t("contacts.editAria", { name: contact.name })}
                className={cn(ROW_MAIN, "min-w-48")}
              >
                <span className="break-words font-medium text-ink">{contact.name}</span>
                {contact.role.trim() && <span className="break-words text-sm text-ink-muted">{contact.role}</span>}
              </button>
              {contact.phone.trim() ? (
                <PhoneLink phone={contact.phone} />
              ) : (
                <span className="px-2 text-sm text-ink-muted">{t("contacts.noPhone")}</span>
              )}
            </li>
          ))}
        </ul>
      </ListBody>
      <p className="text-sm text-ink-muted">{t("contacts.printNote")}</p>

      <DayDialog open={editor.open} onOpenChange={editor.setOpen} readOnly={!canEdit}>
        <ContactForm
          key={editor.item?.id ?? "new"}
          planId={planId}
          contact={editor.item}
          onDone={() => editor.setOpen(false)}
        />
      </DayDialog>
      {canEdit && canViewVendors && (
      <DayDialog open={vendorsOpen} onOpenChange={setVendorsOpen}>
        <VendorPicker planId={planId} contacts={contacts} onDone={() => setVendorsOpen(false)} />
      </DayDialog>
      )}
    </CeremonySection>
  );
}

function ContactForm({ planId, contact, onDone }: { planId: string; contact?: DayContact; onDone: () => void }) {
  const { t } = useTranslation("dayof");
  const [name, setName] = React.useState(contact?.name ?? "");
  const [role, setRole] = React.useState(contact?.role ?? "");
  const [phone, setPhone] = React.useState(contact?.phone ?? "");
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit() {
    if (!name.trim()) {
      setNameError(t("contacts.errors.name"));
      return;
    }
    const data = { name: name.trim(), role: role.trim(), phone: phone.trim() };
    setBusy(true);
    try {
      if (contact) await updateDayOfItem(planId, "contacts", contact.id, data);
      else await createDayOfItem(planId, "contacts", { ...data, vendorId: "" });
      onDone();
    } catch {
      toast.error(t("contacts.errors.save"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!contact) return;
    try {
      await deleteDayOfItem(planId, "contacts", contact.id);
      onDone();
      toastWithUndo(t("contacts.deleted"), () => restoreDayOfItem(planId, "contacts", contact));
    } catch {
      toast.error(t("contacts.errors.delete"));
    }
  }

  return (
    <FormFrame
      title={contact ? t("contacts.form.editTitle") : t("contacts.form.newTitle")}
      description={t("contacts.form.description")}
      busy={busy}
      onSubmit={() => void submit()}
      onCancel={onDone}
      onDelete={contact ? () => void remove() : undefined}
      deleteLabel={t("contacts.form.delete")}
    >
      <TextField
        label={t("contacts.form.fields.name")}
        value={name}
        onChange={(v) => {
          setName(v);
          setNameError(null);
        }}
        error={nameError}
        required
        autoFocus={!contact}
      />
      <TextField
        label={t("contacts.form.fields.role")}
        value={role}
        onChange={setRole}
        placeholder={t("contacts.form.placeholders.role")}
      />
      <TextField
        label={t("contacts.form.fields.phone")}
        value={phone}
        onChange={setPhone}
        type="tel"
        inputMode="tel"
      />
    </FormFrame>
  );
}

/** Proveedores del plan (solo lectura) para copiarlos como contactos. */
function VendorPicker({
  planId,
  contacts,
  onDone,
}: {
  planId: string;
  contacts: DayContact[];
  onDone: () => void;
}) {
  const { t } = useTranslation("dayof");
  const { data, loading, error } = useCollection(vendorsQuery(planId), mapVendor);
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);

  const added = React.useMemo(() => new Set(contacts.map((c) => c.vendorId).filter(Boolean)), [contacts]);
  // Primero los elegidos (contratados) y los que tienen teléfono.
  const available = React.useMemo(() => {
    const rank = (v: Vendor) => (v.status === "chosen" ? 0 : 2) + (v.contactPhone.trim() ? 0 : 1);
    return data
      .filter((v) => !added.has(v.id))
      .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  }, [data, added]);

  function toggle(id: string, on: boolean) {
    setPicked((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function submit() {
    const chosen = available.filter((v) => picked.has(v.id));
    if (chosen.length === 0) return;
    setBusy(true);
    try {
      await addContacts(
        planId,
        chosen.map((v) => ({
          name: v.name,
          role: categoryLabel(v.category, t),
          phone: v.contactPhone.trim(),
          vendorId: v.id,
        }))
      );
      toast.success(t("contacts.vendors.added", { count: chosen.length }));
      onDone();
    } catch {
      toast.error(t("contacts.errors.save"));
    } finally {
      setBusy(false);
    }
  }

  let body: React.ReactNode;
  if (loading) {
    body = <p className="text-sm text-ink-muted">{t("common.loading")}</p>;
  } else if (error) {
    body = (
      <p role="alert" className="text-sm text-ink-muted">
        {t("common.loadError")}
      </p>
    );
  } else if (data.length === 0) {
    body = (
      <p className="text-sm text-ink-muted">
        {t("contacts.vendors.none")}{" "}
        <Link href={`/plan/${planId}/vendors`} className={LINK}>
          {t("contacts.vendors.goToVendors")}
        </Link>
      </p>
    );
  } else if (available.length === 0) {
    body = <p className="text-sm text-ink-muted">{t("contacts.vendors.allAdded")}</p>;
  } else {
    body = (
      <ul role="group" aria-label={t("contacts.vendors.listLabel")} className="-mx-2 flex flex-col">
        {available.map((vendor) => (
          <li key={vendor.id}>
            <label
              className={cn(
                "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-lilac-soft",
                ROW_FOCUS
              )}
            >
              <Checkbox
                checked={picked.has(vendor.id)}
                onCheckedChange={(v) => toggle(vendor.id, v === true)}
                className={CHECKBOX}
              />
              <span className="flex min-w-0 flex-col">
                <span className="break-words font-medium text-ink">{vendor.name}</span>
                <span className="break-words text-sm text-ink-muted">
                  {[categoryLabel(vendor.category, t), vendor.contactPhone.trim() || t("contacts.noPhone")]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <FormFrame
      title={t("contacts.vendors.title")}
      description={t("contacts.vendors.description")}
      busy={busy}
      onSubmit={() => void submit()}
      onCancel={onDone}
      submitLabel={picked.size > 0 ? t("contacts.vendors.submit", { count: picked.size }) : t("contacts.vendors.submitNone")}
      submitDisabled={picked.size === 0}
    >
      <p className="text-sm text-ink-muted">{t("contacts.vendors.help")}</p>
      {body}
    </FormFrame>
  );
}
