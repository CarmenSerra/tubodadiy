import { SectionGuard } from "@/components/members/section-guard";

// Permiso de la sección «honeymoon» (ver src/lib/permissions.ts): sin acceso muestra un aviso amable.
export default function HoneymoonSectionLayout({ children }: LayoutProps<"/plan/[planId]/honeymoon">) {
  return <SectionGuard section="honeymoon">{children}</SectionGuard>;
}
