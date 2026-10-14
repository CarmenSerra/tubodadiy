"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";

import {
  SLUG_MAX,
  SLUG_MIN,
  isValidSlug,
  slugify,
  type InvitationContent,
} from "@/components/invitation/invitation-model";
import { checkSlugAvailability } from "@/lib/firebase/invitation";

export type SlugStatus = "checking" | "free" | "mine" | "taken" | "error";

export interface SlugCheck {
  status: SlugStatus;
  /** Alternativa libre (el enlace + una palabra) cuando el escrito está ocupado. */
  suggestion: string;
}

/**
 * Comprueba en vivo (con una pausa al teclear) si el enlace está libre y, si
 * está ocupado, busca una alternativa añadiéndole una palabra: «ana_y_luis_lavanda».
 */
export function useSlugAvailability({
  slug,
  valid,
  planId,
  savedSlug,
  base,
  palette,
  year,
}: {
  slug: string;
  valid: boolean;
  planId: string;
  savedSlug: string | null;
  base: string;
  palette: InvitationContent["palette"];
  year: string;
}): SlugCheck {
  const { t } = useTranslation(["invitationPage", "invitation"]);
  const [result, setResult] = React.useState<{ slug: string; status: SlugStatus; suggestion: string } | null>(null);
  const paletteId = palette?.id ?? "";

  React.useEffect(() => {
    if (!valid || slug === savedSlug) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const status = await checkSlugAvailability(slug, planId);
        if (cancelled) return;
        if (status !== "taken") {
          setResult({ slug, status, suggestion: "" });
          return;
        }
        // Palabras para distinguirlo: el nombre de la paleta primero, luego algunas de serie.
        const stem = slug.length >= SLUG_MIN ? slug : base;
        const words = [
          paletteId && paletteId !== "custom" ? slugify(t(`invitation:palettes.${paletteId}`)).split("_")[0] : "",
          slugify(t("invitationPage:slug.words.one")),
          slugify(t("invitationPage:slug.words.two")),
          slugify(t("invitationPage:slug.words.three")),
          year,
        ].filter(Boolean);
        let suggestion = "";
        for (const word of words) {
          const candidate = `${stem}_${word}`.slice(0, SLUG_MAX);
          if (!isValidSlug(candidate) || candidate === slug) continue;
          if ((await checkSlugAvailability(candidate, planId)) === "free") {
            suggestion = candidate;
            break;
          }
          if (cancelled) return;
        }
        if (!cancelled) setResult({ slug, status: "taken", suggestion });
      } catch {
        if (!cancelled) setResult({ slug, status: "error", suggestion: "" });
      }
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [slug, valid, planId, savedSlug, base, paletteId, year, t]);

  if (valid && slug === savedSlug) return { status: "mine", suggestion: "" };
  if (!valid || result?.slug !== slug) return { status: "checking", suggestion: "" };
  return result;
}
