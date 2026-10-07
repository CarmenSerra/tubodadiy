import { CheckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { StepStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

// Estados en tono calmado (sin colores de alarma). Todos con texto >= 4.5:1
// sobre el fondo crema de la tarjeta (#F8F5F1) y sobre su propio fondo.
const STATUS_CONFIG: Record<StepStatus, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "border-[#D4C0EA] bg-transparent text-[#586C64]" },
  in_progress: { label: "En progreso", className: "border-transparent bg-[#DECDF1] text-[#26413C]" },
  completed: { label: "Completado", className: "border-transparent bg-[#D2D7CB] text-[#26413C]" },
  skipped: {
    label: "Omitido",
    className: "border-transparent bg-transparent text-[#586C64] line-through decoration-[#586C64]/60",
  },
};

export function StepStatusBadge({ status }: { status: StepStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", config.className)}
    >
      {status === "completed" && <CheckIcon className="size-3" aria-hidden="true" />}
      {config.label}
    </Badge>
  );
}
