import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm, AuthShell } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Crea tu cuenta — tubodadiy",
};

export default function SignupPage() {
  return (
    <AuthShell>
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </AuthShell>
  );
}
