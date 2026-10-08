"use client";

import * as React from "react";
import { BriefcaseIcon, CompassIcon, MapIcon, WalletIcon } from "lucide-react";

import { Bookings } from "@/components/honeymoon/bookings";
import { Destinations } from "@/components/honeymoon/destinations";
import { HoneymoonHero } from "@/components/honeymoon/hero";
import { Itinerary } from "@/components/honeymoon/itinerary";
import { Packing } from "@/components/honeymoon/packing";
import { HM_CARD, HoneymoonSkeleton } from "@/components/honeymoon/ui";
import { useHoneymoon } from "@/components/honeymoon/use-honeymoon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/hooks/use-auth";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { value: "destinos", label: "Destinos", icon: CompassIcon },
  { value: "itinerario", label: "Itinerario", icon: MapIcon },
  { value: "reservas", label: "Reservas", icon: WalletIcon },
  { value: "maleta", label: "Maleta", icon: BriefcaseIcon },
] as const;

type SectionValue = (typeof SECTIONS)[number]["value"];

function isSection(value: string): value is SectionValue {
  return SECTIONS.some((s) => s.value === value);
}

/** Página «Luna de miel» de un plan: banner, selector de sección y la sección activa. */
export function HoneymoonPage({ planId }: { planId: string }) {
  const { user } = useAuth();
  const data = useHoneymoon(planId);
  const [section, setSection] = React.useState<SectionValue>("destinos");
  const [announcement, setAnnouncement] = React.useState("");

  // Mensajes para lectores de pantalla (votos, borrados, reorden…). El espacio final
  // alterno hace que repetir el mismo mensaje vuelva a anunciarse.
  const flip = React.useRef(false);
  const announce = React.useCallback((message: string) => {
    flip.current = !flip.current;
    setAnnouncement(message + (flip.current ? " " : ""));
  }, []);

  if (data.loading) return <HoneymoonSkeleton />;

  if (data.failed) {
    return (
      <div className={cn(HM_CARD, "mx-auto flex max-w-md flex-col items-center p-8 text-center")} role="alert">
        <h2 className="font-display text-xl font-semibold text-ink">No hemos podido cargar la luna de miel</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Comprueba tu conexión y vuelve a intentarlo en unos segundos. Tus datos siguen guardados.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <HoneymoonHero data={data} />

      <Tabs value={section} onValueChange={(v) => isSection(v) && setSection(v)} className="gap-5">
        <TabsList
          aria-label="Secciones de la luna de miel"
          className="grid h-auto w-full grid-cols-4 gap-1 rounded-2xl bg-surface p-1.5 shadow-pop ring-1 ring-line"
        >
          {SECTIONS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className={cn(
                "min-h-14 flex-col gap-1 rounded-xl px-1 py-2 text-xs font-medium text-ink-muted sm:min-h-12 sm:flex-row sm:gap-2 sm:text-sm",
                "hover:text-ink data-[state=active]:bg-cta data-[state=active]:text-on-cta data-[state=active]:shadow-pop",
                "outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              )}
            >
              <Icon aria-hidden="true" className="size-5 sm:size-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="destinos">
          <Destinations
            planId={planId}
            uid={user?.uid ?? ""}
            destinations={data.destinations}
            announce={announce}
          />
        </TabsContent>
        <TabsContent value="itinerario">
          <Itinerary planId={planId} days={data.days} announce={announce} />
        </TabsContent>
        <TabsContent value="reservas">
          <Bookings
            planId={planId}
            bookings={data.bookings}
            budget={data.settings.budgetTotal}
            announce={announce}
          />
        </TabsContent>
        <TabsContent value="maleta">
          <Packing
            planId={planId}
            items={data.packing}
            seeded={data.settings.packingSeeded}
            announce={announce}
          />
        </TabsContent>
      </Tabs>

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
