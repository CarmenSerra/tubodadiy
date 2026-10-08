import type { Metadata } from "next";

import { TimelinePrintView } from "@/components/timeline/timeline-print";

export const metadata: Metadata = {
  title: "Cronograma del día — tubodadiy",
};

// Fuera del grupo (app): la página imprimible no lleva la cabecera ni las
// pestañas del plan, solo el cronograma.
export default async function TimelinePrintPage(props: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await props.params;
  return <TimelinePrintView planId={planId} />;
}
