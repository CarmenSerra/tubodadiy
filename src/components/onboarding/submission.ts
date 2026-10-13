import type { TFunction } from "i18next";

import type { OnboardingExtras } from "@/lib/firebase/onboarding";
import { DEFAULT_LANG, type Lang } from "@/lib/i18n/config";
import {
  VENDOR_TYPES,
  defaultPlanTitle,
  formatCount,
  parseGuestList,
  screensFor,
  type OnboardingAnswers,
  type ScreenId,
} from "@/lib/onboarding-model";
import { formatCurrency, formatDate, parseAmount } from "@/lib/utils";

// Del estado del flujo a lo que se crea: datos del plan, extras y resumen.
// Solo cuentan las respuestas de las pantallas que forman parte del recorrido
// actual (si alguien cambia de "ya tenemos cosas" a "desde cero", lo que
// escribió antes y ya no se pregunta no se aplica).

export type SummaryKind =
  | "date"
  | "budget"
  | "ceremony"
  | "venue"
  | "guests"
  | "vendors"
  | "dress"
  | "rings"
  | "honeymoon";

export interface SummaryLine {
  kind: SummaryKind;
  /** Ya traducido. */
  label: string;
  /** Ya traducido. */
  value: string;
}

export interface Submission {
  plan: { title: string; weddingDate: string | null; budgetTotal: number };
  extras: OnboardingExtras;
  summary: SummaryLine[];
}

const MAX_BUDGET = 1_000_000_000;
const MAX_APPROX_GUESTS = 10_000;

function budgetValue(raw: string, lang: Lang): number | null {
  if (!raw.trim()) return null;
  const value = parseAmount(raw, lang);
  if (Number.isNaN(value) || value <= 0 || value > MAX_BUDGET) return null;
  return Math.round(value * 100) / 100;
}

function approxGuestsValue(raw: string): number | null {
  const text = raw.replace(/[\s.]/g, "");
  if (!text) return null;
  const value = Number(text);
  return Number.isInteger(value) && value > 0 && value <= MAX_APPROX_GUESTS ? value : null;
}

/**
 * Errores de la pantalla (id del campo → mensaje ya traducido); vacío si se
 * puede avanzar. `t` es el de `useTranslation("onboarding")`.
 */
export function validateScreen(
  screen: ScreenId,
  answers: OnboardingAnswers,
  t: TFunction,
  lang: Lang = DEFAULT_LANG
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (screen === "budget" && answers.budget.trim()) {
    const value = parseAmount(answers.budget, lang);
    if (Number.isNaN(value)) errors["onb-budget"] = t("errors.budgetInvalid");
    else if (value < 0) errors["onb-budget"] = t("errors.budgetNegative");
    else if (value > MAX_BUDGET) errors["onb-budget"] = t("errors.amountTooLarge");
  }

  if (screen === "approx" && answers.guestsApprox.trim() && approxGuestsValue(answers.guestsApprox) === null) {
    errors["onb-approx"] = t("errors.guestsInvalid");
  }

  if (screen === "vendors") {
    for (const type of VENDOR_TYPES) {
      const v = answers.vendors[type.key];
      if (v?.on && v.price.trim()) {
        const value = parseAmount(v.price, lang);
        if (Number.isNaN(value) || value < 0 || value > MAX_BUDGET) {
          errors[`onb-vendor-price-${type.key}`] = t("errors.priceInvalid");
        }
      }
    }
  }

  return errors;
}

/** Datos a crear y resumen (ya traducido con `t` de `useTranslation("onboarding")`). */
export function buildSubmission(
  answers: OnboardingAnswers,
  t: TFunction,
  lang: Lang = DEFAULT_LANG
): Submission {
  const screens = screensFor(answers);
  const asks = (screen: ScreenId) => screens.includes(screen);
  const has = (key: OnboardingAnswers["have"][number]) => answers.mode === "advanced" && answers.have.includes(key);

  const extras: OnboardingExtras = {};
  const summary: SummaryLine[] = [];

  const weddingDate = asks("date") && answers.date ? answers.date : null;
  if (weddingDate) summary.push({ kind: "date", label: t("summary.labels.date"), value: formatDate(weddingDate, lang) });

  const budgetTotal = (asks("budget") && budgetValue(answers.budget, lang)) || 0;
  if (budgetTotal > 0) summary.push({ kind: "budget", label: t("summary.labels.budget"), value: formatCurrency(budgetTotal, lang) });

  if (asks("ceremony") && answers.ceremony && answers.ceremony !== "unknown") {
    extras.ceremony = answers.ceremony;
    summary.push({
      kind: "ceremony",
      label: t("summary.labels.ceremony"),
      value: t(`options.ceremony.${answers.ceremony}.label`),
    });
  }

  const venueName = answers.venueName.trim();
  if (asks("venue") && venueName) {
    const location = answers.venueLocation.trim();
    extras.venue = { name: venueName, location, scope: answers.venueScope };
    summary.push({
      kind: "venue",
      label: t("summary.labels.venue"),
      value: `${venueName}${location ? `, ${location}` : ""} (${t(`summary.venueScope.${answers.venueScope}`)})`,
    });
  }

  if (asks("guests")) {
    const { guests } = parseGuestList(answers.guestsPaste);
    if (guests.length > 0) {
      extras.guests = guests;
      summary.push({
        kind: "guests",
        label: t("summary.labels.guests"),
        value: t("summary.guestsList", { count: guests.length, n: formatCount(guests.length, lang) }),
      });
    }
  }
  if (asks("approx")) {
    const approx = approxGuestsValue(answers.guestsApprox);
    if (approx) {
      extras.guestsApprox = approx;
      summary.push({
        kind: "guests",
        label: t("summary.labels.guests"),
        value: t("summary.guestsApprox", { n: formatCount(approx, lang) }),
      });
    }
  }

  if (asks("vendors")) {
    const vendors: NonNullable<OnboardingExtras["vendors"]> = [];
    for (const type of VENDOR_TYPES) {
      const v = answers.vendors[type.key];
      if (!v?.on) continue;
      const cost = v.price.trim() ? parseAmount(v.price) : Number.NaN;
      vendors.push({
        type,
        name: v.name.trim(),
        cost: Number.isNaN(cost) || cost < 0 ? null : Math.round(cost * 100) / 100,
      });
    }
    if (vendors.length > 0) {
      extras.vendors = vendors;
      const names = vendors.map((v) => t(`vendorTypes.${v.type.key}`)).join(", ");
      summary.push({
        kind: "vendors",
        label: t("summary.labels.vendors"),
        value: t("summary.vendorsList", { count: vendors.length, names }),
      });
    }
  }

  if (has("vestuario")) {
    extras.dress = true;
    summary.push({ kind: "dress", label: t("summary.labels.dress"), value: t("summary.dressDone") });
  }
  if (has("alianzas")) {
    extras.rings = true;
    summary.push({ kind: "rings", label: t("summary.labels.rings"), value: t("summary.ringsDone") });
  }
  if (has("luna") && asks("honeymoon")) {
    const destination = answers.honeymoonDestination.trim();
    extras.honeymoon = { destination };
    summary.push({
      kind: "honeymoon",
      label: t("summary.labels.honeymoon"),
      value: destination || t("summary.honeymoonDone"),
    });
  }

  return {
    plan: { title: answers.title.trim() || defaultPlanTitle(lang), weddingDate, budgetTotal },
    extras,
    summary,
  };
}
