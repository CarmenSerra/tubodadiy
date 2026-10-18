"use client";

// Avisos locales del navegador (Notification API) para tareas que vencen hoy o
// mañana. Sin servidor push ni service worker propio: se comprueban al abrir la
// app, solo si la persona los ha activado en este navegador, y como mucho una
// vez al día por plan. Todo lo que toca el navegador va en try/catch: sin
// soporte, con permisos bloqueados o sin almacenamiento, simplemente no avisa.

import * as React from "react";

const ENABLED_KEY = "tubodadiy:task-notify";
const LAST_KEY = "tubodadiy:task-notified:";

/** `unsupported`: el navegador no lo permite; `blocked`: permiso denegado; `off`: sin activar; `on`: activo. */
export type NotifyState = "unsupported" | "blocked" | "off" | "on";

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Sin almacenamiento: el ajuste vale solo hasta recargar.
  }
}

function snapshot(): NotifyState {
  if (typeof window === "undefined" || typeof Notification === "undefined") return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  return Notification.permission === "granted" && read(ENABLED_KEY) === "1" ? "on" : "off";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Estado de los avisos en este navegador (`unsupported` en el servidor). */
export function useTaskNotifyState(): NotifyState {
  return React.useSyncExternalStore(subscribe, snapshot, () => "unsupported");
}

/** Pide permiso (un clic de la persona) y, si lo concede, activa los avisos. */
export async function enableTaskNotifications(): Promise<NotifyState> {
  if (typeof Notification === "undefined") return "unsupported";
  try {
    const permission =
      Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    if (permission === "granted") write(ENABLED_KEY, "1");
  } catch {
    // Algunos navegadores antiguos no devuelven promesa o fallan al pedir permiso.
  }
  emit();
  return snapshot();
}

export function disableTaskNotifications() {
  write(ENABLED_KEY, null);
  emit();
}

const dayKey = (now: Date) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

/**
 * Muestra el aviso del día para el plan, una sola vez al día. Devuelve `true`
 * si se mostró. En móviles que no admiten `new Notification` prueba con el
 * service worker, si la app tiene alguno registrado.
 */
export async function showDueNotification(
  planId: string,
  title: string,
  body: string,
  now: Date = new Date()
): Promise<boolean> {
  if (snapshot() !== "on") return false;
  const today = dayKey(now);
  if (read(LAST_KEY + planId) === today) return false;
  const options = { body, tag: `tubodadiy-tasks-${planId}` };
  // Se anota antes de mostrarlo para que dos comprobaciones seguidas no dupliquen el aviso.
  write(LAST_KEY + planId, today);
  try {
    new Notification(title, options);
    return true;
  } catch {
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      if (registration) {
        await registration.showNotification(title, options);
        return true;
      }
    } catch {
      // Sin service worker: no se puede avisar en este dispositivo.
    }
  }
  write(LAST_KEY + planId, null);
  return false;
}
