"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDownIcon, DownloadIcon, FileSpreadsheetIcon, FileTextIcon, PrinterIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CTA_SECONDARY } from "@/components/dashboard/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ExportFormat } from "@/lib/export/types";
import { cn } from "@/lib/utils";

const ITEM = "min-h-11 cursor-pointer gap-2.5 rounded-lg px-3 text-sm focus:bg-lilac-soft focus:text-ink";

/**
 * Botón «Exportar» con un menú: Excel (.xlsx), CSV y, si se pasa `printHref`,
 * la vista de impresión (PDF). `onExport` genera y descarga el fichero; si
 * falla, se avisa con un mensaje amable.
 */
export function ExportMenu({
  what,
  onExport,
  printHref,
  disabled,
  className,
}: {
  /** Qué se exporta, ya traducido y en minúscula (para el nombre accesible: «Exportar la lista de invitados»). */
  what: string;
  onExport: (format: ExportFormat) => void | Promise<void>;
  printHref?: string;
  disabled?: boolean;
  className?: string;
}) {
  const { t } = useTranslation("export");
  const [busy, setBusy] = React.useState(false);

  async function run(format: ExportFormat) {
    if (busy) return;
    setBusy(true);
    try {
      await onExport(format);
    } catch {
      toast.error(t("menu.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled || busy}
        aria-label={t("menu.triggerAria", { what })}
        className={cn(CTA_SECONDARY, "h-11 disabled:cursor-not-allowed disabled:opacity-60", className)}
      >
        <DownloadIcon aria-hidden="true" className="size-4" />
        {t("menu.trigger")}
        <ChevronDownIcon aria-hidden="true" className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 max-w-[calc(100vw-2rem)] rounded-xl border-line bg-surface p-1.5 text-ink shadow-none"
      >
        <DropdownMenuLabel className="px-3 py-1.5 text-xs font-medium text-ink-muted">
          {t("menu.formatLabel")}
        </DropdownMenuLabel>
        <DropdownMenuItem className={ITEM} onSelect={() => void run("xlsx")}>
          <FileSpreadsheetIcon aria-hidden="true" className="size-4 text-green" />
          {t("menu.xlsx")}
        </DropdownMenuItem>
        <DropdownMenuItem className={ITEM} onSelect={() => void run("csv")}>
          <FileTextIcon aria-hidden="true" className="size-4 text-green" />
          {t("menu.csv")}
        </DropdownMenuItem>
        {printHref && (
          <DropdownMenuItem asChild className={ITEM}>
            <Link href={printHref}>
              <PrinterIcon aria-hidden="true" className="size-4 text-green" />
              {t("menu.print")}
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
