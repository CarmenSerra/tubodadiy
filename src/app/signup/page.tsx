import { Suspense } from "react";
import { AuthForm, AuthShell } from "@/components/auth/auth-form";

export default function SignupPage() {
  return (
    <AuthShell>
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </AuthShell>
  );
}
