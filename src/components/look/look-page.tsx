"use client";

import * as React from "react";
import { FlowerIcon, GemIcon, ShirtIcon, SparklesIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AppointmentsLauncherProvider } from "@/components/appointments/appointments-launcher";
import { BeautySection } from "@/components/look/beauty-section";
import { DecorSection } from "@/components/look/decor-section";
import { isSectionId, type SectionId } from "@/components/look/look-model";
import { Moodboard } from "@/components/look/moodboard";
import { OutfitSection } from "@/components/look/outfit-section";
import { RingsSection } from "@/components/look/rings-section";
import { LK_CARD, LookSkeleton } from "@/components/look/ui";
import { useLook, type LookData } from "@/components/look/use-look";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { value: "vestuario", icon: ShirtIcon },
  { value: "belleza", icon: SparklesIcon },
  { value: "anillos", icon: GemIcon },
  { value: "decoracion", icon: FlowerIcon },
] as const satisfies readonly { value: SectionId; icon: unknown }[];

/** Sección pedida por el ancla de la URL (`#vestuario`…), o la primera. */
function sectionFromHash(): SectionId {
  if (typeof window === "undefined") return "vestuario";
  const hash = window.location.hash.slice(1);
  return isSectionId(hash) ? hash : "vestuario";
}

/** Página «Estilo»: lee los datos del plan y los muestra. */
export function LookPage({ planId }: { planId: string }) {
  const data = useLook(planId);
  return <LookView planId={planId} data={data} />;
}

/** Vestuario, belleza, anillos y decoración (con moodboard y paleta), a partir de datos ya leídos. */
export function LookView({ planId, data }: { planId: string; data: LookData }) {
  const { t } = useTranslation("look");
  const [section, setSection] = React.useState<SectionId>("vestuario");

  // El ancla de la URL (`#belleza`) elige la sección. Se lee al montar, no al crear el estado: en una
  // navegación desde otra pestaña, la URL se actualiza justo después de renderizar.
  React.useEffect(() => {
    const onHash = () => setSection(sectionFromHash());
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function handleSection(value: string) {
    if (!isSectionId(value)) return;
    setSection(value);
    // Mantiene el ancla en la URL sin saltar de sitio ni apilar historial.
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}#${value}`);
  }

  if (data.loading) return <LookSkeleton />;

  if (data.failed) {
    return (
      <div className={cn(LK_CARD, "mx-auto flex max-w-md flex-col items-center p-8 text-center")} role="alert">
        <h2 className="font-display text-xl font-semibold text-ink">{t("page.loadError.title")}</h2>
        <p className="mt-2 text-sm text-ink-muted">{t("page.loadError.text")}</p>
      </div>
    );
  }

  return (
    // La agenda (pruebas de vestuario) es la del Resumen: aquí se abre desde «Añadir prueba».
    <AppointmentsLauncherProvider>
      <div className="flex flex-col gap-5">
        <header>
          <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{t("page.title")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">{t("page.description")}</p>
        </header>

        <Tabs value={section} onValueChange={handleSection} className="gap-5">
          <TabsList
            aria-label={t("page.tabsLabel")}
            className="grid h-auto w-full grid-cols-4 gap-1 rounded-2xl bg-surface p-1.5 ring-1 ring-line"
          >
            {SECTIONS.map(({ value, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className={cn(
                  "min-h-14 flex-col gap-1 rounded-xl px-1 py-2 text-xs font-medium text-ink-muted sm:min-h-12 sm:flex-row sm:gap-2 sm:px-3 sm:text-sm",
                  "hover:text-ink data-[state=active]:bg-cta data-[state=active]:text-on-cta",
                  "outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                )}
              >
                <Icon aria-hidden="true" className="size-5 sm:size-4" />
                {t(`page.tabs.${value}`)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="vestuario">
            <OutfitSection planId={planId} outfits={data.outfits} fittings={data.fittings} vendors={data.vendors} />
          </TabsContent>
          <TabsContent value="belleza">
            <BeautySection planId={planId} items={data.beauty} routine={data.settings.routine} vendors={data.vendors} />
          </TabsContent>
          <TabsContent value="anillos">
            <RingsSection planId={planId} rings={data.rings} vendors={data.vendors} />
          </TabsContent>
          <TabsContent value="decoracion" className="flex flex-col gap-8">
            <DecorSection planId={planId} items={data.decor} vendors={data.vendors} />
            <Moodboard planId={planId} images={data.moodboard} palette={data.settings.palette} />
          </TabsContent>
        </Tabs>
      </div>
    </AppointmentsLauncherProvider>
  );
}
