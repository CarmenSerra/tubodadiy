import { SectionGuard } from "@/components/members/section-guard";

// Permiso de la sección «banquet» (ver src/lib/permissions.ts): sin acceso muestra un aviso amable.
export default function BanquetSectionLayout({ children }: LayoutProps<"/plan/[planId]/banquete">) {
  return <SectionGuard section="banquet">{children}</SectionGuard>;
}
