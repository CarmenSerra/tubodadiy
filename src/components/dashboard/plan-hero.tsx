import Link from "next/link";
import { ArrowRightIcon, CalendarHeartIcon, HeartIcon, PartyPopperIcon } from "lucide-react";

import { formatDate, daysUntil } from "@/lib/utils";
import type { WeddingPlan } from "@/lib/types";
import {
  computeProgress,
  formatLongDate,
  progressMessage,
  pluralize,
  type FeaturedPlanData,
} from "./helpers";
import { CARD, CTA_PRIMARY, IconCircle, LINK, Skeleton } from "./ui";

function Countdown({ plan }: { plan: WeddingPlan }) {
  const days = daysUntil(plan.weddingDate);
  const longDate = formatLongDate(plan.weddingDate);

  // Sin fecha: invitación amable, no un aviso.
  if (days === null || !longDate) {
    return (
      <div className="mt-6 flex items-center gap-4">
        <IconCircle tone="lilac" className="size-14 [&_svg]:size-6">
          <CalendarHeartIcon />
        </IconCircle>
        <div>
          <p className="font-display text-2xl font-medium text-[#26413C]">Aún sin fecha</p>
          <p className="text-[#586C64]">
            Cuando la tengas,{" "}
            <Link href={`/plan/${plan.id}`} className={LINK}>
              ponle fecha a tu boda
            </Link>{" "}
            y empezará la cuenta atrás.
          </p>
        </div>
      </div>
    );
  }

  if (days === 0) {
    return (
      <div className="mt-6">
        <p className="flex items-center gap-3 font-display text-4xl font-medium leading-tight text-[#26413C] sm:text-5xl">
          <PartyPopperIcon className="size-8 shrink-0 text-[#474755] sm:size-10" aria-hidden="true" />
          ¡Hoy es el gran día!
        </p>
        <p className="mt-3 text-[#586C64]">Respira, disfruta y déjate querer.</p>
      </div>
    );
  }

  if (days < 0) {
    return (
      <div className="mt-6">
        <p className="font-display text-3xl font-medium leading-tight text-[#26413C] sm:text-4xl">
          Vuestro gran día fue el {formatDate(plan.weddingDate)}
        </p>
        <p className="mt-3 text-[#586C64]">Gracias por dejar que tubodadiy os acompañara.</p>
      </div>
    );
  }

  const weeks = Math.floor(days / 7);

  return (
    <div className="mt-6">
      <p className="flex items-end gap-4">
        <span className="font-display text-7xl font-medium leading-none tabular-nums text-[#26413C] sm:text-8xl">
          {days}
        </span>
        <span className="pb-1.5 text-lg leading-snug text-[#26413C] sm:pb-2.5 sm:text-xl">
          {days === 1 ? "día" : "días"} para
          <br />
          el gran día
        </span>
      </p>
      <p className="mt-4 flex items-center gap-2 text-[#26413C]">
        <CalendarHeartIcon className="size-5 shrink-0 text-[#474755]" aria-hidden="true" />
        <span className="block first-letter:uppercase">{longDate}</span>
      </p>
      {weeks >= 2 && (
        <p className="mt-1 pl-7 text-sm text-[#586C64]">
          Son unas {pluralize(weeks, "semana", "semanas")} para prepararlo todo con calma.
        </p>
      )}
    </div>
  );
}

const RING_RADIUS = 42;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function ProgressRing({ percent }: { percent: number }) {
  const done = percent >= 100;
  return (
    <div
      role="img"
      aria-label={`Progreso del checklist: ${percent} %`}
      className="relative size-24 shrink-0"
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={RING_RADIUS} fill="none" stroke="#E5DDEC" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="none"
          stroke={done ? "#3F5C4A" : "#927AAC"}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH * (1 - percent / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
        />
      </svg>
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center font-display text-2xl font-semibold text-[#26413C]"
      >
        {percent}%
      </span>
    </div>
  );
}

function ProgressCard({ plan, data }: { plan: WeddingPlan; data: FeaturedPlanData }) {
  const waiting = data.loading && data.steps.length === 0;
  const progress = computeProgress(data.steps);

  return (
    <div className={`${CARD} p-5 sm:p-6`}>
      <h2 className="font-display text-lg font-semibold text-[#102D28]">Tu progreso</h2>
      {waiting ? (
        <div className="mt-4 flex items-center gap-5" role="status" aria-label="Cargando progreso">
          <Skeleton className="size-24 shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-5">
            <ProgressRing percent={progress.percent} />
            <div>
              <p className="font-medium text-[#102D28]">
                {progress.completed} de {pluralize(progress.applicable, "sección", "secciones")}
              </p>
              {progress.tasksTotal > 0 && (
                <p className="text-sm text-[#586C64]">
                  {progress.tasksDone} de {pluralize(progress.tasksTotal, "tarea", "tareas")} hechas
                </p>
              )}
            </div>
          </div>
          <p className="mt-4 text-sm text-[#586C64]">
            {data.error
              ? "No hemos podido cargar tu avance ahora mismo. Vuelve a intentarlo en unos minutos."
              : progressMessage(progress.percent, progress.applicable)}
          </p>
        </>
      )}
      <Link href={`/plan/${plan.id}`} className={`${CTA_PRIMARY} mt-5 w-full sm:w-auto`}>
        Seguir con mi plan
        <ArrowRightIcon className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

export function PlanHero({
  plan,
  data,
  greetingName,
}: {
  plan: WeddingPlan;
  data: FeaturedPlanData;
  greetingName: string | null;
}) {
  return (
    <section
      aria-labelledby="home-greeting"
      className="relative overflow-hidden rounded-3xl bg-[#ECE6F4] px-5 py-8 sm:px-10 sm:py-10"
    >
      {/* Decoración: siempre detrás del contenido */}
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-12 size-44 sm:-right-8 sm:-top-10 sm:size-56"
      >
        <circle cx="50" cy="50" r="50" fill="#BCC7B5" />
      </svg>
      <svg
        viewBox="0 0 200 300"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="pointer-events-none absolute -left-6 bottom-0 h-1/2 w-1/4 sm:w-[16%]"
      >
        <path
          d="M0 20 C 50 -10, 130 30, 150 90 C 170 150, 210 170, 190 230 C 175 280, 90 300, 0 300 Z"
          fill="#E5DDEC"
        />
      </svg>

      <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center lg:gap-12">
        <div>
          <div>
            <h1
              id="home-greeting"
              className="font-display text-xl font-semibold text-[#26413C] sm:text-2xl"
            >
              {greetingName ? `Hola, ${greetingName}` : "Hola"}
            </h1>
          </div>
          <p
            className="text-script-accent mt-1 text-balance break-words"
            style={{ color: "#26413C" }}
          >
            {plan.title}
          </p>
          <Countdown plan={plan} />
          <p className="mt-6 hidden items-center gap-2 text-sm text-[#586C64] sm:flex">
            <HeartIcon className="size-4 shrink-0 fill-current text-[#907AB2]" aria-hidden="true" />
            Un paso cada día y llegarás con todo en su sitio.
          </p>
        </div>

        <ProgressCard plan={plan} data={data} />
      </div>
    </section>
  );
}
