import type { Metadata } from "next";

import { BanquetPrintView } from "@/components/banquet/banquet-print";
import { getRequestLang } from "@/lib/i18n/request";
import { getServerT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = getServerT(await getRequestLang(), "banquet");
  return { title: t("print.meta.title") };
}

// Fuera del grupo (app): la página imprimible no lleva la cabecera ni las
// pestañas del plan, solo el plan de mesas.
export default async function BanquetPrintPage(props: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await props.params;
  return <BanquetPrintView planId={planId} />;
}
