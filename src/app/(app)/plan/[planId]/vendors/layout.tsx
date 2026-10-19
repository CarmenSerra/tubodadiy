import { SectionGuard } from "@/components/members/section-guard";

// Permiso de la sección «vendors» (ver src/lib/permissions.ts): sin acceso muestra un aviso amable.
export default function VendorsSectionLayout({ children }: LayoutProps<"/plan/[planId]/vendors">) {
  return <SectionGuard section="vendors">{children}</SectionGuard>;
}
