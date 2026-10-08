"use client";

import * as React from "react";
import { MoonIcon, SunIcon } from "lucide-react";

import { applyTheme, readStoredTheme, setTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

const getSnapshot = (): Theme => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
const getServerSnapshot = (): Theme => "light";

/**
 * Botón luna/sol del modo noche. El icono se elige con CSS (según el data-theme
 * del <html>, que ya fija el script del <head>), así no parpadea al hidratar;
 * el estado de React solo gobierna aria-label y aria-pressed.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const dark = theme === "dark";

  // En desarrollo, Strict Mode borra los atributos que puso el script del <head>;
  // se recuperan aquí, antes de pintar. En producción no hace nada.
  React.useLayoutEffect(() => {
    const stored = readStoredTheme();
    if (document.documentElement.getAttribute("data-theme") !== stored) applyTheme(stored);
  }, []);

  return (
    <button
      type="button"
      aria-label={dark ? "Activar modo claro" : "Activar modo noche"}
      aria-pressed={dark}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink outline-none transition-colors hover:bg-lilac-soft focus-visible:ring-2 focus-visible:ring-lilac pointer-coarse:size-11",
        className
      )}
    >
      <MoonIcon aria-hidden="true" className="size-5 dark:hidden" />
      <SunIcon aria-hidden="true" className="hidden size-5 dark:block" />
    </button>
  );
}
