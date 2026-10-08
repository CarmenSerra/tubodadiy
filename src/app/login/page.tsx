import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm, AuthShell } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Inicia sesión — tubodadiy",
};

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}
