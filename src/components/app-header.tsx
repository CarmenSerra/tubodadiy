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
        className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#927AAC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F8F5F0]"
      >
        <span className="hidden max-w-[12rem] truncate text-sm text-[#26413C] sm:block">{label}</span>
        <Avatar>
          <AvatarFallback className="bg-[#DECDF1] text-[#474755]">{initials(label)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="rounded-xl border-[#E5DDEC] bg-[#F8F5F1] p-1.5 text-[#26413C] shadow-none"
      >
        <DropdownMenuLabel className="truncate text-sm font-medium">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[#E5DDEC]" />
        <DropdownMenuItem
          onClick={onSignOut}
          className="rounded-lg focus:bg-[#ECE6F4] focus:text-[#26413C]"
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
    <header className="border-b border-[#E5DDEC] bg-[#F8F5F0]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-md text-[#907AB2] outline-none focus-visible:ring-2 focus-visible:ring-[#927AAC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F8F5F0]"
        >
          <HeartIcon className="size-5 fill-current" aria-hidden="true" />
          <span className="font-display text-lg font-semibold">tubodadiy</span>
        </Link>
        {children}
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
