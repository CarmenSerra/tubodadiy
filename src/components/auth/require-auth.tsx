"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Trans } from "react-i18next";

import { useAuth } from "@/lib/hooks/use-auth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, firebaseReady } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, router, pathname]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!firebaseReady) {
    return (
      <div className="mx-auto max-w-md p-8 text-center text-sm text-muted-foreground">
        <Trans i18nKey="firebaseNotConfigured.guard" ns="auth" components={{ code: <code /> }} />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
