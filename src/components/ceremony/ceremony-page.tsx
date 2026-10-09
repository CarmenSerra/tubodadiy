"use client";

import * as React from "react";
import { FileCheck2Icon } from "lucide-react";

import { CeremonyTypeSection } from "@/components/ceremony/ceremony-type-section";
import { OfficiantSection } from "@/components/ceremony/officiant-section";
import { CeremonySection } from "@/components/ceremony/section";
import { TimelineSection } from "@/components/ceremony/timeline-section";
import { CeremonyDialog } from "@/components/plan-tools/ceremony-dialog";
import { LegalDocsBody } from "@/components/plan-tools/legal-docs-dialog";

/** Pestaña «Ceremonia»: tipo, oficiante, documentos legales y resumen del cronograma. */
export function CeremonyPage() {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const openPicker = React.useCallback(() => setPickerOpen(true), []);

  // Las tareas del plan llevan aquí con un ancla (#tipo, #oficiante, #documentos…).
  React.useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <CeremonyTypeSection onPick={openPicker} />
        <OfficiantSection />
      </div>
      <CeremonySection
        id="documentos"
        icon={<FileCheck2Icon />}
        title="Documentos legales"
        description="Guía de papeles y trámites para casaros en España."
      >
        <LegalDocsBody onChooseCeremony={openPicker} />
      </CeremonySection>
      <TimelineSection />
      <CeremonyDialog open={pickerOpen} onOpenChange={setPickerOpen} />
    </div>
  );
}
