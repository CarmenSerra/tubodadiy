import type { ReactNode } from "react";

import { RequireAuth } from "@/components/auth/require-auth";
import { AppHeader } from "@/components/app-header";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex min-h-screen flex-col bg-[#F4F1EB]">
        <AppHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">{children}</main>
      </div>
    </RequireAuth>
  );
}
