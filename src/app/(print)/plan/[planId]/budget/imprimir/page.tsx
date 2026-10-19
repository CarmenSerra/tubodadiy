import type { Metadata } from "next";

import { BudgetPrintView } from "@/components/export/budget-print";
import { getRequestLang } from "@/lib/i18n/request";
import { getServerT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = getServerT(await getRequestLang(), "export");
  return { title: t("print.budget.meta.title") };
}

// Fuera del grupo (app): la página imprimible no lleva la cabecera ni las
// pestañas del plan, solo el documento.
export default async function BudgetPrintPage(props: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await props.params;
  return <BudgetPrintView planId={planId} />;
}
