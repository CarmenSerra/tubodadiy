"use client";

import * as React from "react";
import { doc } from "firebase/firestore";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getFirebaseDb } from "@/lib/firebase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { useDoc } from "@/lib/hooks/use-doc";
import { cn, initials } from "@/lib/utils";

/** Foto de perfil (users/{uid}.avatarUrl) de la persona con sesión; "" si no hay. */
export function useMyAvatarUrl(): string {
  const { user } = useAuth();
  const uid = user?.uid;
  const ref = React.useMemo(() => (uid ? doc(getFirebaseDb(), "users", uid) : null), [uid]);
  const { data } = useDoc(ref, (_id, d) => (typeof d.avatarUrl === "string" ? d.avatarUrl : ""));
  return data ?? "";
}

/** Avatar redondo: la foto si la hay (y carga) o, si no, las iniciales. */
export function UserAvatar({
  name,
  src,
  className,
  fallbackClassName,
}: {
  name: string;
  src?: string;
  className?: string;
  fallbackClassName?: string;
}) {
  return (
    <Avatar className={className}>
      {src ? <AvatarImage src={src} alt="" referrerPolicy="no-referrer" /> : null}
      <AvatarFallback className={cn("bg-lilac-mid text-ink-on-tint", fallbackClassName)}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
