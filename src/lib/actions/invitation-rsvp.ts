"use server";

import { headers } from "next/headers";
import { FieldValue, type DocumentReference, type Firestore } from "firebase-admin/firestore";

import {
  LIMITS,
  SLUG_RE,
  isDeadlinePassed,
  nameKey,
  type RsvpAnswer,
} from "@/components/invitation/invitation-model";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import {
  GUESTS_CATEGORY,
  guestsReached,
  statusAfterTasksChange,
  syncAutoTasks,
} from "@/lib/auto-tasks";
import type { Guest, StepStatus, StepTask } from "@/lib/types";

/**
 * Respuestas a la invitación pública. Se escriben aquí, con el Admin SDK,
 * porque las reglas de Firestore no dejan crear `rsvps` desde el navegador y
 * quien responde no tiene cuenta.
 */

export interface RsvpInput {
  slug: string;
  /** Id de una respuesta anterior de este navegador: se edita en vez de crear otra. */
  rsvpId?: string | null;
  name: string;
  attending: boolean;
  plusOne: boolean;
  plusOneName: string;
  dietary: string;
  message: string;
  /** Señuelo anti-bots: las personas no lo ven ni lo rellenan. */
  website?: string;
}

export type RsvpResult =
  | { ok: true; rsvpId: string; updated: boolean }
  | { ok: false; error: string; field?: "name" | "plusOneName" | "dietary" | "message" };

const GROUP_FROM_INVITATION = "Desde la invitación";
/** Marca de la línea de `notes` que escribe la invitación (se reemplaza al editar). */
const COMPANION_PREFIX = "Acompañante (invitación): ";

// ---- Límite de envíos (en memoria: suave, por instancia) ----

const PER_IP_MAX = 6;
const PER_IP_WINDOW_MS = 10 * 60 * 1000;
const PER_SLUG_MAX = 150;
const PER_SLUG_WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();

function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= PER_SLUG_WINDOW_MS)) hits.delete(k);
    }
  }
  return false;
}

/** IP del cliente. Cloud Run añade la suya al final de X-Forwarded-For. */
async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const last = forwarded?.split(",").pop()?.trim();
  return last || h.get("x-real-ip") || "unknown";
}

// ---- Validación ----

const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

function text(value: unknown, multiline = false): string {
  let v = typeof value === "string" ? value : "";
  v = v.replace(CONTROL_CHARS, "").replace(/\r\n/g, "\n");
  v = multiline ? v.trim() : v.replace(/\s+/g, " ").trim();
  return v;
}

function validate(input: RsvpInput): { answer: RsvpAnswer } | { error: string; field?: "name" | "plusOneName" | "dietary" | "message" } {
  const name = text(input.name);
  if (name.length < 2) return { error: "Escribe tu nombre y apellidos.", field: "name" };
  if (name.length > LIMITS.guestName) {
    return { error: `El nombre es demasiado largo (máximo ${LIMITS.guestName} caracteres).`, field: "name" };
  }
  if (!/\p{L}/u.test(name)) return { error: "Escribe tu nombre y apellidos.", field: "name" };

  const plusOneName = text(input.plusOneName);
  if (plusOneName.length > LIMITS.plusOneName) {
    return { error: "El nombre del acompañante es demasiado largo.", field: "plusOneName" };
  }
  const dietary = text(input.dietary, true);
  if (dietary.length > LIMITS.dietary) {
    return { error: `Alergias o dieta: máximo ${LIMITS.dietary} caracteres.`, field: "dietary" };
  }
  const message = text(input.message, true);
  if (message.length > LIMITS.rsvpMessage) {
    return { error: `El mensaje es demasiado largo (máximo ${LIMITS.rsvpMessage} caracteres).`, field: "message" };
  }

  const attending = input.attending === true;
  const plusOne = attending && input.plusOne === true;
  return {
    answer: {
      name,
      attending,
      plusOne,
      plusOneName: plusOne ? plusOneName : "",
      dietary: attending ? dietary : "",
      message,
    },
  };
}

// ---- Acciones ----

export async function submitRsvp(input: RsvpInput): Promise<RsvpResult> {
  if (!isFirebaseAdminConfigured) {
    return { ok: false, error: "Ahora mismo no podemos recibir respuestas. Inténtalo más tarde." };
  }
  const slug = typeof input?.slug === "string" ? input.slug : "";
  if (!SLUG_RE.test(slug)) return { ok: false, error: "Esta invitación no existe." };

  // Señuelo: a un bot se le responde «bien» sin guardar nada.
  if (typeof input.website === "string" && input.website.trim() !== "") {
    return { ok: true, rsvpId: "x".repeat(20), updated: false };
  }

  const ip = await clientIp();
  if (
    rateLimited(`ip:${ip}|${slug}`, PER_IP_MAX, PER_IP_WINDOW_MS) ||
    rateLimited(`slug:${slug}`, PER_SLUG_MAX, PER_SLUG_WINDOW_MS)
  ) {
    return { ok: false, error: "Demasiados envíos seguidos. Espera unos minutos e inténtalo de nuevo." };
  }

  const checked = validate(input);
  if ("error" in checked) return { ok: false, error: checked.error, field: checked.field };
  const { answer } = checked;

  try {
    const db = getAdminDb();
    const invitation = await db.collection("publicInvitations").doc(slug).get();
    const data = invitation.data();
    if (!invitation.exists || !data || data.published !== true || typeof data.planId !== "string") {
      return { ok: false, error: "Esta invitación ya no está disponible." };
    }
    const deadline = typeof data.rsvpDeadline === "string" ? data.rsvpDeadline : "";
    if (isDeadlinePassed(deadline)) {
      return { ok: false, error: "El plazo para confirmar ya ha terminado. Escribe directamente a los novios." };
    }

    const planId: string = data.planId;
    const planRef = db.collection("weddingPlans").doc(planId);
    if (!(await planRef.get()).exists) {
      return { ok: false, error: "Esta invitación ya no está disponible." };
    }

    const requested = typeof input.rsvpId === "string" && /^[A-Za-z0-9]{10,40}$/.test(input.rsvpId) ? input.rsvpId : null;
    const result = await upsertRsvp(db, planId, slug, requested, answer);
    await syncGuestTasks(db, planId);
    return { ok: true, rsvpId: result.rsvpId, updated: result.updated };
  } catch (error) {
    console.error("No se pudo guardar la respuesta de la invitación", error);
    return { ok: false, error: "No hemos podido guardar tu respuesta. Inténtalo de nuevo en un momento." };
  }
}

/** Devuelve la respuesta anterior de este navegador, para poder editarla. */
export async function loadRsvp(slug: string, rsvpId: string): Promise<RsvpAnswer | null> {
  if (!isFirebaseAdminConfigured) return null;
  if (!SLUG_RE.test(slug) || !/^[A-Za-z0-9]{10,40}$/.test(rsvpId)) return null;
  if (rateLimited(`load:${await clientIp()}`, 30, PER_IP_WINDOW_MS)) return null;
  try {
    const db = getAdminDb();
    const invitation = (await db.collection("publicInvitations").doc(slug).get()).data();
    if (!invitation || typeof invitation.planId !== "string") return null;
    const snap = await db
      .collection("weddingPlans")
      .doc(invitation.planId)
      .collection("rsvps")
      .doc(rsvpId)
      .get();
    const d = snap.data();
    if (!d || d.slug !== slug) return null;
    return {
      name: String(d.name ?? ""),
      attending: Boolean(d.attending),
      plusOne: Boolean(d.plusOne),
      plusOneName: String(d.plusOneName ?? ""),
      dietary: String(d.dietary ?? ""),
      message: String(d.message ?? ""),
    };
  } catch {
    return null;
  }
}

// ---- Escritura: respuesta + invitado ----

async function upsertRsvp(
  db: Firestore,
  planId: string,
  slug: string,
  requestedId: string | null,
  answer: RsvpAnswer
): Promise<{ rsvpId: string; updated: boolean }> {
  const planRef = db.collection("weddingPlans").doc(planId);
  const rsvps = planRef.collection("rsvps");
  const guestsRef = planRef.collection("guests");

  return db.runTransaction(async (tx) => {
    // Lecturas primero (requisito de las transacciones).
    const previousSnap = requestedId ? await tx.get(rsvps.doc(requestedId)) : null;
    const previous = previousSnap?.exists && previousSnap.data()?.slug === slug ? previousSnap : null;
    const guestsSnap = await tx.get(guestsRef);

    const guests = guestsSnap.docs.map((d) => ({
      ref: d.ref,
      key: nameKey(String(d.data().name ?? "")),
      data: d.data() as Partial<Guest>,
    }));

    const wantedKey = nameKey(answer.name);
    const linkedId: string | null = previous?.data()?.guestId ?? null;
    const createdByInvitation = Boolean(previous?.data()?.guestCreated);
    const linked = linkedId ? guests.find((g) => g.ref.id === linkedId) : undefined;

    // 1) El invitado ya enlazado a esta respuesta (se renombra si lo creó la invitación).
    // 2) Un invitado de la lista con el mismo nombre (sin tildes, mayúsculas ni orden).
    // 3) Uno nuevo.
    const target =
      linked && (createdByInvitation || linked.key === wantedKey)
        ? linked
        : guests.find((g) => g.key === wantedKey);

    const rsvpRef: DocumentReference = previous ? previous.ref : rsvps.doc();
    const status = answer.attending ? "confirmed" : "declined";
    const companionLine = answer.plusOne && answer.plusOneName ? `${COMPANION_PREFIX}${answer.plusOneName}` : "";

    let guestId: string;
    let guestCreated = false;

    if (target) {
      guestId = target.ref.id;
      guestCreated = createdByInvitation && target.ref.id === linkedId;
      const update: Record<string, unknown> = { rsvpStatus: status };
      if (answer.attending) {
        update.plusOne = answer.plusOne;
        if (answer.dietary) update.dietaryNotes = answer.dietary;
        update.notes = withCompanionLine(String(target.data.notes ?? ""), companionLine);
      }
      if (guestCreated) update.name = answer.name;
      tx.update(target.ref, update);
    } else {
      const ref = guestsRef.doc();
      guestId = ref.id;
      guestCreated = true;
      tx.set(ref, {
        name: answer.name,
        groupName: GROUP_FROM_INVITATION,
        rsvpStatus: status,
        plusOne: answer.plusOne,
        dietaryNotes: answer.dietary,
        notes: companionLine,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    const base = {
      slug,
      name: answer.name,
      attending: answer.attending,
      plusOne: answer.plusOne,
      plusOneName: answer.plusOneName,
      dietary: answer.dietary,
      message: answer.message,
      guestId,
      guestCreated,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (previous) tx.update(rsvpRef, base);
    else tx.set(rsvpRef, { ...base, createdAt: FieldValue.serverTimestamp() });

    return { rsvpId: rsvpRef.id, updated: Boolean(previous) };
  });
}

/** Sustituye (o quita) la línea de acompañante de la invitación, sin tocar el resto de notas. */
function withCompanionLine(notes: string, line: string): string {
  const rest = notes
    .split("\n")
    .filter((l) => !l.startsWith(COMPANION_PREFIX))
    .join("\n")
    .trim();
  return [rest, line].filter(Boolean).join("\n");
}

// ---- Tareas automáticas del plan (misma lógica que el cliente tras tocar invitados) ----

async function syncGuestTasks(db: Firestore, planId: string): Promise<void> {
  try {
    const planRef = db.collection("weddingPlans").doc(planId);
    const guestDocs = await planRef.collection("guests").get();
    const reached = guestsReached(
      guestDocs.docs.map((d) => ({ rsvpStatus: (d.data().rsvpStatus ?? "pending") as Guest["rsvpStatus"] }))
    );
    const found = await planRef.collection("steps").where("category", "==", GUESTS_CATEGORY).limit(1).get();
    const stepRef = found.docs[0]?.ref;
    if (!stepRef) return;

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(stepRef);
      if (!snap.exists) return;
      const status: StepStatus = snap.data()?.status ?? "pending";
      if (status === "skipped") return;
      const current: StepTask[] = snap.data()?.tasks ?? [];
      const { tasks, changed } = syncAutoTasks(GUESTS_CATEGORY, current, { reached });
      if (!changed) return;
      const next = statusAfterTasksChange(status, current, tasks);
      tx.update(stepRef, next === status ? { tasks } : { tasks, status: next });
    });
  } catch (error) {
    // La respuesta ya está guardada: esto es solo el progreso del paso.
    console.warn("No se pudieron sincronizar las tareas de invitados", error);
  }
}
