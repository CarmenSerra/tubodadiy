// Exportar Proveedores: una fila por opción con categoría, estado, coste y
// contacto. Lo monta Proveedores con `exportVendorsCsv(vendors)`.

import { categoryLabel } from "@/components/vendors/vendor-model";
import { DEFAULT_LANG, type Lang } from "@/lib/i18n/config";
import { getServerT } from "@/lib/i18n/server";
import type { Vendor } from "@/lib/types";
import { currentLang } from "./download";
import { downloadSheets } from "./sheets";
import type { Cell, ExportFormat, ExportSheet } from "./types";

export function vendorsSheets(vendors: readonly Vendor[], lang: Lang = DEFAULT_LANG): ExportSheet[] {
  const t = getServerT(lang, "export");
  const tVendors = getServerT(lang, "vendors");
  const rows: Cell[][] = [...vendors]
    .sort(
      (a, b) =>
        categoryLabel(a.category, tVendors).localeCompare(categoryLabel(b.category, tVendors), lang) ||
        a.name.localeCompare(b.name, lang)
    )
    .map((v) => [
      categoryLabel(v.category, tVendors),
      v.name,
      tVendors(`status.${v.status}`),
      v.cost,
      v.contactPhone,
      v.contactEmail,
      v.website ?? "",
      (v.address || v.location || "").trim(),
      v.municipality ?? "",
      v.province ?? "",
      v.community ?? "",
      v.mapsUrl ?? "",
      v.notes.trim(),
    ]);
  return [
    {
      name: t("vendors.sheet"),
      columns: [
        { header: t("vendors.columns.category"), width: 22 },
        { header: t("vendors.columns.name"), width: 30 },
        { header: t("vendors.columns.status") },
        { header: t("vendors.columns.cost"), kind: "money" },
        { header: t("vendors.columns.phone"), width: 18 },
        { header: t("vendors.columns.email"), width: 28 },
        { header: t("vendors.columns.website"), width: 28 },
        { header: t("vendors.columns.address"), width: 34 },
        { header: t("vendors.columns.municipality"), width: 20 },
        { header: t("vendors.columns.province"), width: 18 },
        { header: t("vendors.columns.community"), width: 20 },
        { header: t("vendors.columns.maps"), width: 30 },
        { header: t("vendors.columns.notes"), width: 36 },
      ],
      rows,
    },
  ];
}

export function exportVendors(vendors: readonly Vendor[], format: ExportFormat, lang: Lang = currentLang()): void {
  downloadSheets(vendorsSheets(vendors, lang), format, getServerT(lang, "export")("vendors.file"), lang);
}

/**
 * Descarga los proveedores como CSV para Excel (UTF-8 con BOM). Sin `lang`, usa
 * el idioma de la interfaz.
 */
export function exportVendorsCsv(vendors: readonly Vendor[], lang?: Lang): void {
  exportVendors(vendors, "csv", lang ?? currentLang());
}

/** Lo mismo en XLSX. */
export function exportVendorsXlsx(vendors: readonly Vendor[], lang?: Lang): void {
  exportVendors(vendors, "xlsx", lang ?? currentLang());
}
