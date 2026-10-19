import { SectionGuard } from "@/components/members/section-guard";

// Permiso de la sección «style» (ver src/lib/permissions.ts): sin acceso muestra un aviso amable.
export default function StyleSectionLayout({ children }: LayoutProps<"/plan/[planId]/estilo">) {
  return <SectionGuard section="style">{children}</SectionGuard>;
}
