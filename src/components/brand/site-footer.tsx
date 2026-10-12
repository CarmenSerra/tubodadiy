import { HeartIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Pie común de la landing y de las páginas de la app, con la autoría. */
export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("relative z-10 border-t border-line px-4 py-8 text-center text-sm text-ink-muted", className)}>
      <p>tubodadiy — organiza tu boda sin perder de vista el conjunto.</p>
      <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs">
        Diseñado y desarrollado por
        <span className="font-semibold text-brand">Carmen Serra</span>
        <HeartIcon className="size-3 fill-current text-brand" aria-hidden="true" />
        <span aria-hidden="true">·</span>
        <span>© {new Date().getFullYear()}</span>
      </p>
    </footer>
  );
}
