import Link from "next/link";
import {
  BedDoubleIcon,
  CalendarHeartIcon,
  ChevronRightIcon,
  ChurchIcon,
  ClockIcon,
  FileTextIcon,
  GiftIcon,
  HeartIcon,
  ListChecksIcon,
  LockIcon,
  MailIcon,
  MapPinIcon,
  PlaneIcon,
  ShirtIcon,
  StoreIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

import { computePhases, phaseOf } from "@/lib/phases";
import type { PlanStep, WeddingPlan } from "@/lib/types";
import { cn } from "@/lib/utils";
import { pickNextSteps, pluralize, type FeaturedPlanData } from "./helpers";
import { CARD, FOCUS, IconCircle, LINK, SECTION_TITLE, Skeleton } from "./ui";

const CATEGORY_ICON: Record<string, LucideIcon> = {
  fecha_presupuesto: CalendarHeartIcon,
  lugar: MapPinIcon,
  invitados: UsersIcon,
  proveedores: StoreIcon,
  vestuario: ShirtIcon,
  papeleria: MailIcon,
  ceremonia: ChurchIcon,
  timeline: ClockIcon,
  alojamiento_transporte: BedDoubleIcon,
  luna_de_miel: PlaneIcon,
  documentos_legales: FileTextIcon,
  lista_regalos: GiftIcon,
  tareas_generales: ListChecksIcon,
};

function stepDetail(step: PlanStep): string {
  const pending = step.tasks.filter((t) => !t.done);
  if (step.tasks.length === 0) return step.description || "Sin tareas todavía";
  const done = step.tasks.length - pending.length;
  if (pending.length === 0) return "Todas las tareas hechas: ya puedes marcarla como completada";
  if (step.status === "in_progress" || done > 0) {
    return `${done} de ${step.tasks.length} tareas hechas · Siguiente: ${pending[0].title}`;
  }
  return `${pluralize(pending.length, "tarea", "tareas")} · Empieza por: ${pending[0].title}`;
}

export function NextSteps({ plan, data }: { plan: WeddingPlan; data: FeaturedPlanData }) {
  const waiting = data.loading && data.steps.length === 0;
  const next = pickNextSteps(data.steps, 4);
  const { phases, current } = computePhases(data.steps);
  const anyOpen = data.steps.some((s) => s.status === "pending" || s.status === "in_progress");
  const allClosed = !waiting && data.steps.length > 0 && !anyOpen;
  // Solo las tareas generales siguen abiertas: las fases ya están terminadas.
  const onlyGeneral = !waiting && anyOpen && next.length === 0;
  const upcoming = current ? (phases[current.index + 1] ?? null) : null;

  // La fase actual ya se indica arriba: solo se etiqueta lo que cae fuera de ella.
  function outsidePhaseLabel(step: PlanStep): string | null {
    const def = phaseOf(step.category);
    if (!def) return "Siempre a mano";
    const phase = phases.find((p) => p.id === def.id);
    if (!phase || phase === current) return null;
    return `Fase ${phase.index + 1} · ${phase.name}`;
  }

  return (
    <section aria-labelledby="next-steps-title" className={cn(CARD, "flex flex-col p-5 sm:p-6")}>
      <h2 id="next-steps-title" className={SECTION_TITLE}>
        Tus siguientes pasos
      </h2>
      <p className="mt-1 text-sm text-[#586C64]">
        Vamos por partes: empieza por lo más importante y avanza a tu ritmo.
      </p>
      {!waiting && current && next.length > 0 && (
        <p className="mt-3 inline-flex w-fit max-w-full rounded-full bg-[#ECE6F4] px-3 py-1 text-xs font-medium text-[#26413C]">
          Fase {current.index + 1} de {phases.length} · {current.name}
        </p>
      )}

      {waiting ? (
        <ul className="mt-5 flex flex-col gap-4" role="status" aria-label="Cargando siguientes pasos">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-4">
              <Skeleton className="size-10 shrink-0" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </li>
          ))}
        </ul>
      ) : data.error && data.steps.length === 0 ? (
        <p className="mt-5 rounded-xl bg-[#ECE6F4] p-4 text-sm text-[#26413C]">
          No hemos podido cargar tus secciones ahora mismo. Puedes verlas directamente en{" "}
          <Link href={`/plan/${plan.id}`} className={LINK}>
            el resumen del plan
          </Link>
          .
        </p>
      ) : data.steps.length === 0 ? (
        <p className="mt-5 rounded-xl bg-[#ECE6F4] p-4 text-sm text-[#26413C]">
          Este plan todavía no tiene secciones. Ábrelo para empezar a organizarlo.
        </p>
      ) : allClosed ? (
        <div className="mt-5 flex items-center gap-4 rounded-xl bg-[#ECE6F4] p-4">
          <IconCircle tone="sage">
            <HeartIcon />
          </IconCircle>
          <p className="text-[#26413C]">
            Has completado todas las secciones. ¡Qué gran trabajo! Si surge algo nuevo, lo
            encontrarás en{" "}
            <Link href={`/plan/${plan.id}`} className={LINK}>
              tu plan
            </Link>
            .
          </p>
        </div>
      ) : onlyGeneral ? (
        <div className="mt-5 flex items-center gap-4 rounded-xl bg-[#ECE6F4] p-4">
          <IconCircle tone="sage">
            <HeartIcon />
          </IconCircle>
          <p className="text-[#26413C]">
            Has terminado todas las fases del plan. Solo te queda tu lista libre de{" "}
            <Link href={`/plan/${plan.id}`} className={LINK}>
              tareas generales
            </Link>
            , cuando quieras.
          </p>
        </div>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-[#E5DDEC]">
          {next.map((step, i) => {
            const Icon = CATEGORY_ICON[step.category] ?? ListChecksIcon;
            const inProgress = step.status === "in_progress";

            const outsideLabel = outsidePhaseLabel(step);
            return (
              <li key={step.id}>
                <Link
                  href={`/plan/${plan.id}`}
                  className={cn(
                    "group -mx-2 flex items-center gap-4 rounded-xl px-2 py-3.5 transition-colors hover:bg-[#ECE6F4]",
                    FOCUS
                  )}
                >
                  <IconCircle tone={i % 2 === 0 ? "lilac" : "sage"}>
                    <Icon />
                  </IconCircle>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span className="font-display text-base font-semibold text-[#102D28]">
                        {step.title}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium",
                          inProgress
                            ? "bg-[#DECDF1] text-[#38384D]"
                            : "border border-[#D4C0EA] text-[#586C64]"
                        )}
                      >
                        {inProgress ? "En marcha" : "Por empezar"}
                      </span>
                    </span>
                    {outsideLabel && (
                      <span className="mt-0.5 block text-xs font-medium text-[#586C64]">
                        {outsideLabel}
                      </span>
                    )}
                    <span className="mt-0.5 block text-sm text-[#586C64] [overflow-wrap:anywhere]">
                      {stepDetail(step)}
                    </span>
                  </span>
                  <ChevronRightIcon
                    className="size-5 shrink-0 text-[#586C64] transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {!waiting && current && upcoming && next.length > 0 && (
        <p className="mt-2 flex items-start gap-2 text-sm text-[#586C64]">
          <LockIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            Cuando termines «{current.name}», se abre «{upcoming.name}». Sin prisa.
          </span>
        </p>
      )}

      {!waiting && data.steps.length > 0 && (
        <p className="mt-auto pt-4 text-sm">
          <Link href={`/plan/${plan.id}`} className={LINK}>
            Ver todas las secciones del plan
          </Link>
        </p>
      )}
    </section>
  );
}
