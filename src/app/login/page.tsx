import { Suspense } from "react";
import { AuthForm, AuthShell } from "@/components/auth/auth-form";

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}
