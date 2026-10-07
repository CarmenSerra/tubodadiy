import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export default function SignupPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-secondary/40 p-4">
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </main>
  );
}
