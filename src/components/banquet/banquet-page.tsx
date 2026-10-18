"use client";

import * as React from "react";
import { ArmchairIcon, UtensilsIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { MenuSection } from "@/components/banquet/menu-section";
import { SeatingSection } from "@/components/banquet/seating-section";
import { BQ_CARD, BanquetSkeleton } from "@/components/banquet/ui";
import { useBanquet } from "@/components/banquet/use-banquet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { value: "seating", icon: ArmchairIcon },
  { value: "menu", icon: UtensilsIcon },
] as const;

type SectionValue = (typeof SECTIONS)[number]["value"];

function isSection(value: string): value is SectionValue {
  return SECTIONS.some((s) => s.value === value);
}

/** Página «Banquete»: plan de mesas y menú de la comida. */
export function BanquetPage({ planId }: { planId: string }) {
  const { t } = useTranslation("banquet");
  const data = useBanquet(planId);
  const [section, setSection] = React.useState<SectionValue>("seating");

  if (data.loading) return <BanquetSkeleton />;

  if (data.failed) {
    return (
      <div className={cn(BQ_CARD, "mx-auto flex max-w-md flex-col items-center p-8 text-center")} role="alert">
        <h2 className="font-display text-xl font-semibold text-ink">{t("page.loadError.title")}</h2>
        <p className="mt-2 text-sm text-ink-muted">{t("page.loadError.text")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{t("page.title")}</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">{t("page.description")}</p>
      </header>

      <Tabs value={section} onValueChange={(v) => isSection(v) && setSection(v)} className="gap-5">
        <TabsList
          aria-label={t("page.tabsLabel")}
          className="grid h-auto w-full max-w-md grid-cols-2 gap-1 rounded-2xl bg-surface p-1.5 ring-1 ring-line"
        >
          {SECTIONS.map(({ value, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className={cn(
                "min-h-12 gap-2 rounded-xl px-3 text-sm font-medium text-ink-muted",
                "hover:text-ink data-[state=active]:bg-cta data-[state=active]:text-on-cta",
                "outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              )}
            >
              <Icon aria-hidden="true" className="size-4" />
              {t(`page.tabs.${value}`)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="seating">
          <SeatingSection
            planId={planId}
            guests={data.guests}
            tables={data.tables}
            printHref={`/plan/${planId}/banquete/imprimir`}
          />
        </TabsContent>
        <TabsContent value="menu">
          <MenuSection planId={planId} dishes={data.dishes} guests={data.guests} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
