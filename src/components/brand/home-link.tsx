"use client";

import * as React from "react";
import Link from "next/link";

import { useAuth } from "@/lib/hooks/use-auth";

/**
 * Enlace a «inicio» según la sesión: con sesión iniciada lleva al panel (/dashboard) y sin ella
 * a la página de presentación (/). Sirve para el logo y los «Volver al inicio» de las páginas
 * públicas (login, invitación, 404), que también ven personas que ya han entrado.
 */
export function HomeLink(props: Omit<React.ComponentProps<typeof Link>, "href">) {
  const { user } = useAuth();
  return <Link href={user ? "/dashboard" : "/"} {...props} />;
}
