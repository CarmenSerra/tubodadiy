import type { OnboardingExtras } from "@/lib/firebase/onboarding";
import {
  CEREMONY_OPTIONS,
  DEFAULT_PLAN_TITLE,
  VENDOR_TYPES,
  VENUE_SCOPE_OPTIONS,
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
  label: string;
  value: string;
}

export interface Submission {
  plan: { title: string; weddingDate: string | null; budgetTotal: number };
  extras: OnboardingExtras;
  summary: SummaryLine[];
}

const MAX_BUDGET = 1_000_000_000;
const MAX_APPROX_GUESTS = 10_000;

function budgetValue(raw: string): number | null {
  if (!raw.trim()) return null;
  const value = parseAmount(raw);
  if (Number.isNaN(value) || value <= 0 || value > MAX_BUDGET) return null;
  return Math.round(value * 100) / 100;
}

function approxGuestsValue(raw: string): number | null {
  const text = raw.replace(/[\s.]/g, "");
  if (!text) return null;
  const value = Number(text);
  return Number.isInteger(value) && value > 0 && value <= MAX_APPROX_GUESTS ? value : null;
}

/** Errores de la pantalla (id del campo → mensaje); vacío si se puede avanzar. */
export function validateScreen(screen: ScreenId, answers: OnboardingAnswers): Record<string, string> {
  const errors: Record<string, string> = {};

  if (screen === "budget" && answers.budget.trim()) {
    const value = parseAmount(answers.budget);
    if (Number.isNaN(value)) errors["onb-budget"] = "Escribe un importe válido, por ejemplo 12.000.";
    else if (value < 0) errors["onb-budget"] = "El presupuesto no puede ser negativo.";
    else if (value > MAX_BUDGET) errors["onb-budget"] = "Ese importe es demasiado grande.";
  }

  if (screen === "approx" && answers.guestsApprox.trim() && approxGuestsValue(answers.guestsApprox) === null) {
    errors["onb-approx"] = "Escribe un número entero, por ejemplo 120.";
  }

  if (screen === "vendors") {
    for (const type of VENDOR_TYPES) {
      const v = answers.vendors[type.key];
      if (v?.on && v.price.trim()) {
        const value = parseAmount(v.price);
        if (Number.isNaN(value) || value < 0 || value > MAX_BUDGET) {
          errors[`onb-vendor-price-${type.key}`] = "Escribe un importe válido, por ejemplo 1.500.";
        }
      }
    }
  }

  return errors;
}

export function buildSubmission(answers: OnboardingAnswers): Submission {
  const screens = screensFor(answers);
  const asks = (screen: ScreenId) => screens.includes(screen);
  const has = (key: OnboardingAnswers["have"][number]) => answers.mode === "advanced" && answers.have.includes(key);

  const extras: OnboardingExtras = {};
  const summary: SummaryLine[] = [];

  const weddingDate = asks("date") && answers.date ? answers.date : null;
  if (weddingDate) summary.push({ kind: "date", label: "Fecha", value: formatDate(weddingDate) });

  const budgetTotal = (asks("budget") && budgetValue(answers.budget)) || 0;
  if (budgetTotal > 0) summary.push({ kind: "budget", label: "Presupuesto", value: formatCurrency(budgetTotal) });

  if (asks("ceremony") && answers.ceremony && answers.ceremony !== "unknown") {
    extras.ceremony = answers.ceremony;
    const option = CEREMONY_OPTIONS.find((o) => o.value === answers.ceremony);
    summary.push({ kind: "ceremony", label: "Ceremonia", value: option?.label ?? "" });
  }

  const venueName = answers.venueName.trim();
  if (asks("venue") && venueName) {
    const location = answers.venueLocation.trim();
    extras.venue = { name: venueName, location, scope: answers.venueScope };
    const scope = VENUE_SCOPE_OPTIONS.find((o) => o.value === answers.venueScope)?.label.toLowerCase();
    summary.push({
      kind: "venue",
      label: "Lugar",
      value: `${venueName}${location ? `, ${location}` : ""} (${answers.venueScope === "ambos" ? "ceremonia y banquete" : scope})`,
    });
  }

  if (asks("guests")) {
    const { guests } = parseGuestList(answers.guestsPaste);
    if (guests.length > 0) {
      extras.guests = guests;
      summary.push({
        kind: "guests",
        label: "Invitados",
        value: `${formatCount(guests.length)} ${guests.length === 1 ? "invitado" : "invitados"} en la lista`,
      });
    }
  }
  if (asks("approx")) {
    const approx = approxGuestsValue(answers.guestsApprox);
    if (approx) {
      extras.guestsApprox = approx;
      summary.push({ kind: "guests", label: "Invitados", value: `Unos ${formatCount(approx)} invitados` });
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
      const names = vendors.map((v) => v.type.label).join(", ");
      summary.push({
        kind: "vendors",
        label: "Proveedores",
        value: `${vendors.length} ${vendors.length === 1 ? "proveedor" : "proveedores"} (${names})`,
      });
    }
  }

  if (has("vestuario")) {
    extras.dress = true;
    summary.push({ kind: "dress", label: "Vestido o traje", value: "Ya elegido" });
  }
  if (has("alianzas")) {
    extras.rings = true;
    summary.push({ kind: "rings", label: "Alianzas", value: "Ya las tenéis" });
  }
  if (has("luna") && asks("honeymoon")) {
    const destination = answers.honeymoonDestination.trim();
    extras.honeymoon = { destination };
    summary.push({ kind: "honeymoon", label: "Luna de miel", value: destination || "Ya la tenéis" });
  }

  return {
    plan: { title: answers.title.trim() || DEFAULT_PLAN_TITLE, weddingDate, budgetTotal },
    extras,
    summary,
  };
}
