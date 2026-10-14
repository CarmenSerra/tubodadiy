// Registro ESTÁTICO de textos: un import por idioma y namespace. No hay
// backend ni carga diferida. Al añadir un idioma, copia el bloque de "en" y
// cambia la carpeta (y añade el código a LANGUAGES en config.ts).

import esAuth from "@/locales/es/auth.json";
import esBudget from "@/locales/es/budget.json";
import esCeremony from "@/locales/es/ceremony.json";
import esCommon from "@/locales/es/common.json";
import esDashboard from "@/locales/es/dashboard.json";
import esCustomCard from "@/locales/es/customCard.json";
import esEnvelope from "@/locales/es/envelope.json";
import esErrors from "@/locales/es/errors.json";
import esGuests from "@/locales/es/guests.json";
import esHoneymoon from "@/locales/es/honeymoon.json";
import esInvitation from "@/locales/es/invitation.json";
import esInvitationPage from "@/locales/es/invitationPage.json";
import esLanding from "@/locales/es/landing.json";
import esOnboarding from "@/locales/es/onboarding.json";
import esPlan from "@/locales/es/plan.json";
import esSteps from "@/locales/es/steps.json";
import esTimeline from "@/locales/es/timeline.json";
import esTools from "@/locales/es/tools.json";
import esVendors from "@/locales/es/vendors.json";

import enAuth from "@/locales/en/auth.json";
import enBudget from "@/locales/en/budget.json";
import enCeremony from "@/locales/en/ceremony.json";
import enCommon from "@/locales/en/common.json";
import enDashboard from "@/locales/en/dashboard.json";
import enCustomCard from "@/locales/en/customCard.json";
import enEnvelope from "@/locales/en/envelope.json";
import enErrors from "@/locales/en/errors.json";
import enGuests from "@/locales/en/guests.json";
import enHoneymoon from "@/locales/en/honeymoon.json";
import enInvitation from "@/locales/en/invitation.json";
import enInvitationPage from "@/locales/en/invitationPage.json";
import enLanding from "@/locales/en/landing.json";
import enOnboarding from "@/locales/en/onboarding.json";
import enPlan from "@/locales/en/plan.json";
import enSteps from "@/locales/en/steps.json";
import enTimeline from "@/locales/en/timeline.json";
import enTools from "@/locales/en/tools.json";
import enVendors from "@/locales/en/vendors.json";

import type { Lang, Namespace } from "./config";

type Bundle = Record<string, unknown>;

/** `satisfies` obliga a registrar todos los namespaces de todos los idiomas. */
export const RESOURCES = {
  es: {
    common: esCommon,
    landing: esLanding,
    auth: esAuth,
    dashboard: esDashboard,
    onboarding: esOnboarding,
    plan: esPlan,
    steps: esSteps,
    vendors: esVendors,
    guests: esGuests,
    budget: esBudget,
    timeline: esTimeline,
    ceremony: esCeremony,
    tools: esTools,
    honeymoon: esHoneymoon,
    invitation: esInvitation,
    invitationPage: esInvitationPage,
    envelope: esEnvelope,
    customCard: esCustomCard,
    errors: esErrors,
  },
  en: {
    common: enCommon,
    landing: enLanding,
    auth: enAuth,
    dashboard: enDashboard,
    onboarding: enOnboarding,
    plan: enPlan,
    steps: enSteps,
    vendors: enVendors,
    guests: enGuests,
    budget: enBudget,
    timeline: enTimeline,
    ceremony: enCeremony,
    tools: enTools,
    honeymoon: enHoneymoon,
    invitation: enInvitation,
    invitationPage: enInvitationPage,
    envelope: enEnvelope,
    customCard: enCustomCard,
    errors: enErrors,
  },
} as const satisfies Record<Lang, Record<Namespace, Bundle>>;
