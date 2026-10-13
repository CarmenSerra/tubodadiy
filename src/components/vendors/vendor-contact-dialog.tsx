"use client";

import * as React from "react";
import { ExternalLinkIcon, MailIcon, MapPinIcon, PhoneIcon, StickyNoteIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { CTA_SECONDARY, IconCircle, LINK } from "@/components/dashboard/ui";
import { DIALOG_CONTENT, DIALOG_TITLE } from "@/components/vendors/vendor-brand";
import { categoryLabel, mapsHref } from "@/components/vendors/vendor-model";
import { VendorPhoto } from "@/components/vendors/vendor-photo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Vendor } from "@/lib/types";
import { cn } from "@/lib/utils";

function ContactRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3.5">
      <IconCircle tone="lilac">{icon}</IconCircle>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm text-ink-muted">{label}</p>
        <div className="mt-0.5 break-words text-base text-ink-strong">{children}</div>
      </div>
    </li>
  );
}

/** "Contacto" de una opción: solo se muestran los datos que existen. */
export function VendorContactDialog({ vendor }: { vendor: Vendor }) {
  const { t } = useTranslation("vendors");
  const location = vendor.location?.trim() ?? "";
  const maps = mapsHref(vendor);
  const email = vendor.contactEmail.trim();
  const phone = vendor.contactPhone.trim();
  const notes = vendor.notes.trim();
  const hasAnything = Boolean(location || maps || email || phone || notes);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={t("contact.ariaLabel", { name: vendor.name })}
          className={cn(CTA_SECONDARY, "h-10 px-4")}
        >
          {t("contact.button")}
        </button>
      </DialogTrigger>
      <DialogContent className={DIALOG_CONTENT}>
        <DialogHeader className="gap-1.5 pr-6">
          <DialogTitle className={DIALOG_TITLE}>{vendor.name}</DialogTitle>
          <DialogDescription className="text-sm text-ink-muted">
            {t("contact.description", { category: categoryLabel(vendor.category, t) })}
          </DialogDescription>
        </DialogHeader>

        <VendorPhoto
          photoData={vendor.photoData}
          photoUrl={vendor.photoUrl}
          name={vendor.name}
          category={vendor.category}
          seed={vendor.placeId ?? vendor.id}
          kind={vendor.placeKind ?? vendor.category}
          illustrated
          className="mt-5 aspect-[16/9] rounded-xl"
        />

        {hasAnything ? (
          <ul className="mt-6 flex flex-col gap-5">
            {(location || maps) && (
              <ContactRow icon={<MapPinIcon />} label={t("contact.location")}>
                {location && <p>{location}</p>}
                {maps && (
                  <a
                    href={maps}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(LINK, "mt-1 inline-flex items-center gap-1.5 text-sm")}
                  >
                    {t("contact.viewOnMaps")}
                    <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
                    <span className="sr-only">{t("contact.newTab")}</span>
                  </a>
                )}
              </ContactRow>
            )}
            {email && (
              <ContactRow icon={<MailIcon />} label={t("contact.email")}>
                <a href={`mailto:${email}`} className={cn(LINK, "break-all")}>
                  {email}
                </a>
              </ContactRow>
            )}
            {phone && (
              <ContactRow icon={<PhoneIcon />} label={t("contact.phone")}>
                <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className={LINK}>
                  {phone}
                </a>
              </ContactRow>
            )}
            {notes && (
              <ContactRow icon={<StickyNoteIcon />} label={t("contact.notes")}>
                <p className="whitespace-pre-line">{notes}</p>
              </ContactRow>
            )}
          </ul>
        ) : (
          <p className="mt-6 rounded-xl bg-lilac-soft ring-1 ring-lilac-edge px-4 py-3.5 text-sm text-ink">
            {t("contact.empty")}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
