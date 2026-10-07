import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-secondary/40 p-4">
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </main>
  );
}
