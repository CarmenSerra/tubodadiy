import { CalendarHeartIcon, ListChecksIcon, WalletIcon } from "lucide-react";

import {
  Dot,
  Envelope,
  Eucalyptus,
  Floret,
  Flourish,
  Heart,
  JourneyPath,
  Rings,
  WelcomeDisc,
  WelcomePebble,
  WelcomeWave,
} from "@/components/brand/welcome-decorations";
import { CARD, IconCircle, NewPlanButton } from "./ui";

const FIRST_STEPS = [
  {
    icon: CalendarHeartIcon,
    title: "Ponle nombre y fecha",
    text: "Con la fecha, tubodadiy empieza la cuenta atrás por ti.",
  },
  {
    icon: WalletIcon,
    title: "Fija tu presupuesto",
    text: "Una cifra de partida y, poco a poco, el desglose por categorías.",
  },
  {
    icon: ListChecksIcon,
    title: "Sigue tu lista de tareas",
    text: "13 secciones listas para que avances a tu ritmo, sin agobios.",
  },
];

/** Estado vacío: bienvenida cálida y una única acción clara, crear el primer plan. */
export function EmptyHome({ greetingName }: { greetingName: string | null }) {
  return (
    <div className="flex flex-col gap-10">
      <section
        aria-labelledby="home-greeting"
        className="relative overflow-hidden rounded-3xl bg-[#ECE6F4] px-5 py-14 sm:px-10 sm:py-20"
      >
        {/* Blobs: guijarro arriba-izquierda, disco arriba-derecha y ola inferior */}
        <WelcomePebble className="-left-10 -top-9 h-24 w-28 sm:-left-14 sm:-top-12 sm:h-36 sm:w-44 lg:h-44 lg:w-52" />
        <WelcomeDisc className="-right-9 -top-9 size-24 sm:-right-12 sm:-top-12 sm:size-32 lg:size-40" />
        <WelcomeWave className="inset-x-0 bottom-0 h-12 w-full sm:h-16" />

        {/* Confeti, siempre en las esquinas libres de texto */}
        <Floret className="right-4 top-14 size-7 sm:hidden" />
        <Heart className="left-6 top-14 size-3.5 sm:hidden" />
        <Dot className="left-[34%] top-4 size-2 sm:hidden" />

        {/* Lado izquierdo: alianzas, camino punteado y florecillas */}
        <Rings className="left-[3%] top-[34%] hidden w-[13%] min-w-20 -rotate-6 sm:block lg:left-[6%] lg:top-[28%] lg:w-48" />
        <JourneyPath className="bottom-[13%] left-[2%] hidden w-32 lg:block" />
        <Floret className="left-[15%] top-[10%] hidden size-14 rotate-12 lg:block" />
        <Floret className="left-[16%] bottom-[20%] hidden size-10 -rotate-12 lg:block" />
        <Heart className="left-[3%] top-[26%] hidden size-3.5 sm:block" />
        <Heart className="left-[21%] top-[56%] hidden size-3 lg:block" />
        <Dot className="left-[4%] bottom-[24%] hidden size-2 sm:block" />
        <Dot className="left-[14%] top-[62%] hidden size-1.5 lg:block" />

        {/* Lado derecho: invitación, eucalipto y florecillas */}
        <Envelope className="right-[3%] top-[34%] hidden w-[13%] min-w-20 rotate-6 sm:block lg:right-[7%] lg:top-[20%] lg:w-44" />
        <Eucalyptus className="bottom-[7%] right-[3%] hidden h-52 w-auto lg:block" />
        <Floret className="right-[20%] top-[9%] hidden size-12 -rotate-6 lg:block" />
        <Floret className="right-[3%] bottom-[24%] hidden size-7 rotate-12 sm:block lg:hidden" />
        <Heart className="right-[4%] top-[24%] hidden size-3.5 sm:block" />
        <Heart className="right-[20%] top-[58%] hidden size-3.5 lg:block" />
        <Dot className="right-[16%] top-[44%] hidden size-2 lg:block" />
        <Dot className="right-[5%] bottom-[18%] hidden size-1.5 sm:block lg:hidden" />

        <div className="relative z-10 mx-auto flex max-w-xl flex-col items-center gap-3 text-center">
          <div className="relative inline-block px-12 sm:px-16">
            <Flourish className="left-0 top-1/2 -translate-y-1/2" />
            <Flourish className="right-0 top-1/2 -translate-y-1/2 -scale-x-100" />
            <span className="text-script-accent" aria-hidden="true" style={{ color: "#A38ED2" }}>
              tubodadiy
            </span>
          </div>
          <h1
            id="home-greeting"
            className="mt-1 text-balance text-3xl text-[#26413C] sm:text-4xl"
          >
            {greetingName ? `Hola, ${greetingName}` : "Te damos la bienvenida"}
          </h1>
          <p className="max-w-md text-balance text-base text-[#586C64] sm:text-lg">
            Aún no tienes ningún plan de boda. Crea el primero y empieza por lo bonito: tu fecha, tu
            presupuesto y todo lo que quieres vivir ese día.
          </p>
          <div className="mt-4">
            <NewPlanButton />
          </div>
          <p className="mt-2 text-balance text-sm text-[#586C64]">
            ¿Te han invitado a un plan? Abre el enlace de invitación que te enviaron.
          </p>
        </div>
      </section>

      <section aria-labelledby="first-steps-title">
        <h2
          id="first-steps-title"
          className="mb-4 text-center font-display text-xl font-semibold text-[#26413C] sm:text-2xl"
        >
          Así empieza todo
        </h2>
        <ol className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {FIRST_STEPS.map((step, i) => (
            <li key={step.title} className={`${CARD} flex flex-col gap-2 p-5`}>
              <IconCircle tone={i % 2 === 0 ? "lilac" : "sage"}>
                <step.icon />
              </IconCircle>
              <h3 className="mt-1 font-display text-base font-semibold text-[#102D28]">
                <span className="sr-only">Paso {i + 1}: </span>
                {step.title}
              </h3>
              <p className="text-sm text-[#586C64]">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
