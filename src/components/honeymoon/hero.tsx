import type { CSSProperties } from "react";
import { BriefcaseIcon, CompassIcon, MapIcon, WalletIcon } from "lucide-react";

import { TravelWatercolor } from "@/components/honeymoon/travel-watercolor";
import { HeroStat } from "@/components/honeymoon/ui";
import { computeBookingTotals, packingProgress } from "@/lib/honeymoon-model";
import type { HoneymoonData } from "@/components/honeymoon/use-honeymoon";
import { formatCurrency } from "@/lib/utils";

/** Opacidad de una acuarela (`.decor-img` la combina con la del tema). */
const o = (v: number) => ({ "--o": v }) as CSSProperties;

/** Banner de la página: paisaje ilustrado, título y cuatro cifras de un vistazo. */
export function HoneymoonHero({ data }: { data: HoneymoonData }) {
  const { destinations, days, bookings, packing, settings } = data;
  const chosen = destinations.find((d) => d.chosen);
  const totals = computeBookingTotals(settings.budgetTotal, bookings);
  const progress = packingProgress(packing);

  return (
    <section
      aria-labelledby="hm-hero-title"
      className="relative isolate overflow-hidden rounded-3xl border border-line shadow-lift"
      style={{ background: "linear-gradient(135deg, var(--hm-hero-from), var(--hm-hero-to))" }}
    >
      {/* Acuarelas del banner (las mismas del fondo, sin movimiento), a la derecha: el texto va a la izquierda. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <TravelWatercolor name="wash-aqua" className="absolute -right-16 -top-16 hidden w-72 sm:block" style={o(0.6)} />
        <TravelWatercolor name="airplane" className="absolute right-1 top-1 w-28 sm:right-[24%] sm:top-3 sm:w-52" style={o(0.8)} />
        <TravelWatercolor name="palm" className="absolute -right-2 bottom-28 hidden h-44 w-auto sm:block lg:right-8 lg:h-48" style={o(0.85)} />
      </div>

      <div className="px-5 pb-5 pt-7 sm:px-8 sm:pt-9">
        <p className="text-sm font-medium text-ink-muted">Después del gran día</p>
        <h2 id="hm-hero-title" className="mt-1 font-display text-4xl font-medium leading-tight text-ink sm:text-5xl">
          Luna de miel
        </h2>
        <p className="mt-2 max-w-md text-base text-ink">
          Destinos, itinerario, reservas y maleta: todo el viaje en un solo sitio, sin prisas.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-2.5 sm:gap-3 px-5 pb-6 pt-8 sm:px-8 lg:grid-cols-4">
        <HeroStat
          icon={<CompassIcon />}
          label="Destino"
          value={chosen ? chosen.name : destinations.length > 0 ? "Por elegir" : "Sin ideas aún"}
          detail={
            chosen
              ? chosen.country || "Destino elegido"
              : `${destinations.length} ${destinations.length === 1 ? "idea" : "ideas"} en la lista`
          }
        />
        <HeroStat
          icon={<MapIcon />}
          label="Itinerario"
          value={`${days.length} ${days.length === 1 ? "día" : "días"}`}
          detail={days.length === 0 ? "Aún sin planificar" : "planificados"}
        />
        <HeroStat
          icon={<WalletIcon />}
          label="Presupuesto"
          value={settings.budgetTotal > 0 ? formatCurrency(totals.over > 0 ? totals.over : totals.remaining) : formatCurrency(totals.booked)}
          detail={
            settings.budgetTotal > 0
              ? totals.over > 0
                ? "por encima del total"
                : "te quedan por reservar"
              : "reservado, sin presupuesto fijado"
          }
        />
        <HeroStat
          icon={<BriefcaseIcon />}
          label="Maleta"
          value={progress.total > 0 ? `${progress.done} de ${progress.total}` : "Sin lista"}
          detail={progress.total > 0 ? `${progress.percent}% preparada` : "se prepara al entrar"}
        />
      </dl>
    </section>
  );
}

