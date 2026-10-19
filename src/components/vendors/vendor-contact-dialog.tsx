"use client";

import * as React from "react";
import {
  CalendarCheckIcon,
  ExternalLinkIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  StickyNoteIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { VendorBudgetSummary } from "@/components/budget/vendor-budget-summary";
import { CTA_SECONDARY, IconCircle, LINK } from "@/components/dashboard/ui";
import { DIALOG_CONTENT, DIALOG_TITLE } from "@/components/vendors/vendor-brand";
import { categoryLabel, mapsHref } from "@/components/vendors/vendor-model";
import { VendorContacts } from "@/components/vendors/vendor-contacts";
import { VendorDocuments } from "@/components/vendors/vendor-documents";
import { VendorPhoto } from "@/components/vendors/vendor-photo";
import { RatingStars } from "@/components/vendors/vendor-rating";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { appointmentsCollection, mapAppointment } from "@/lib/firebase/appointments";
import { useCollection } from "@/lib/hooks/use-collection";
import type { Vendor } from "@/lib/types";
import { splitLines } from "@/lib/vendor-extras";
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

const TAB_TRIGGER =
  "h-11 flex-1 rounded-full px-3 text-sm font-medium text-ink-muted outline-none data-[state=active]:bg-raised data-[state=active]:text-ink data-[state=active]:shadow-none focus-visible:ring-2 focus-visible:ring-lilac";

/** Lista de líneas (una cosa por línea) con título. */
function LinesBlock({ title, text }: { title: string; text: string | undefined }) {
  const lines = splitLines(text);
  if (lines.length === 0) return null;
  return (
    <div>
      <h4 className="font-display text-base font-semibold text-ink">{title}</h4>
      <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5 text-sm text-ink-strong marker:text-lilac">
        {lines.map((line, i) => (
          <li key={i} className="break-words">
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Citas de la agenda enlazadas a este proveedor: «2 de 3 hechas». */
function VendorAppointments({ planId, vendorId }: { planId: string; vendorId: string }) {
  const { t } = useTranslation("vendors");
  const { data: appointments, loading } = useCollection(appointmentsCollection(planId), mapAppointment);
  if (loading) return null;
  const mine = appointments.filter((a) => a.vendorId === vendorId);
  const done = mine.filter((a) => a.done).length;
  return (
    <ContactRow icon={<CalendarCheckIcon />} label={t("sheet.appointments")}>
      <p>{mine.length === 0 ? t("sheet.noAppointments") : t("sheet.appointmentsDone", { done, count: mine.length })}</p>
    </ContactRow>
  );
}

/** Ficha de una opción: resumen y contacto, otras personas de contacto y documentos. */
export function VendorContactDialog({ planId, vendor }: { planId: string; vendor: Vendor }) {
  const { t } = useTranslation("vendors");
  const location = vendor.location?.trim() ?? "";
  const maps = mapsHref(vendor);
  const email = vendor.contactEmail.trim();
  const phone = vendor.contactPhone.trim();
  const notes = vendor.notes.trim();
  const hasAnything = Boolean(location || maps || email || phone || notes);
  const extraContacts = vendor.contacts?.length ?? 0;
  const documents = vendor.documents?.length ?? 0;
  const hasDetails = Boolean(vendor.rating || vendor.includes || vendor.pros || vendor.cons);

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

        <Tabs defaultValue="summary" className="mt-5 gap-5">
          <TabsList className="h-[3.25rem] w-full rounded-full bg-lilac-soft p-1 ring-1 ring-lilac-edge">
            <TabsTrigger value="summary" className={TAB_TRIGGER}>
              {t("sheet.tabs.summary")}
            </TabsTrigger>
            <TabsTrigger value="contacts" className={TAB_TRIGGER}>
              {t("sheet.tabs.contacts")}
              {extraContacts > 0 && <span aria-hidden="true">({extraContacts})</span>}
            </TabsTrigger>
            <TabsTrigger value="documents" className={TAB_TRIGGER}>
              {t("sheet.tabs.documents")}
              {documents > 0 && <span aria-hidden="true">({documents})</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="flex flex-col gap-6">
            <VendorPhoto
              photoData={vendor.photoData}
              photoUrl={vendor.photoUrl}
              name={vendor.name}
              category={vendor.category}
              seed={vendor.placeId ?? vendor.id}
              kind={vendor.placeKind ?? vendor.category}
              illustrated
              className="aspect-[16/9] rounded-xl"
            />

            {vendor.rating ? (
              <div className="flex items-center gap-2 text-sm text-ink-muted">
                <RatingStars value={vendor.rating} />
                <span>{t("rating.value", { count: vendor.rating })}</span>
              </div>
            ) : null}

            {hasAnything ? (
              <ul className="flex flex-col gap-5">
                {(location || maps) && (
                  <ContactRow icon={<MapPinIcon />} label={t("contact.location")}>
                    {location && <p>{location}</p>}
                    {maps && (
                      <a
                        href={maps}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(LINK, "mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm")}
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
              <p className="rounded-xl bg-lilac-soft ring-1 ring-lilac-edge px-4 py-3.5 text-sm text-ink">
                {t("contact.empty")}
              </p>
            )}

            {hasDetails && (
              <div className="flex flex-col gap-4">
                <LinesBlock title={t("sheet.includes")} text={vendor.includes} />
                <LinesBlock title={t("sheet.pros")} text={vendor.pros} />
                <LinesBlock title={t("sheet.cons")} text={vendor.cons} />
              </div>
            )}

            <ul>
              <VendorAppointments planId={planId} vendorId={vendor.id} />
            </ul>

            <VendorBudgetSummary planId={planId} vendorId={vendor.id} vendorCost={vendor.cost} />
          </TabsContent>

          <TabsContent value="contacts">
            <VendorContacts planId={planId} vendor={vendor} />
          </TabsContent>

          <TabsContent value="documents">
            <VendorDocuments planId={planId} vendor={vendor} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
