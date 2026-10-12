import { HeartIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Pie común de la landing y de las páginas de la app, con la autoría. */
export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("relative z-10 border-t border-line px-4 py-8 text-center text-sm text-ink-muted", className)}>
      <p>tubodadiy — organiza tu boda sin perder de vista el conjunto.</p>
      <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs">
        Hecho con cariño por
        <a
          href="https://www.linkedin.com/in/carmenserrano"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-brand underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-lilac focus-visible:outline-none"
        >
          Carmen Serrano
        </a>
        <HeartIcon className="size-3 fill-current text-brand" aria-hidden="true" />
        <span aria-hidden="true">·</span>
        <span>© {new Date().getFullYear()}</span>
      </p>
    </footer>
  );
}
