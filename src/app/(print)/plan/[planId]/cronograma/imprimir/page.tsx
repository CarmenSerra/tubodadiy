import type { Metadata } from "next";

import { TimelinePrintView } from "@/components/timeline/timeline-print";
import { getRequestLang } from "@/lib/i18n/request";
import { getServerT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = getServerT(await getRequestLang(), "timeline");
  return { title: t("print.meta.title") };
}

// Fuera del grupo (app): la página imprimible no lleva la cabecera ni las
// pestañas del plan, solo el cronograma.
export default async function TimelinePrintPage(props: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await props.params;
  return <TimelinePrintView planId={planId} />;
}
