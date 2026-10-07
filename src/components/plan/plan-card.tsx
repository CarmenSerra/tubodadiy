import Link from "next/link";
import { CalendarIcon, WalletIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";
import type { WeddingPlan } from "@/lib/types";

export function PlanCard({ plan }: { plan: WeddingPlan }) {
  const days = daysUntil(plan.weddingDate);

  return (
    <Link href={`/plan/${plan.id}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="font-display text-xl">{plan.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarIcon className="size-4 shrink-0" />
            <span>{formatDate(plan.weddingDate)}</span>
            {days !== null && days >= 0 && (
              <span className="text-primary font-medium">· quedan {days} días</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <WalletIcon className="size-4 shrink-0" />
            <span>Presupuesto: {formatCurrency(plan.budgetTotal)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
