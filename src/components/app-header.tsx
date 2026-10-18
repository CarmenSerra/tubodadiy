"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { HeartIcon, LogOutIcon, UserRoundIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { UserAvatar, useMyAvatarUrl } from "@/components/auth/user-avatar";
import { VerifyEmailNotice } from "@/components/auth/verify-email-notice";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LanguageSwitch } from "@/components/language-switch";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/hooks/use-auth";

/** Menú de usuario de la cabecera (presentacional: no depende de Firebase). */
export function UserMenu({
  label,
  avatarUrl,
  onSignOut,
}: {
  /** Nombre o email del usuario. */
  label: string;
  /** Foto de perfil (data URL); sin ella se muestran las iniciales. */
  avatarUrl?: string;
  onSignOut: () => void;
}) {
  const { t } = useTranslation(["common", "account"]);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("header.userMenu", { name: label })}
        className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface-alt"
      >
        <span className="hidden max-w-[12rem] truncate text-sm text-ink sm:block">{label}</span>
        <UserAvatar name={label} src={avatarUrl} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="rounded-xl border-line bg-surface p-1.5 text-ink shadow-none"
      >
        <DropdownMenuLabel className="truncate text-sm font-medium">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-track" />
        <DropdownMenuItem asChild className="min-h-11 rounded-lg focus:bg-lilac-soft focus:text-ink">
          <Link href="/perfil">
            <UserRoundIcon className="size-4" />
            {t("account:menu.profile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onSignOut}
          className="min-h-11 rounded-lg focus:bg-lilac-soft focus:text-ink"
        >
          <LogOutIcon className="size-4" />
          {t("header.signOut")}
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
          <LanguageSwitch />
          <ThemeToggle />
          {children}
        </div>
      </div>
    </header>
  );
}

export function AppHeader() {
  const { t } = useTranslation("common");
  const { user, signOut } = useAuth();
  const router = useRouter();
  const avatarUrl = useMyAvatarUrl();

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <>
      <AppHeaderView>
        {user && (
          <UserMenu
            label={user.displayName || user.email || t("header.account")}
            avatarUrl={avatarUrl}
            onSignOut={handleSignOut}
          />
        )}
      </AppHeaderView>
      <VerifyEmailNotice />
    </>
  );
}
