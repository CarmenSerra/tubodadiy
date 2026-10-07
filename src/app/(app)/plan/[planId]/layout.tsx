import { PlanShell } from "@/components/plan/plan-shell";

export default async function PlanLayout(props: LayoutProps<"/plan/[planId]">) {
  const { planId } = await props.params;
  return <PlanShell planId={planId}>{props.children}</PlanShell>;
}
