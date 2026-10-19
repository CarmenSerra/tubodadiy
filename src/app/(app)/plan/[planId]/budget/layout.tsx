import { SectionGuard } from "@/components/members/section-guard";

// Permiso de la sección «budget» (ver src/lib/permissions.ts): sin acceso muestra un aviso amable.
export default function BudgetSectionLayout({ children }: LayoutProps<"/plan/[planId]/budget">) {
  return <SectionGuard section="budget">{children}</SectionGuard>;
}
