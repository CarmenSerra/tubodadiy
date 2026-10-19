import { SectionGuard } from "@/components/members/section-guard";

// Permiso de la sección «dayof» (ver src/lib/permissions.ts): sin acceso muestra un aviso amable.
export default function DayofSectionLayout({ children }: LayoutProps<"/plan/[planId]/dia-b">) {
  return <SectionGuard section="dayof">{children}</SectionGuard>;
}
