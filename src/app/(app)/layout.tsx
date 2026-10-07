import type { ReactNode } from "react";

import { RequireAuth } from "@/components/auth/require-auth";
import { AppHeader } from "@/components/app-header";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex min-h-screen flex-col bg-secondary/30">
        <AppHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      </div>
    </RequireAuth>
  );
}
