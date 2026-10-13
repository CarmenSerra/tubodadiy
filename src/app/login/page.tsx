import type { Metadata } from "next";
import { Suspense } from "react";
import { getRequestLang } from "@/lib/i18n/request";
import { getServerT } from "@/lib/i18n/server";
import { AuthForm, AuthShell } from "@/components/auth/auth-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = getServerT(await getRequestLang(), "auth");
  return { title: t("login.meta.title") };
}

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}
