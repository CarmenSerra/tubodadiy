"use client";

import { Loader2 } from "lucide-react";

import { Accordion } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StepCard } from "@/components/plan/step-card";
import { EditPlanDialog } from "@/components/plan/edit-plan-dialog";
import { usePlanContext } from "@/lib/context/plan-context";
import { useCollection } from "@/lib/hooks/use-collection";
import { stepsQuery, mapStep } from "@/lib/firebase/plans";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";

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
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-8">
              <div>
                <p className="text-xs text-muted-foreground">Fecha</p>
                <p className="font-medium">{formatDate(plan.weddingDate)}</p>
                {days !== null && days >= 0 && (
                  <p className="text-xs text-primary">Quedan {days} días</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Presupuesto</p>
                <p className="font-medium">{formatCurrency(plan.budgetTotal)}</p>
              </div>
              <div className="min-w-40">
                <p className="text-xs text-muted-foreground">
                  Progreso · {completed}/{applicable} secciones
                </p>
                <Progress value={progress} className="mt-1.5" />
              </div>
            </div>
            <EditPlanDialog plan={plan} />
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
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
