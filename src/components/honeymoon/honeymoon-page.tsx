"use client";

import * as React from "react";
import { BriefcaseIcon, CompassIcon, MapIcon, WalletIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  { value: "destinations", icon: CompassIcon },
  { value: "itinerary", icon: MapIcon },
  { value: "bookings", icon: WalletIcon },
  { value: "packing", icon: BriefcaseIcon },
] as const;

type SectionValue = (typeof SECTIONS)[number]["value"];

function isSection(value: string): value is SectionValue {
  return SECTIONS.some((s) => s.value === value);
}

/** Página «Luna de miel» de un plan: banner, selector de sección y la sección activa. */
export function HoneymoonPage({ planId }: { planId: string }) {
  const { t } = useTranslation("honeymoon");
  const { user } = useAuth();
  const data = useHoneymoon(planId);
  const [section, setSection] = React.useState<SectionValue>("destinations");
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
        <h2 className="font-display text-xl font-semibold text-ink">{t("page.loadError.title")}</h2>
        <p className="mt-2 text-sm text-ink-muted">
          {t("page.loadError.text")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <HoneymoonHero data={data} />

      <Tabs value={section} onValueChange={(v) => isSection(v) && setSection(v)} className="gap-5">
        <TabsList
          aria-label={t("page.tabsLabel")}
          className="grid h-auto w-full grid-cols-4 gap-1 rounded-2xl bg-surface p-1.5 shadow-pop ring-1 ring-line"
        >
          {SECTIONS.map(({ value, icon: Icon }) => (
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
              {t(`page.tabs.${value}`)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="destinations">
          <Destinations
            planId={planId}
            uid={user?.uid ?? ""}
            destinations={data.destinations}
            announce={announce}
          />
        </TabsContent>
        <TabsContent value="itinerary">
          <Itinerary planId={planId} days={data.days} announce={announce} />
        </TabsContent>
        <TabsContent value="bookings">
          <Bookings
            planId={planId}
            bookings={data.bookings}
            budget={data.settings.budgetTotal}
            announce={announce}
          />
        </TabsContent>
        <TabsContent value="packing">
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
