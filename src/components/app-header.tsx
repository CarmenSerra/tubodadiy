"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { HeartIcon, LogOutIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/hooks/use-auth";
import { initials } from "@/lib/utils";

/** Menú de usuario de la cabecera (presentacional: no depende de Firebase). */
export function UserMenu({
  label,
  onSignOut,
}: {
  /** Nombre o email del usuario. */
  label: string;
  onSignOut: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Menú de ${label}`}
        className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface-alt"
      >
        <span className="hidden max-w-[12rem] truncate text-sm text-ink sm:block">{label}</span>
        <Avatar>
          <AvatarFallback className="bg-lilac-mid text-ink-on-tint">{initials(label)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="rounded-xl border-line bg-surface p-1.5 text-ink shadow-none"
      >
        <DropdownMenuLabel className="truncate text-sm font-medium">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-track" />
        <DropdownMenuItem
          onClick={onSignOut}
          className="rounded-lg focus:bg-lilac-soft focus:text-ink"
        >
          <LogOutIcon className="size-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Cabecera de la zona privada: misma marca que la landing (crema + lila). */
export function AppHeaderView({ children }: { children?: React.ReactNode }) {
  return (
    <header className="border-b border-line bg-surface-alt">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-md text-brand outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface-alt"
        >
          <HeartIcon className="size-5 fill-current" aria-hidden="true" />
          <span className="font-display text-lg font-semibold">tubodadiy</span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          {children}
        </div>
      </div>
    </header>
  );
}

export function AppHeader() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <AppHeaderView>
      {user && <UserMenu label={user.displayName || user.email || "Mi cuenta"} onSignOut={handleSignOut} />}
    </AppHeaderView>
  );
}
