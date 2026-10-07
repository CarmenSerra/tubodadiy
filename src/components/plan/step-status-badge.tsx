import { Badge } from "@/components/ui/badge";
import type { StepStatus } from "@/lib/types";

const STATUS_CONFIG: Record<StepStatus, { label: string; variant: "secondary" | "warning" | "success" | "outline" }> = {
  pending: { label: "Pendiente", variant: "secondary" },
  in_progress: { label: "En progreso", variant: "warning" },
  completed: { label: "Completado", variant: "success" },
  skipped: { label: "Omitido", variant: "outline" },
};

export function StepStatusBadge({ status }: { status: StepStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
