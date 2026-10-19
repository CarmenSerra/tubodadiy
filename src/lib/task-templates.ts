// Plantillas de tareas por tipo de boda: paquetes de tareas que se añaden de golpe
// a las secciones del plan desde el botón «Ideas», sin duplicar lo que ya hay.
//
// Textos:
//  - tareas propias de la plantilla ... steps:templates.tasks.<id>
//  - tareas de «Ideas» ................ vendors:ideas.steps.<categoría>.<id>.title
//  - tareas base ...................... el título base (con su clave `auto`)
//  - nombre y descripción ............. plan:templates.<plantilla>.{name,description}

import { ideaKey, titlesInAllLanguages } from "@/components/ideas/ideas-text";
import { stepDefinitionOf, type StepTranslate } from "@/lib/steps";
import {
  addToIndex,
  baseTaskKeys,
  baseTasksCoveringIdea,
  hasBaseTask,
  ideaTitleKeys,
  indexPlanTasks,
  type PlanTaskIndex,
} from "@/lib/task-dedupe";
import { statusAfterTasksChange } from "@/lib/auto-tasks";
import type { PlanStep, StepStatus, StepTask, StepTaskAuto } from "@/lib/types";

export type TemplateId = "civil" | "religious" | "destination" | "intimate";

export type TemplateTask =
  | { category: string; kind: "idea"; id: string }
  | { category: string; kind: "base"; auto: StepTaskAuto }
  | { category: string; kind: "own"; id: string };

export interface TaskTemplate {
  id: TemplateId;
  tasks: TemplateTask[];
}

const idea = (category: string, id: string): TemplateTask => ({ category, kind: "idea", id });
const base = (category: string, auto: StepTaskAuto): TemplateTask => ({ category, kind: "base", auto });
const own = (category: string, id: string): TemplateTask => ({ category, kind: "own", id });

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: "civil",
    tasks: [
      idea("documentos_legales", "pedir-cita-registro-civil"),
      idea("documentos_legales", "pedir-certificado-literal-nacimiento"),
      idea("documentos_legales", "obtener-certificado-empadronamiento"),
      idea("documentos_legales", "conseguir-certificado-estado-civil"),
      idea("documentos_legales", "preparar-copias-del-dni"),
      own("ceremonia", "civil-room"),
      own("ceremonia", "civil-capacity"),
      base("ceremonia", "ceremony-witnesses"),
      base("ceremonia", "ceremony-readings-music"),
      idea("ceremonia", "escribir-los-votos"),
      own("lugar", "civil-lunch"),
      base("despues_boda", "after-register"),
    ],
  },
  {
    id: "religious",
    tasks: [
      idea("documentos_legales", "pedir-partida-bautismo-reciente"),
      idea("documentos_legales", "hacer-expediente-parroquial"),
      idea("documentos_legales", "apuntarse-cursillo-prematrimonial"),
      idea("documentos_legales", "confirmar-con-parroquia-oficiante"),
      base("ceremonia", "ceremony-witnesses"),
      own("ceremonia", "religious-readings"),
      own("ceremonia", "religious-choir"),
      own("ceremonia", "religious-flowers"),
      own("ceremonia", "religious-rice"),
      idea("ceremonia", "imprimir-programa-misal-ceremonia"),
      idea("ceremonia", "preparar-cojin-caja-para"),
      own("alojamiento_transporte", "religious-transfer"),
      base("despues_boda", "after-register"),
    ],
  },
  {
    id: "destination",
    tasks: [
      own("lugar", "dest-visit"),
      own("documentos_legales", "dest-legal"),
      own("documentos_legales", "dest-recognition"),
      own("proveedores", "dest-planner"),
      own("proveedores", "dest-local"),
      own("papeleria", "dest-savedate"),
      own("invitados", "dest-passports"),
      idea("alojamiento_transporte", "pedir-bloqueo-habitaciones-hoteles"),
      idea("alojamiento_transporte", "reservar-alojamiento-para-familia"),
      own("alojamiento_transporte", "dest-info"),
      own("tareas_generales", "dest-insurance"),
      own("timeline", "dest-schedule"),
    ],
  },
  {
    id: "intimate",
    tasks: [
      own("invitados", "small-list"),
      own("invitados", "small-call"),
      own("lugar", "small-place"),
      own("proveedores", "small-photo"),
      own("papeleria", "small-invite"),
      base("ceremonia", "ceremony-witnesses"),
      own("ceremonia", "small-words"),
      own("timeline", "small-plan"),
      own("tareas_generales", "small-party"),
    ],
  },
];

/** Una tarea de plantilla lista para añadir: con su título en el idioma actual y sus claves de comparación. */
interface ResolvedTemplateTask {
  category: string;
  title: string;
  auto?: StepTaskAuto;
  present: (index: PlanTaskIndex) => boolean;
}

function resolve(task: TemplateTask, t: StepTranslate): ResolvedTemplateTask {
  if (task.kind === "base") {
    const def = stepDefinitionOf(task.category);
    const found = def?.suggestedTasks.find((s) => typeof s !== "string" && s.auto === task.auto);
    return {
      category: task.category,
      title: found && typeof found !== "string" ? found.title : task.auto,
      auto: task.auto,
      present: (index) => hasBaseTask(index, task.category, task.auto),
    };
  }
  if (task.kind === "idea") {
    const keys = ideaTitleKeys(task.category, task.id);
    const covering = baseTasksCoveringIdea(task.category, task.id);
    return {
      category: task.category,
      title: t(`ideas.steps.${task.category}.${task.id}.title`, { ns: "vendors", defaultValue: task.id }),
      present: (index) => keys.some((k) => index.titles.has(k)) || covering.some((a) => index.autos.has(a)),
    };
  }
  const key = `templates.tasks.${task.id}`;
  const keys = titlesInAllLanguages(key, "steps").map(ideaKey);
  return {
    category: task.category,
    title: t(key, { ns: "steps", defaultValue: task.id }),
    present: (index) => keys.some((k) => index.titles.has(k)),
  };
}

/** Lo que una plantilla cambiaría en un paso. */
export interface TemplatePatch {
  stepId: string;
  category: string;
  tasks: StepTask[];
  status: StepStatus;
  added: StepTask[];
}

type StepLike = Pick<PlanStep, "id" | "category" | "status" | "tasks">;

/**
 * Qué añadiría una plantilla a estos pasos: solo las tareas que el plan aún no
 * tiene (por clave, por texto en cualquier idioma o por una idea equivalente), una
 * sola vez aunque la plantilla las repita, y nunca en pasos omitidos. Puro.
 */
export function planTemplate(template: TaskTemplate, steps: StepLike[], t: StepTranslate): TemplatePatch[] {
  const index = indexPlanTasks(steps);
  const byCategory = new Map<string, StepLike>();
  for (const step of steps) if (!byCategory.has(step.category)) byCategory.set(step.category, step);

  const added = new Map<string, StepTask[]>();
  for (const raw of template.tasks) {
    const step = byCategory.get(raw.category);
    if (!step || step.status === "skipped") continue;
    const task = resolve(raw, t);
    if (task.present(index)) continue;
    const entry: StepTask = { id: crypto.randomUUID(), title: task.title, done: false };
    if (task.auto) entry.auto = task.auto;
    added.set(step.id, [...(added.get(step.id) ?? []), entry]);
    addToIndex(index, entry);
    // También por sus otros títulos, para que la misma tarea no entre dos veces.
    if (raw.kind === "base") for (const k of baseTaskKeys(raw.category, raw.auto)) index.titles.add(k);
  }

  return steps.flatMap((step) => {
    const list = added.get(step.id);
    if (!list) return [];
    const tasks = [...step.tasks, ...list];
    return [
      {
        stepId: step.id,
        category: step.category,
        tasks,
        status: statusAfterTasksChange(step.status, step.tasks, tasks),
        added: list,
      },
    ];
  });
}

/** Cuántas tareas nuevas y en cuántas secciones añadiría una plantilla. */
export function templateCounts(patches: TemplatePatch[]): { tasks: number; sections: number } {
  return { tasks: patches.reduce((sum, p) => sum + p.added.length, 0), sections: patches.length };
}
