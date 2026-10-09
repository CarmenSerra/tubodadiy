import { HeartIcon } from "lucide-react";

import { HomeLink } from "@/components/brand/home-link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-page px-4 py-16 text-center">
      <HeartIcon className="size-8 fill-deco-lilac text-brand" aria-hidden="true" />
      <h1 className="mt-4 font-display text-3xl font-semibold text-ink">No encontramos esta página</h1>
      <p className="mt-2 max-w-sm text-ink-muted">
        Puede que el enlace esté mal escrito o que la página ya no exista.
      </p>
      <HomeLink
        className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-cta px-6 text-sm font-medium text-on-cta transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-page"
      >
        Volver al inicio
      </HomeLink>
    </main>
  );
}
