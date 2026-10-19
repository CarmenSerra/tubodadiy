// Exportar Invitados: una fila por invitado con respuesta, familia, dietas,
// mesa (si el banquete ya la tiene), alojamiento, transporte y regalo.

import type { BanquetTable } from "@/components/banquet/banquet-model";
import { companionName, visibleNotes } from "@/components/guests/guest-filters";
import { DEFAULT_LANG, type Lang } from "@/lib/i18n/config";
import { getServerT } from "@/lib/i18n/server";
import type { Guest } from "@/lib/types";
import { currentLang } from "./download";
import { downloadSheets } from "./sheets";
import type { Cell, ExportFormat, ExportSheet } from "./types";

/** Nombre de la mesa de cada invitado (el primero que la tenga). */
export function tableNameByGuest(tables: readonly BanquetTable[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const table of tables) {
    for (const id of table.guestIds) if (!map.has(id)) map.set(id, table.name);
  }
  return map;
}

export function guestsSheets(
  guests: readonly Guest[],
  tables: readonly BanquetTable[],
  lang: Lang = DEFAULT_LANG
): ExportSheet[] {
  const t = getServerT(lang, "export");
  const tGuests = getServerT(lang, "guests");
  const tDiets = getServerT(lang, "diets");
  const yesNo = (value: boolean) => (value ? t("yes") : t("no"));
  const tableOf = tableNameByGuest(tables);
  const sorted = [...guests].sort((a, b) => a.name.localeCompare(b.name, lang));

  const rows: Cell[][] = sorted.map((g) => [
    g.name,
    yesNo(g.plusOne),
    g.plusOne ? companionName(g) : "",
    tGuests(`rsvp.${g.rsvpStatus}`),
    g.rsvpStatus === "declined" ? 0 : 1 + (g.plusOne ? 1 : 0),
    g.groupName.trim(),
    g.householdName.trim(),
    g.dietIds.map((id) => tDiets(`items.${id}.label`)).join("; "),
    g.dietaryNotes.trim(),
    tableOf.get(g.id) ?? "",
    yesNo(g.needsLodging),
    g.needsLodging ? g.lodgingPlace.trim() : "",
    yesNo(g.needsTransport),
    g.needsTransport ? g.transportFrom.trim() : "",
    g.giftReceived.trim(),
    g.giftAmount,
    g.giftReceived.trim() || g.giftAmount !== null ? yesNo(g.thankYouSent) : "",
    g.thankYouSent ? g.thankYouDate : "",
    visibleNotes(g),
  ]);

  return [
    {
      name: t("guests.sheet"),
      columns: [
        { header: t("guests.columns.name"), width: 28 },
        { header: t("guests.columns.plusOne") },
        { header: t("guests.columns.companion"), width: 24 },
        { header: t("guests.columns.rsvp") },
        { header: t("guests.columns.seats"), kind: "number" },
        { header: t("guests.columns.group"), width: 20 },
        { header: t("guests.columns.household"), width: 20 },
        { header: t("guests.columns.diets"), width: 30 },
        { header: t("guests.columns.dietNotes"), width: 28 },
        { header: t("guests.columns.table"), width: 14 },
        { header: t("guests.columns.lodging") },
        { header: t("guests.columns.lodgingPlace"), width: 26 },
        { header: t("guests.columns.transport") },
        { header: t("guests.columns.transportFrom"), width: 26 },
        { header: t("guests.columns.gift"), width: 28 },
        { header: t("guests.columns.giftAmount"), kind: "money" },
        { header: t("guests.columns.thanks") },
        { header: t("guests.columns.thanksDate"), kind: "date" },
        { header: t("guests.columns.notes"), width: 36 },
      ],
      rows,
    },
  ];
}

export function exportGuests(
  guests: readonly Guest[],
  tables: readonly BanquetTable[],
  format: ExportFormat,
  lang: Lang = currentLang()
): void {
  downloadSheets(guestsSheets(guests, tables, lang), format, getServerT(lang, "export")("guests.file"), lang);
}
