"use client";

import { AlertCircleIcon } from "lucide-react";

export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-page px-4 py-16 text-center">
      <AlertCircleIcon className="size-8 text-brand" aria-hidden="true" />
      <h1 className="mt-4 font-display text-3xl font-semibold text-ink">Algo no ha ido bien</h1>
      <p className="mt-2 max-w-sm text-ink-muted">
        Ha ocurrido un error inesperado. Inténtalo de nuevo y, si sigue pasando, recarga la página.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-cta px-6 text-sm font-medium text-on-cta transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-page"
      >
        Volver a intentarlo
      </button>
    </main>
  );
}
