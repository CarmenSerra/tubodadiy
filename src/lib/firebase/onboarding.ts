"use client";

import { collection, doc, getDocs, Timestamp, writeBatch } from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebase/client";
import { mapStep, stepsQuery } from "@/lib/firebase/plans";
import {
  findTaskTitle,
  formatCount,
  type CeremonyChoice,
  type ParsedGuest,
  type VendorType,
  VENUE_CATEGORY,
  type VenueScope,
} from "@/lib/onboarding-model";
import type { PlanStep, StepStatus } from "@/lib/types";

// Datos que se aplican justo después de `createWeddingPlan` con lo que la
// persona ha contado en el flujo "Nuevo plan". La fecha y el presupuesto no
// pasan por aquí: `createWeddingPlan` ya marca solas sus tareas.

export interface OnboardingExtras {
  venue?: { name: string; location: string; scope: VenueScope };
  guests?: ParsedGuest[];
  /** Invitados aproximados (solo se anota en el paso "Lista de invitados"). */
  guestsApprox?: number;
  vendors?: { type: VendorType; name: string; cost: number | null }[];
  ceremony?: Exclude<CeremonyChoice, "unknown">;
  dress?: boolean;
  rings?: boolean;
  honeymoon?: { destination: string };
}

/** Cada bloque se escribe (y puede fallar) por separado. */
export type ExtraStage = "venue" | "guests" | "vendors" | "steps";
export type StageState = "active" | "done" | "failed";

export interface ApplyResult {
  failed: { stage: ExtraStage; label: string }[];
}

const STAGE_LABEL: Record<ExtraStage, string> = {
  venue: "el lugar",
  guests: "la lista de invitados",
  vendors: "los proveedores",
  steps: "el progreso de las secciones",
};

/** Bloques que habrá que escribir, en orden (para pintar el avance). */
export function stagesFor(extras: OnboardingExtras): ExtraStage[] {
  const stages: ExtraStage[] = [];
  if (extras.venue) stages.push("venue");
  if (extras.guests?.length) stages.push("guests");
  if (extras.vendors?.length) stages.push("vendors");
  if (hasStepChanges(extras)) stages.push("steps");
  return stages;
}

function hasStepChanges(extras: OnboardingExtras): boolean {
  return Boolean(
    extras.venue ||
      extras.guests?.length ||
      extras.guestsApprox ||
      extras.vendors?.length ||
      extras.ceremony ||
      extras.dress ||
      extras.rings ||
      extras.honeymoon
  );
}

// Firestore admite 500 escrituras por lote; se deja margen.
const BATCH_SIZE = 250;

/**
 * `createdAt` decreciente en el orden del texto pegado: las listas se
 * ordenan por fecha de creación descendente, así que el primero pegado sale
 * el primero.
 */
function orderedStamp(base: number, index: number) {
  return Timestamp.fromMillis(base - index);
}

async function writeVenue(planId: string, venue: NonNullable<OnboardingExtras["venue"]>) {
  const db = getFirebaseDb();
  const scopeNote: Record<VenueScope, string> = {
    ceremonia: "Reservado para la ceremonia.",
    banquete: "Reservado para el banquete.",
    ambos: "Reservado para la ceremonia y el banquete.",
  };
  const batch = writeBatch(db);
  batch.set(doc(collection(db, "weddingPlans", planId, "vendors")), {
    category: VENUE_CATEGORY,
    name: venue.name,
    contactEmail: "",
    contactPhone: "",
    cost: null,
    status: "chosen",
    notes: scopeNote[venue.scope],
    photoUrl: "",
    location: venue.location,
    mapsUrl: "",
    createdAt: Timestamp.now(),
  });
  await batch.commit();
}

async function writeGuests(planId: string, guests: ParsedGuest[]) {
  const db = getFirebaseDb();
  const base = Date.now();
  for (let start = 0; start < guests.length; start += BATCH_SIZE) {
    const batch = writeBatch(db);
    guests.slice(start, start + BATCH_SIZE).forEach((guest, i) => {
      batch.set(doc(collection(db, "weddingPlans", planId, "guests")), {
        name: guest.name,
        groupName: guest.groupName,
        rsvpStatus: "pending",
        plusOne: false,
        dietaryNotes: "",
        notes: "",
        createdAt: orderedStamp(base, start + i),
      });
    });
    await batch.commit();
  }
}

async function writeVendors(planId: string, vendors: NonNullable<OnboardingExtras["vendors"]>) {
  const db = getFirebaseDb();
  const base = Date.now();
  const batch = writeBatch(db);
  vendors.forEach(({ type, name, cost }, i) => {
    batch.set(doc(collection(db, "weddingPlans", planId, "vendors")), {
      category: type.category,
      name: name || type.label,
      contactEmail: "",
      contactPhone: "",
      cost,
      status: "chosen",
      notes: name ? "" : "Falta añadir el nombre y los datos de contacto.",
      photoUrl: "",
      location: "",
      mapsUrl: "",
      createdAt: orderedStamp(base, i),
    });
  });
  await batch.commit();
}

/* ------------------------------------------------------------------ */
/* Pasos: tareas hechas, estado y notas                               */
/* ------------------------------------------------------------------ */

interface StepPatch {
  /** Títulos (exactos, de `steps.ts`) de las tareas que quedan hechas. */
  tick: string[];
  notes: string[];
  status: StepStatus;
}

const STATUS_RANK: Record<StepStatus, number> = { pending: 0, skipped: 0, in_progress: 1, completed: 2 };

function endSentence(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

/** Qué cambia en cada paso (por categoría) según lo que se ha escrito bien. */
function planStepPatches(
  extras: OnboardingExtras,
  written: { venue: boolean; guests: boolean; vendors: boolean }
): Map<string, StepPatch> {
  const patches = new Map<string, StepPatch>();
  const patch = (category: string): StepPatch => {
    let p = patches.get(category);
    if (!p) {
      p = { tick: [], notes: [], status: "pending" };
      patches.set(category, p);
    }
    return p;
  };
  const tick = (category: string, match: RegExp, into: StepPatch) => {
    const title = findTaskTitle(category, match);
    if (title) into.tick.push(title);
  };
  const raise = (p: StepPatch, status: StepStatus) => {
    if (STATUS_RANK[status] > STATUS_RANK[p.status]) p.status = status;
  };

  if (extras.venue && written.venue) {
    const p = patch("lugar");
    const { scope } = extras.venue;
    tick("lugar", /^Visitar/i, p);
    if (scope !== "banquete") tick("lugar", /^Reservar.*ceremonia/i, p);
    if (scope !== "ceremonia") tick("lugar", /^Reservar.*banquete/i, p);
    raise(p, scope === "ambos" ? "completed" : "in_progress");
  }

  if (extras.guests?.length && written.guests) {
    const p = patch("invitados");
    tick("invitados", /borrador/i, p);
    raise(p, "in_progress");
  }
  if (extras.guestsApprox) {
    patch("invitados").notes.push(`Calculamos unos ${formatCount(extras.guestsApprox)} invitados.`);
  }

  if (extras.vendors?.length && written.vendors) {
    const p = patch("proveedores");
    for (const { type } of extras.vendors) {
      if (type.task) tick("proveedores", type.task, p);
    }
    raise(p, "in_progress");
  }

  if (extras.ceremony) {
    const p = patch("ceremonia");
    const label = { civil: "civil", religiosa: "religiosa", simbolica: "simbólica" }[extras.ceremony];
    tick("ceremonia", /tipo de ceremonia/i, p);
    p.notes.push(`Tipo de ceremonia: ${label}.`);
    raise(p, "in_progress");
  }

  if (extras.dress || extras.rings) {
    const p = patch("vestuario");
    if (extras.dress) tick("vestuario", /vestido|traje/i, p);
    if (extras.rings) p.notes.push("Ya tenemos las alianzas.");
    raise(p, "in_progress");
  }

  if (extras.honeymoon) {
    const p = patch("luna_de_miel");
    const destination = extras.honeymoon.destination.trim();
    tick("luna_de_miel", /destino/i, p);
    p.notes.push(destination ? endSentence(`Luna de miel: ${destination}`) : "Ya tenemos la luna de miel.");
    raise(p, "in_progress");
  }

  return patches;
}

async function writeStepPatches(planId: string, patches: Map<string, StepPatch>) {
  if (patches.size === 0) return;
  const db = getFirebaseDb();
  const steps: PlanStep[] = (await getDocs(stepsQuery(planId))).docs.map((d) => mapStep(d.id, d.data()));

  const batch = writeBatch(db);
  let changes = 0;
  for (const step of steps) {
    const p = patches.get(step.category);
    if (!p) continue;
    const tick = new Set(p.tick);
    const tasks = step.tasks.map((t) => (tick.has(t.title) ? { ...t, done: true } : t));
    const status = STATUS_RANK[p.status] > STATUS_RANK[step.status] ? p.status : step.status;
    const notes = [step.notes, ...p.notes].filter(Boolean).join("\n");
    batch.update(doc(db, "weddingPlans", planId, "steps", step.id), { tasks, status, notes });
    changes++;
  }
  if (changes > 0) await batch.commit();
}

/**
 * Aplica los extras a un plan recién creado. Nunca lanza: cada bloque va en su
 * propio try/catch y lo que falle se devuelve en `failed` (el plan ya existe).
 * Las tareas solo se marcan para los bloques que se han escrito bien.
 */
export async function applyOnboardingExtras(
  planId: string,
  extras: OnboardingExtras,
  onStage?: (stage: ExtraStage, state: StageState) => void
): Promise<ApplyResult> {
  const failed: ApplyResult["failed"] = [];
  const written = { venue: false, guests: false, vendors: false };

  async function run(stage: ExtraStage, work: () => Promise<void>): Promise<boolean> {
    onStage?.(stage, "active");
    try {
      await work();
      onStage?.(stage, "done");
      return true;
    } catch (error) {
      console.warn(`No se pudo aplicar «${stage}» al crear el plan`, error);
      failed.push({ stage, label: STAGE_LABEL[stage] });
      onStage?.(stage, "failed");
      return false;
    }
  }

  if (extras.venue) {
    const venue = extras.venue;
    written.venue = await run("venue", () => writeVenue(planId, venue));
  }
  if (extras.guests?.length) {
    const guests = extras.guests;
    written.guests = await run("guests", () => writeGuests(planId, guests));
  }
  if (extras.vendors?.length) {
    const vendors = extras.vendors;
    written.vendors = await run("vendors", () => writeVendors(planId, vendors));
  }
  if (hasStepChanges(extras)) {
    await run("steps", () => writeStepPatches(planId, planStepPatches(extras, written)));
  }

  return { failed };
}
