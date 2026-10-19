"use client";

// Marco común de las vistas de impresión (Invitados y Presupuesto): barra con
// «Volver» e «Imprimir» que no sale en papel, cabecera con el nombre de la boda
// y el contenido en claro siempre. Mismo patrón que el plan de mesas y el cronograma.

import * as React from "react";
import Link from "next/link";
import { ArrowLeftIcon, Loader2, PrinterIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { RequireAuth } from "@/components/auth/require-auth";
import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import { formatWeekdayDate, weddingName } from "@/components/timeline/timeline-model";
import { PlanProvider, usePlanContext } from "@/lib/context/plan-context";
import { usePlanPermission } from "@/lib/hooks/use-plan-permission";
import type { PlanSection } from "@/lib/permissions";
import { useLanguage } from "@/lib/i18n/provider";
import type { WeddingPlan } from "@/lib/types";

/** Datos que recibe el documento imprimible una vez comprobado el acceso. */
export interface PrintDocumentProps {
  planId: string;
  plan: WeddingPlan;
}

/**
 * Deja pasar solo a quien puede ver la sección del documento (y a nadie más): así no se
 * lanzan lecturas que Firestore denegaría. Va dentro de `PlanProvider`.
 */
export function PrintSectionGate({ section, children }: { section: PlanSection; children: React.ReactNode }) {
  const { t } = useTranslation("export");
  const { canView, loading } = usePlanPermission(section);
  if (loading) {
    return (
      <div role="status" aria-label={t("print.preparing")} className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-ink-muted" />
      </div>
    );
  }
  if (!canView) {
    return <p className="mx-auto max-w-md px-4 py-24 text-center text-sm text-ink">{t("print.noAccess")}</p>;
  }
  return <>{children}</>;
}

function Gate({ planId, Document }: { planId: string; Document: React.ComponentType<PrintDocumentProps> }) {
  const { t } = useTranslation("export");
  const { plan, loading, isMember } = usePlanContext();
  if (loading) {
    return (
      <div role="status" aria-label={t("print.preparing")} className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-ink-muted" />
      </div>
    );
  }
  if (!plan || !isMember) {
    return <p className="mx-auto max-w-md px-4 py-24 text-center text-sm text-ink">{t("print.noAccess")}</p>;
  }
  return <Document planId={planId} plan={plan} />;
}

/** Pide sesión, carga el plan y comprueba que la persona es miembro antes de pintar el documento. */
export function PrintPage({
  planId,
  section,
  Document,
}: {
  planId: string;
  /** Sección cuyos datos imprime el documento: hace falta poder verla. */
  section: PlanSection;
  Document: React.ComponentType<PrintDocumentProps>;
}) {
  return (
    <RequireAuth>
      <PlanProvider planId={planId}>
        <PrintSectionGate section={section}>
          <Gate planId={planId} Document={Document} />
        </PrintSectionGate>
      </PlanProvider>
    </RequireAuth>
  );
}

/** Barra + cabecera + contenido. `landscape` pide papel apaisado (tablas anchas). */
export function PrintFrame({
  plan,
  backHref,
  title,
  summary,
  landscape = false,
  children,
}: {
  plan: WeddingPlan;
  backHref: string;
  title: string;
  summary?: string;
  landscape?: boolean;
  children: React.ReactNode;
}) {
  const { t } = useTranslation("export");
  const { lang } = useLanguage();
  const date = formatWeekdayDate(plan.weddingDate, lang);
  return (
    <div data-theme="light" className="min-h-screen bg-panel text-ink-strong">
      <style>{`@page { size: A4 ${landscape ? "landscape" : "portrait"}; margin: 12mm; }`}</style>
      <div className="print:hidden border-b border-line bg-panel">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <Link href={backHref} className={CTA_SECONDARY}>
            <ArrowLeftIcon aria-hidden="true" className="size-4" />
            {t("print.back")}
          </Link>
          <div className="flex items-center gap-3">
            <p className="hidden text-sm text-ink-muted sm:block">{t("print.pdfHint")}</p>
            <button type="button" onClick={() => window.print()} className={CTA_PRIMARY}>
              <PrinterIcon aria-hidden="true" className="size-4" />
              {t("print.button")}
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8 print:max-w-none print:p-0">
        <header className="border-b-2 border-ink pb-4">
          <h1 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">{title}</h1>
          <p className="mt-1 font-display text-lg text-ink-strong">
            {weddingName(plan.title, lang)}
            {date ? ` · ${date}` : ""}
          </p>
          {summary && <p className="mt-1 text-sm text-ink">{summary}</p>}
        </header>
        {children}
      </main>
    </div>
  );
}
