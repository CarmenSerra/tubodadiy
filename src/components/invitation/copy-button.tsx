"use client";

import * as React from "react";
import { CheckIcon, CopyIcon } from "lucide-react";

import type { Lang } from "@/lib/i18n/config";
import { getServerT } from "@/lib/i18n/server";

/** Copia un dato (IBAN, Bizum) con un toque. Funciona también sin la API moderna. */
export function CopyButton({ value, label, lang }: { value: string; label: string; lang: Lang }) {
  // Texto en el idioma de la invitación (no el de quien la abre).
  const t = getServerT(lang, "invitation");
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<number | undefined>(undefined);

  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch {
      try {
        const area = document.createElement("textarea");
        area.value = value;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        ok = document.execCommand("copy");
        area.remove();
      } catch {
        ok = false;
      }
    }
    if (!ok) return;
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" onClick={copy} className="inv-copyBtn" aria-label={t("view.copy.aria", { label })}>
      {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
      <span aria-live="polite">{copied ? t("view.copy.done") : t("view.copy.action")}</span>
    </button>
  );
}
