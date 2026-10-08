import type { ReactNode } from "react";

import { RequireAuth } from "@/components/auth/require-auth";
import { AppHeader } from "@/components/app-header";
import { AppBackdrop } from "@/components/brand/app-backdrop";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <div className="relative isolate flex min-h-screen flex-col bg-page">
        <AppBackdrop />
        <AppHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">{children}</main>
      </div>
    </RequireAuth>
  );
}
