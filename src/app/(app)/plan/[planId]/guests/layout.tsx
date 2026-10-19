import { SectionGuard } from "@/components/members/section-guard";

// Permiso de la sección «guests» (ver src/lib/permissions.ts): sin acceso muestra un aviso amable.
export default function GuestsSectionLayout({ children }: LayoutProps<"/plan/[planId]/guests">) {
  return <SectionGuard section="guests">{children}</SectionGuard>;
}
