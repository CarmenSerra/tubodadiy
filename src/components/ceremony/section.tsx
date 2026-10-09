import * as React from "react";

import { CARD, IconCircle, SECTION_TITLE } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";

/** Tarjeta de sección de la pestaña Ceremonia: icono, título, descripción y acción opcional. */
export function CeremonySection({
  id,
  icon,
  title,
  description,
  action,
  className,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const headingId = `${id}-title`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(CARD, "scroll-mt-24 flex flex-col gap-5 p-5 sm:p-6", className)}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-start gap-3.5">
          <IconCircle tone="lilac" className="mt-0.5 size-11">
            {icon}
          </IconCircle>
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id={headingId} className={SECTION_TITLE}>
              {title}
            </h2>
            <p className="text-sm text-ink-muted">{description}</p>
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
