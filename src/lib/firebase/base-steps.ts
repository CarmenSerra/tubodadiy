"use client";

import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  getDocsFromCache,
  query,
  runTransaction,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { dishesQuery, mapDish, mapTable, tablesQuery } from "@/components/banquet/banquet-firebase";
import { beautyQuery, decorQuery, mapBeauty, mapDecor, mapRings, ringsRef } from "@/components/look/look-firebase";
import {
  AFTER_WEDDING_CATEGORY,
  BANQUET_CATEGORY,
  OUTFIT_CATEGORY,
  CEREMONY_CATEGORY,
  TIMELINE_CATEGORY,
  afterWeddingReached,
  banquetReached,
  ceremonyExtrasReached,
  dayOfReached,
  statusAfterTasksChange,
  styleReached,
  weddingHasPassed,
} from "@/lib/auto-tasks";
import { contactsQuery, musicQuery, readingsQuery, shotsQuery, songsQuery, witnessesQuery } from "@/lib/firebase/dayof";
import { getFirebaseDb } from "@/lib/firebase/client";
import { syncAutoTaskStep } from "@/lib/firebase/mutations";
import { canReadSection, canSyncTasks } from "@/lib/firebase/sync-access";
import {
  budgetItemsQuery,
  guestsQuery,
  mapBudgetItem,
  mapGuest,
  mapVendor,
  vendorsQuery,
} from "@/lib/firebase/plans";
import { STEP_DEFINITIONS, baseTaskAuto, currentAuto, type StepDefinition } from "@/lib/steps";
import { addToIndex, hasBaseTask, indexPlanTasks } from "@/lib/task-dedupe";
import type { PlanSection } from "@/lib/permissions";
import type { PlanStep, StepTask, StepTaskAuto, WeddingPlan } from "@/lib/types";

/**
 * Campo del paso donde se recuerdan las tareas base «tardías» que ya se
 * ofrecieron a ese plan (se hayan añadido o no). Así, si alguien borra una,
 * no vuelve a aparecer. Los pasos antiguos no lo tienen.
 */
const SEEDED_FIELD = "seededAutos";

const stepsCollection = (planId: string) => collection(getFirebaseDb(), "weddingPlans", planId, "steps");

/** Tareas «tardías» (posteriores a la primera versión) de un paso base. */
function lateTasksOf(def: StepDefinition) {
  return def.suggestedTasks.flatMap((task) =>
    typeof task !== "string" && task.late ? [{ title: task.title, auto: task.auto }] : []
  );
}

/** Pasos del plan tal como están guardados (con el campo de control), sin gastar lecturas si ya están en caché. */
async function readRawSteps(planId: string): Promise<QueryDocumentSnapshot<DocumentData>[]> {
  const q = query(stepsCollection(planId));
  try {
    const cached = await getDocsFromCache(q);
    if (!cached.empty) return cached.docs;
  } catch {
    // Sin caché: se lee del servidor.
  }
  return (await getDocs(q)).docs;
}

/**
 * Incorpora a un plan ya creado los pasos y tareas base añadidos después de su
 * primera versión (Banquete, Después de la boda, tareas de Ceremonia, Día B y
 * Estilo…), UNA sola vez y sin duplicar:
 *  - un paso nuevo se crea con id fijo (`base-<categoría>`) dentro de una
 *    transacción, y antes se comprueba en el servidor que no exista ya;
 *  - una tarea nueva se añade solo si el paso no la «ofreció» ya (campo
 *    `seededAutos`) y el plan no tiene ya esa tarea: misma clave, mismo texto en
 *    cualquier idioma o una idea equivalente de «Ideas» (ver `task-dedupe.ts`);
 *  - los planes creados con la versión actual ya traen todo: solo se les anota
 *    el campo de control, sin añadir nada.
 * Añadir una tarea sin hacer a un paso completado lo reabre (como cualquier
 * tarea nueva). Nunca lanza: devuelve las claves `auto` que ha añadido.
 */
export async function ensureBaseSteps(planId: string, steps: PlanStep[]): Promise<StepTaskAuto[]> {
  const added: StepTaskAuto[] = [];
  // Crea y completa pasos: hace falta poder editar «Tareas».
  if (!canSyncTasks(planId)) return added;
  try {
    const raw = await readRawSteps(planId);
    const byCategory = new Map<string, QueryDocumentSnapshot<DocumentData>>();
    for (const snap of raw) {
      const category = snap.data().category;
      if (typeof category === "string" && !byCategory.has(category)) byCategory.set(category, snap);
    }
    // Pasos de los que partimos: los guardados (aunque la lista en vivo vaya algo por detrás).
    const index = indexPlanTasks(steps);

    for (const def of STEP_DEFINITIONS) {
      const late = lateTasksOf(def);
      if (!def.late && late.length === 0) continue;
      try {
        const existing = byCategory.get(def.category);
        if (!existing) {
          if (def.late) added.push(...(await createLateStep(planId, def, index)));
          continue;
        }
        const seeded = new Set<string>(existing.data()[SEEDED_FIELD] ?? []);
        if (late.every((task) => seeded.has(task.auto))) continue;
        added.push(...(await addLateTasks(planId, existing.id, def, index)));
      } catch (error) {
        console.warn(`No se pudo completar el paso «${def.category}»`, error);
      }
    }
  } catch (error) {
    console.warn("No se pudieron incorporar los pasos nuevos al plan", error);
  }
  return added;
}

/** Crea un paso nuevo con id fijo. Devuelve las tareas que ha escrito (vacío si ya existía). */
async function createLateStep(
  planId: string,
  def: StepDefinition,
  index: ReturnType<typeof indexPlanTasks>
): Promise<StepTaskAuto[]> {
  const db = getFirebaseDb();
  // El listener en vivo pudo ir por detrás: se confirma en el servidor que no existe.
  const found = await getDocs(query(stepsCollection(planId), where("category", "==", def.category)));
  if (!found.empty) return [];

  const tasks: StepTask[] = [];
  const autos: StepTaskAuto[] = [];
  for (const task of def.suggestedTasks) {
    if (typeof task === "string") {
      tasks.push({ id: crypto.randomUUID(), title: task, done: false });
      continue;
    }
    autos.push(task.auto);
    if (hasBaseTask(index, def.category, task.auto)) continue;
    tasks.push({ id: crypto.randomUUID(), title: task.title, done: false, auto: task.auto });
  }

  let created = false;
  await runTransaction(db, async (tx) => {
    created = false;
    const ref = doc(stepsCollection(planId), `base-${def.category}`);
    if ((await tx.get(ref)).exists()) return;
    tx.set(ref, {
      category: def.category,
      title: def.title,
      description: def.description,
      status: statusAfterTasksChange("pending", [], tasks),
      sortOrder: STEP_DEFINITIONS.indexOf(def),
      notes: "",
      tasks,
      [SEEDED_FIELD]: autos,
    });
    created = true;
  });
  if (!created) return [];
  for (const task of tasks) addToIndex(index, task);
  return tasks.flatMap((task) => (task.auto ? [task.auto] : []));
}

/** Añade a un paso existente las tareas tardías que aún no se le han ofrecido. */
async function addLateTasks(
  planId: string,
  stepId: string,
  def: StepDefinition,
  index: ReturnType<typeof indexPlanTasks>
): Promise<StepTaskAuto[]> {
  const db = getFirebaseDb();
  const late = lateTasksOf(def);
  let written: StepTask[] = [];

  await runTransaction(db, async (tx) => {
    written = [];
    const ref = doc(stepsCollection(planId), stepId);
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    const seeded = new Set<string>(data[SEEDED_FIELD] ?? []);
    const current: StepTask[] = data.tasks ?? [];
    const fresh = indexPlanTasks([{ category: def.category, tasks: current }]);

    for (const task of late) {
      if (seeded.has(task.auto)) continue;
      if (hasBaseTask(index, def.category, task.auto) || hasBaseTask(fresh, def.category, task.auto)) continue;
      written.push({ id: crypto.randomUUID(), title: task.title, done: false, auto: task.auto });
    }

    const patch: Record<string, unknown> = {
      [SEEDED_FIELD]: [...new Set([...seeded, ...late.map((task) => task.auto)])],
    };
    if (written.length > 0) {
      const tasks = [...current, ...written];
      const status = data.status ?? "pending";
      const nextStatus = statusAfterTasksChange(status, current, tasks);
      patch.tasks = tasks;
      if (nextStatus !== status) patch.status = nextStatus;
    }
    tx.update(ref, patch);
  });

  for (const task of written) addToIndex(index, task);
  return written.flatMap((task) => (task.auto ? [task.auto] : []));
}

// ---------------------------------------------------------------------------
// Tareas que se marcan solas con datos de las herramientas nuevas
// ---------------------------------------------------------------------------

/**
 * Marca las tareas base de Ceremonia, Día B, Banquete, Estilo y Después de la
 * boda cuyo hito ya cumplen los datos guardados. Solo LEE las colecciones y solo
 * mira las que hacen falta para alguna tarea aún sin hacer. Nunca desmarca ni
 * lanza. `justAdded`: tareas recién incorporadas por `ensureBaseSteps` (aún no
 * están en `steps`).
 */
export async function syncToolMilestones(
  planId: string,
  plan: Pick<WeddingPlan, "weddingDate">,
  steps: PlanStep[],
  justAdded: StepTaskAuto[] = []
): Promise<void> {
  // Escribe los pasos (Tareas: editar); cada hito solo se calcula si se puede leer su sección.
  if (!canSyncTasks(planId)) return;
  const can = (...sections: PlanSection[]) => sections.every((section) => canReadSection(planId, section));
  const pending = new Set<StepTaskAuto>(justAdded);
  for (const step of steps) {
    for (const task of step.tasks) {
      if (task.done) continue;
      const auto = currentAuto(task.auto) ?? baseTaskAuto(step.category, task.title);
      if (auto) pending.add(auto);
    }
  }

  const job = async (
    category: string,
    autos: StepTaskAuto[],
    compute: () => Promise<StepTaskAuto[]>,
    reads: PlanSection[]
  ) => {
    if (!autos.some((auto) => pending.has(auto))) return;
    if (!can(...reads)) return;
    try {
      const reached = (await compute()).filter((auto) => autos.includes(auto) && pending.has(auto));
      if (reached.length > 0) await syncAutoTaskStep(planId, category, { reached });
    } catch (error) {
      console.warn("No se pudieron sincronizar las tareas del plan", error);
    }
  };
  const count = async (q: Parameters<typeof getCountFromServer>[0]) => (await getCountFromServer(q)).data().count;

  await Promise.all([
    job(CEREMONY_CATEGORY, ["ceremony-readings-music", "ceremony-witnesses"], async () =>
      ceremonyExtrasReached({
        readings: await count(readingsQuery(planId)),
        tracks: await count(musicQuery(planId)),
        witnesses: await count(witnessesQuery(planId)),
      })
    , ["ceremony"]),
    job(TIMELINE_CATEGORY, ["dayof-contacts", "dayof-shots", "dayof-playlist"], async () =>
      dayOfReached({
        contacts: await count(contactsQuery(planId)),
        shots: await count(shotsQuery(planId)),
        songs: await count(songsQuery(planId)),
      })
    , ["dayof"]),
    job(BANQUET_CATEGORY, ["banquet-seating", "banquet-menu"], async () => {
      const [guests, tables, dishes] = await Promise.all([
        getDocs(guestsQuery(planId)),
        getDocs(tablesQuery(planId)),
        getDocs(dishesQuery(planId)),
      ]);
      return banquetReached(
        guests.docs.map((d) => mapGuest(d.id, d.data())),
        tables.docs.map((d) => mapTable(d.id, d.data())),
        dishes.docs.map((d) => mapDish(d.id, d.data()))
      );
    }, ["banquet", "guests"]),
    job(OUTFIT_CATEGORY, ["style-beauty", "style-rings", "style-decor"], async () => {
      const [beauty, decor, rings] = await Promise.all([
        getDocs(beautyQuery(planId)),
        getDocs(decorQuery(planId)),
        getDoc(ringsRef(planId)),
      ]);
      return styleReached({
        beauty: beauty.docs.map((d) => mapBeauty(d.id, d.data())),
        decor: decor.docs.map((d) => mapDecor(d.id, d.data())),
        rings: rings.exists() ? mapRings(rings.id, rings.data()) : null,
      });
    }, ["style"]),
    weddingHasPassed(plan.weddingDate)
      ? job(AFTER_WEDDING_CATEGORY, ["after-thanks", "after-payments", "after-rate-vendors"], async () => {
          const [guests, items, vendors] = await Promise.all([
            getDocs(guestsQuery(planId)),
            getDocs(budgetItemsQuery(planId)),
            getDocs(vendorsQuery(planId)),
          ]);
          return afterWeddingReached({
            weddingDate: plan.weddingDate,
            guests: guests.docs.map((d) => mapGuest(d.id, d.data())),
            budgetItems: items.docs.map((d) => mapBudgetItem(d.id, d.data())),
            // La valoración (`rating`) la guarda la ficha del proveedor; se lee tal cual del documento.
            vendors: vendors.docs.map((d) => ({
              status: mapVendor(d.id, d.data()).status,
              rating: typeof d.data().rating === "number" ? (d.data().rating as number) : null,
            })),
          });
        }, ["guests", "budget", "vendors"])
      : Promise.resolve(),
  ]);
}
