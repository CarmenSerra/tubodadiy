"use client";

import * as React from "react";
import { ExternalLinkIcon, MailIcon, MapPinIcon, PhoneIcon, StickyNoteIcon } from "lucide-react";

import { CTA_SECONDARY, IconCircle, LINK } from "@/components/dashboard/ui";
import { DIALOG_CONTENT, DIALOG_TITLE } from "@/components/vendors/vendor-brand";
import { mapsHref } from "@/components/vendors/vendor-model";
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
        <p className="text-sm text-[#586C64]">{label}</p>
        <div className="mt-0.5 break-words text-base text-[#102D28]">{children}</div>
      </div>
    </li>
  );
}

/** "Contacto" de una opción: solo se muestran los datos que existen. */
export function VendorContactDialog({ vendor }: { vendor: Vendor }) {
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
          aria-label={`Contacto de ${vendor.name}`}
          className={cn(CTA_SECONDARY, "h-10 px-4")}
        >
          Contacto
        </button>
      </DialogTrigger>
      <DialogContent className={DIALOG_CONTENT}>
        <DialogHeader className="gap-1.5 pr-6">
          <DialogTitle className={DIALOG_TITLE}>{vendor.name}</DialogTitle>
          <DialogDescription className="text-sm text-[#586C64]">
            {vendor.category} · datos de contacto
          </DialogDescription>
        </DialogHeader>

        {hasAnything ? (
          <ul className="mt-6 flex flex-col gap-5">
            {(location || maps) && (
              <ContactRow icon={<MapPinIcon />} label="Ubicación">
                {location && <p>{location}</p>}
                {maps && (
                  <a
                    href={maps}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(LINK, "mt-1 inline-flex items-center gap-1.5 text-sm")}
                  >
                    Ver en Google Maps
                    <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
                    <span className="sr-only">(se abre en una pestaña nueva)</span>
                  </a>
                )}
              </ContactRow>
            )}
            {email && (
              <ContactRow icon={<MailIcon />} label="Email">
                <a href={`mailto:${email}`} className={cn(LINK, "break-all")}>
                  {email}
                </a>
              </ContactRow>
            )}
            {phone && (
              <ContactRow icon={<PhoneIcon />} label="Teléfono">
                <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className={LINK}>
                  {phone}
                </a>
              </ContactRow>
            )}
            {notes && (
              <ContactRow icon={<StickyNoteIcon />} label="Notas">
                <p className="whitespace-pre-line">{notes}</p>
              </ContactRow>
            )}
          </ul>
        ) : (
          <p className="mt-6 rounded-xl bg-[#ECE6F4] px-4 py-3.5 text-sm text-[#26413C]">
            Todavía no has guardado datos de contacto de esta opción. Edítala con el lápiz de la
            tarjeta para añadir la dirección, el email o el teléfono.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
