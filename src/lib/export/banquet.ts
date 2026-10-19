// Exportar Banquete: las mesas (ocupación) y los comensales de cada una, con
// quien aún no tiene mesa al final.

import {
  buildTableViews,
  isComing,
  unseatedGuests,
  type BanquetTable,
} from "@/components/banquet/banquet-model";
import { companionName } from "@/components/guests/guest-filters";
import { DEFAULT_LANG, type Lang } from "@/lib/i18n/config";
import { getServerT } from "@/lib/i18n/server";
import type { Guest } from "@/lib/types";
import { currentLang } from "./download";
import { downloadSheets } from "./sheets";
import type { Cell, ExportFormat, ExportSheet } from "./types";

export function banquetSheets(
  tables: readonly BanquetTable[],
  guests: readonly Guest[],
  lang: Lang = DEFAULT_LANG
): ExportSheet[] {
  const t = getServerT(lang, "export");
  const tBanquet = getServerT(lang, "banquet");
  const tGuests = getServerT(lang, "guests");
  const tDiets = getServerT(lang, "diets");
  const views = buildTableViews([...tables], [...guests]);

  const guestRow = (tableName: string, g: Guest): Cell[] => [
    tableName,
    g.name,
    g.plusOne ? companionName(g) || t("yes") : "",
    tGuests(`rsvp.${g.rsvpStatus}`),
    g.dietIds.map((id) => tDiets(`items.${id}.label`)).join("; "),
    g.dietaryNotes.trim(),
  ];

  const tableRows: Cell[][] = views.map(({ table, guests: seated, used, free }) => [
    table.name,
    tBanquet(`table.shapes.${table.shape}`),
    table.capacity,
    used,
    free,
    seated.map((g) => (g.plusOne ? `${g.name} + ${companionName(g) || t("banquet.companion")}` : g.name)).join("\n"),
  ]);

  const guestRows: Cell[][] = [];
  for (const { table, guests: seated } of views) {
    if (seated.length === 0) guestRows.push([table.name, "", "", "", "", ""]);
    for (const g of seated) guestRows.push(guestRow(table.name, g));
  }
  for (const g of unseatedGuests(views, [...guests]).filter(isComing)) {
    guestRows.push(guestRow(t("banquet.unseated"), g));
  }

  return [
    {
      name: t("banquet.sheets.tables"),
      columns: [
        { header: t("banquet.columns.table"), width: 18 },
        { header: t("banquet.columns.shape") },
        { header: t("banquet.columns.capacity"), kind: "number" },
        { header: t("banquet.columns.used"), kind: "number" },
        { header: t("banquet.columns.free"), kind: "number" },
        { header: t("banquet.columns.guests"), width: 50 },
      ],
      rows: tableRows,
    },
    {
      name: t("banquet.sheets.guests"),
      columns: [
        { header: t("banquet.columns.table"), width: 18 },
        { header: t("banquet.columns.guest"), width: 28 },
        { header: t("banquet.columns.companion"), width: 24 },
        { header: t("banquet.columns.rsvp") },
        { header: t("banquet.columns.diets"), width: 30 },
        { header: t("banquet.columns.dietNotes"), width: 28 },
      ],
      rows: guestRows,
    },
  ];
}

export function exportBanquet(
  tables: readonly BanquetTable[],
  guests: readonly Guest[],
  format: ExportFormat,
  lang: Lang = currentLang()
): void {
  downloadSheets(banquetSheets(tables, guests, lang), format, getServerT(lang, "export")("banquet.file"), lang);
}
