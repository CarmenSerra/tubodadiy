"use client";

// Botones «Exportar» listos para montar en Invitados, Presupuesto y Banquete.
// Cada uno trae sus propios datos mínimos y no añade escuchas a Firestore: lo
// que falta (las mesas, para la lista de invitados) se lee al exportar.

import { getDocs } from "firebase/firestore";
import { useTranslation } from "react-i18next";

import { mapTable, tablesQuery } from "@/components/banquet/banquet-firebase";
import type { BanquetTable } from "@/components/banquet/banquet-model";
import type { BudgetPlanSettings } from "@/components/budget/budget-model";
import { ExportMenu } from "@/components/export/export-menu";
import { exportBanquet } from "@/lib/export/banquet";
import { exportBudget } from "@/lib/export/budget";
import { exportGuests } from "@/lib/export/guests";
import { exportVendors } from "@/lib/export/vendors";
import { useLanguage } from "@/lib/i18n/provider";
import type { BudgetItem, Guest, Vendor } from "@/lib/types";

/** Invitados: respuesta, familia, dietas, mesa, alojamiento, transporte y regalo. */
export function GuestsExportButton({ planId, guests }: { planId: string; guests: readonly Guest[] }) {
  const { t } = useTranslation("export");
  const { lang } = useLanguage();
  return (
    <ExportMenu
      what={t("guests.what")}
      printHref={`/plan/${planId}/guests/imprimir`}
      onExport={async (format) => {
        // La mesa de cada invitado vive en el Banquete: se lee ahora, sin escucha permanente.
        let tables: BanquetTable[] = [];
        try {
          tables = (await getDocs(tablesQuery(planId))).docs.map((d) => mapTable(d.id, d.data()));
        } catch {
          // Sin permiso o sin conexión: se exporta sin la columna de mesa rellena.
        }
        exportGuests(guests, tables, format, lang);
      }}
    />
  );
}

/** Presupuesto: partidas, plazos y resumen. */
export function BudgetExportButton({
  planId,
  items,
  vendors,
  payerLabels,
  budgetTotal,
}: {
  planId: string;
  items: readonly BudgetItem[];
  vendors: readonly Vendor[];
  payerLabels: BudgetPlanSettings["payerLabels"];
  budgetTotal: number;
}) {
  const { t } = useTranslation("export");
  const { lang } = useLanguage();
  return (
    <ExportMenu
      what={t("budget.what")}
      printHref={`/plan/${planId}/budget/imprimir`}
      onExport={(format) => exportBudget({ items, vendors, payerLabels, budgetTotal }, format, lang)}
    />
  );
}

/** Banquete: mesas con sus comensales. (El PDF del plan de mesas ya tiene su propio botón.) */
export function BanquetExportButton({
  tables,
  guests,
}: {
  tables: readonly BanquetTable[];
  guests: readonly Guest[];
}) {
  const { t } = useTranslation("export");
  const { lang } = useLanguage();
  return (
    <ExportMenu
      what={t("banquet.what")}
      onExport={(format) => exportBanquet(tables, guests, format, lang)}
    />
  );
}

/** Proveedores: datos de contacto, estado, precio y valoración. */
export function VendorsExportButton({ vendors }: { vendors: readonly Vendor[] }) {
  const { t } = useTranslation("export");
  const { lang } = useLanguage();
  return <ExportMenu what={t("vendors.what")} onExport={(format) => exportVendors(vendors, format, lang)} />;
}
