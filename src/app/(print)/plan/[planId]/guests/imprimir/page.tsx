import type { Metadata } from "next";

import { GuestsPrintView } from "@/components/export/guests-print";
import { getRequestLang } from "@/lib/i18n/request";
import { getServerT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = getServerT(await getRequestLang(), "export");
  return { title: t("print.guests.meta.title") };
}

// Fuera del grupo (app): la página imprimible no lleva la cabecera ni las
// pestañas del plan, solo el documento.
export default async function GuestsPrintPage(props: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await props.params;
  return <GuestsPrintView planId={planId} />;
}
