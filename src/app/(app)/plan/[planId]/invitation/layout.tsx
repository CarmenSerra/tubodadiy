import { SectionGuard } from "@/components/members/section-guard";

// Permiso de la sección «invitation» (ver src/lib/permissions.ts): sin acceso muestra un aviso amable.
export default function InvitationSectionLayout({ children }: LayoutProps<"/plan/[planId]/invitation">) {
  return <SectionGuard section="invitation">{children}</SectionGuard>;
}
