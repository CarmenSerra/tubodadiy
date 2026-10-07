"use client";

import { CalendarHeartIcon, ListChecksIcon, WalletIcon } from "lucide-react";

import { Accordion } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { CARD, IconCircle } from "@/components/dashboard/ui";
import { StepCard } from "@/components/plan/step-card";
import { StepCardSkeleton } from "@/components/plan/plan-shell";
import { EditPlanDialog } from "@/components/plan/edit-plan-dialog";
import { usePlanContext } from "@/lib/context/plan-context";
import { useCollection } from "@/lib/hooks/use-collection";
import { stepsQuery, mapStep } from "@/lib/firebase/plans";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";

function Stat({
  icon,
  tone,
  label,
  children,
}: {
  icon: React.ReactNode;
  tone: "lilac" | "sage";
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3.5">
      <IconCircle tone={tone}>{icon}</IconCircle>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[#586C64]">{label}</p>
        {children}
      </div>
    </div>
  );
}

const VALUE = "font-display text-xl font-semibold leading-tight text-[#26413C]";

export default function PlanOverviewPage() {
  const { planId, plan } = usePlanContext();
  const { data: steps, loading } = useCollection(stepsQuery(planId), mapStep);

  const completed = steps.filter((s) => s.status === "completed").length;
  const skipped = steps.filter((s) => s.status === "skipped").length;
  const applicable = steps.length - skipped;
  const progress = applicable > 0 ? Math.round((completed / applicable) * 100) : 0;
  const days = plan ? daysUntil(plan.weddingDate) : null;

  return (
    <div className="flex flex-col gap-6">
      {plan && (
        <section aria-label="Resumen del plan" className={`${CARD} p-5 sm:p-6`}>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)_auto] lg:items-center lg:gap-8">
            <Stat icon={<CalendarHeartIcon />} tone="lilac" label="Fecha">
              <p className={VALUE}>{formatDate(plan.weddingDate)}</p>
              {days !== null && days >= 0 && (
                <p className="mt-1.5 inline-flex rounded-full bg-[#ECE6F4] px-2.5 py-0.5 text-xs font-medium text-[#26413C]">
                  Quedan {days} días
                </p>
              )}
            </Stat>
            <Stat icon={<WalletIcon />} tone="sage" label="Presupuesto">
              <p className={VALUE}>{formatCurrency(plan.budgetTotal)}</p>
            </Stat>
            <Stat
              icon={<ListChecksIcon />}
              tone="lilac"
              label={`Progreso · ${completed}/${applicable} secciones`}
            >
              <p className={VALUE}>{progress}%</p>
              <Progress
                value={progress}
                aria-label="Progreso de las secciones"
                className="mt-2 h-2 bg-[#ECE6F4] [&_[data-slot=progress-indicator]]:bg-[#927AAC]"
              />
            </Stat>
            <div className="sm:col-span-2 lg:col-span-1 lg:justify-self-end">
              <EditPlanDialog plan={plan} />
            </div>
          </div>
        </section>
      )}

      {loading ? (
        <div className="flex flex-col gap-3" role="status" aria-label="Cargando secciones">
          {[0, 1, 2, 3].map((i) => (
            <StepCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <Accordion type="multiple" className="flex flex-col gap-3">
          {steps.map((step) => (
            <StepCard key={step.id} planId={planId} step={step} />
          ))}
        </Accordion>
      )}
    </div>
  );
}
