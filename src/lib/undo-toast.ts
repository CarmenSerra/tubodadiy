"use client";

import { toast } from "sonner";

import { DEFAULT_LANG, isLang, type Lang } from "@/lib/i18n/config";
import { getServerT } from "@/lib/i18n/server";

/** Idioma activo: el proveedor mantiene `<html lang>` al día (esta función no es un hook). */
function currentLang(): Lang {
  const lang = typeof document === "undefined" ? null : document.documentElement.getAttribute("lang");
  return isLang(lang) ? lang : DEFAULT_LANG;
}

/** Tiempo que el aviso con «Deshacer» sigue visible. */
const TOAST_MS = 9000;

/**
 * Aviso de «hecho» con botón «Deshacer». `undo` revierte el cambio y lanza si
 * no se pudo; el aviso lo gestiona: confirma «Deshecho: …» o avisa del error.
 * No depende del componente que lo lanzó, así que sigue funcionando aunque este
 * ya se haya desmontado (p. ej. la tarjeta de un proveedor borrado).
 */
export function toastWithUndo(message: string, undo: () => Promise<void>) {
  // Textos en `dashboard:undo.*`; el idioma se lee al lanzar el aviso.
  const t = getServerT(currentLang(), "dashboard");
  const toastId = toast.success(message, {
    duration: TOAST_MS,
    // Si hubiera un diálogo modal abierto, Radix desactiva los clics fuera de él (también en los
    // avisos); sin esto el botón «Deshacer» del aviso no respondería.
    style: { pointerEvents: "auto" },
    classNames: { actionButton: "!rounded-full !bg-cta !px-3 !font-medium !text-on-cta" },
    action: {
      label: t("undo.action"),
      onClick: async () => {
        toast.dismiss(toastId);
        try {
          await undo();
          toast.success(t("undo.done", { message: `${message.charAt(0).toLowerCase()}${message.slice(1)}` }));
        } catch {
          toast.error(t("undo.error"));
        }
      },
    },
  });
  return toastId;
}
