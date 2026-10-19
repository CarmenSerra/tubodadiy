import { SectionGuard } from "@/components/members/section-guard";

// Permiso de la sección «ceremony» (ver src/lib/permissions.ts): sin acceso muestra un aviso amable.
export default function CeremonySectionLayout({ children }: LayoutProps<"/plan/[planId]/ceremonia">) {
  return <SectionGuard section="ceremony">{children}</SectionGuard>;
}
