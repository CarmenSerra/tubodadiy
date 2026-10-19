// Reconocer que una tarea «ya la tienes» aunque esté escrita de otra forma:
// misma clave `auto`, mismo texto (en cualquier idioma, sin tildes ni signos) o
// una idea equivalente del botón «Ideas». Lo usan la migración de tareas base
// (firebase/base-steps.ts), las plantillas y el propio botón «Ideas».
//
// Puro salvo por la lectura de los textos de los idiomas (getServerT, que lee
// los mismos JSON que el cliente).

import { ideaKey, titlesInAllLanguages } from "@/components/ideas/ideas-text";
import { baseTaskAuto, currentAuto, stepDefinitionOf } from "@/lib/steps";
import type { PlanStep, StepTaskAuto } from "@/lib/types";

/** Una idea del botón «Ideas» (`vendors:ideas.steps.<categoría>.<id>`). */
export interface IdeaRef {
  category: string;
  id: string;
}

/**
 * Ideas del botón «Ideas» que cuentan como la MISMA tarea que una tarea base
 * nueva: si la persona ya tiene la idea, la tarea base no se le añade, y si
 * tiene la tarea base, la idea sale como «Ya la tienes».
 */
export const BASE_TASK_EQUIVALENTS: Partial<Record<StepTaskAuto, IdeaRef[]>> = {
  "ceremony-readings-music": [
    { category: "ceremonia", id: "elegir-lecturas-poemas-textos" },
    { category: "ceremonia", id: "elegir-musica-entrada-firma" },
  ],
  "ceremony-witnesses": [
    { category: "documentos_legales", id: "elegir-los-testigos-del" },
    { category: "ceremonia", id: "elegir-las-personas-que" },
  ],
  "dayof-shots": [{ category: "timeline", id: "acordar-con-fotografo-las" }],
  "dayof-playlist": [{ category: "timeline", id: "preparar-lista-musica-para" }],
  "banquet-seating": [
    { category: "invitados", id: "preparar-plano-mesas-con" },
    { category: "invitados", id: "asignar-cada-invitado-una" },
  ],
  "style-beauty": [{ category: "proveedores", id: "reservar-peluqueria-maquillaje" }],
  "style-rings": [{ category: "tareas_generales", id: "comprar-las-alianzas" }],
  "style-decor": [{ category: "proveedores", id: "elegir-florista-definir-estilo" }],
  "after-thanks": [{ category: "lista_regalos", id: "enviar-mensajes-agradecimiento-personalizados" }],
  "after-register": [{ category: "documentos_legales", id: "pedir-libro-familia-tras" }],
  "after-paperwork": [{ category: "documentos_legales", id: "cambiar-domicilio-titulares-contratos" }],
  "after-keepsakes": [{ category: "vestuario", id: "planificar-limpieza-conservacion-posterior" }],
};

/** Tareas base que cubren cada idea (el inverso de `BASE_TASK_EQUIVALENTS`), por `categoría|id`. */
const BASE_COVERING_IDEA = new Map<string, StepTaskAuto[]>();
for (const [auto, ideas] of Object.entries(BASE_TASK_EQUIVALENTS) as [StepTaskAuto, IdeaRef[]][]) {
  for (const idea of ideas) {
    const key = `${idea.category}|${idea.id}`;
    BASE_COVERING_IDEA.set(key, [...(BASE_COVERING_IDEA.get(key) ?? []), auto]);
  }
}

/** Claves `auto` de las tareas base que cubren una idea (vacío si ninguna). */
export function baseTasksCoveringIdea(category: string, ideaId: string): StepTaskAuto[] {
  return BASE_COVERING_IDEA.get(`${category}|${ideaId}`) ?? [];
}

/** Claves de comparación (títulos en todos los idiomas) de una idea. */
export function ideaTitleKeys(category: string, ideaId: string): string[] {
  return titlesInAllLanguages(`ideas.steps.${category}.${ideaId}.title`).map(ideaKey);
}

/** Claves de comparación de una tarea base: su título en todos los idiomas y el de sus ideas equivalentes. */
export function baseTaskKeys(category: string, auto: StepTaskAuto): Set<string> {
  const keys = new Set<string>();
  const def = stepDefinitionOf(category);
  const base = def?.suggestedTasks.find((task) => typeof task !== "string" && task.auto === auto);
  if (base && typeof base !== "string") keys.add(ideaKey(base.title));
  for (const title of titlesInAllLanguages(`sections.${category}.tasks.${auto}`, "steps")) {
    keys.add(ideaKey(title));
  }
  for (const idea of BASE_TASK_EQUIVALENTS[auto] ?? []) {
    for (const key of ideaTitleKeys(idea.category, idea.id)) keys.add(key);
  }
  keys.delete("");
  return keys;
}

/** Lo que el plan ya tiene: títulos normalizados y claves `auto` de todas sus tareas. */
export interface PlanTaskIndex {
  titles: Set<string>;
  autos: Set<StepTaskAuto>;
}

export function indexPlanTasks(steps: Pick<PlanStep, "category" | "tasks">[]): PlanTaskIndex {
  const titles = new Set<string>();
  const autos = new Set<StepTaskAuto>();
  for (const step of steps) {
    for (const task of step.tasks) {
      const key = ideaKey(task.title);
      if (key) titles.add(key);
      const auto = currentAuto(task.auto) ?? baseTaskAuto(step.category, task.title);
      if (auto) autos.add(auto);
    }
  }
  return { titles, autos };
}

/** ¿El plan ya tiene esta tarea base (por `auto`, por texto o por una idea equivalente)? */
export function hasBaseTask(index: PlanTaskIndex, category: string, auto: StepTaskAuto): boolean {
  if (index.autos.has(auto)) return true;
  for (const key of baseTaskKeys(category, auto)) if (index.titles.has(key)) return true;
  return false;
}

/** Añade al índice una tarea que se va a escribir (para no repetirla dentro de la misma pasada). */
export function addToIndex(index: PlanTaskIndex, task: { title: string; auto?: StepTaskAuto }): void {
  const key = ideaKey(task.title);
  if (key) index.titles.add(key);
  if (task.auto) index.autos.add(task.auto);
}
