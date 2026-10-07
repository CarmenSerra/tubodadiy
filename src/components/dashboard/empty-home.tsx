import { CalendarHeartIcon, ListChecksIcon, WalletIcon } from "lucide-react";

import { Branch, Sparkles } from "@/components/brand/hero-decorations";
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
    title: "Sigue tu checklist",
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
        <svg
          viewBox="0 0 200 300"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-[45%] w-[18%] sm:h-[85%] sm:w-[22%]"
        >
          <path
            d="M0 20 C 50 -10, 130 30, 150 90 C 170 150, 210 170, 190 230 C 175 280, 90 300, 0 300 Z"
            fill="#E5DDEC"
          />
        </svg>
        <svg
          viewBox="0 0 100 200"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-[45%] h-[35%] w-[5%] sm:top-[25%] sm:h-[50%] sm:w-[9%]"
        >
          <path d="M100 0 C 70 10, 30 50, 25 100 C 20 150, 60 185, 100 200 Z" fill="#BCC7B5" />
        </svg>
        <Branch className="bottom-0 left-[2%] hidden h-[60%] w-auto sm:block" />
        <Branch className="bottom-0 right-[2%] hidden h-[56%] w-auto -scale-x-100 sm:block" />

        <div className="relative z-10 mx-auto flex max-w-xl flex-col items-center gap-3 text-center">
          <div className="relative inline-block px-10 sm:px-14">
            <Sparkles className="left-0 top-0" />
            <Sparkles className="right-0 top-0 -scale-x-100" />
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
