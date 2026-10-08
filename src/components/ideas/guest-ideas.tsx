"use client";

import * as React from "react";
import { CheckIcon } from "lucide-react";

import { GuestFormDialog } from "@/components/guests/guest-form-dialog";
import { normalizeText } from "@/components/guests/guest-filters";
import { IDEA_CHIP } from "@/components/ideas/ideas-list";
import { IdeasPanel } from "@/components/ideas/ideas-panel";
import { GUEST_IDEAS } from "@/lib/ideas";
import { cn } from "@/lib/utils";

/**
 * «✨ Ideas» de invitados: unos consejos breves y grupos típicos. Al pulsar un
 * grupo se abre el formulario de invitado nuevo con ese grupo ya puesto.
 */
export function GuestIdeas({
  planId,
  groups,
  align,
  className,
}: {
  planId: string;
  /** Grupos que ya existen en la lista. */
  groups: string[];
  align?: "start" | "center" | "end";
  className?: string;
}) {
  const [form, setForm] = React.useState<{ open: boolean; group?: string; opener?: HTMLElement | null }>({
    open: false,
  });
  const have = React.useMemo(() => new Set(groups.map(normalizeText)), [groups]);

  return (
    <>
      <IdeasPanel
        title="Ideas para tu lista"
        description="Unos consejos para empezar sin agobios."
        align={align}
        className={className}
      >
        {(ctx) => (
          <div className="flex flex-col gap-5 pb-3 pt-1">
            <ul className="flex flex-col gap-2.5">
              {GUEST_IDEAS.tips.map((tip) => (
                <li key={tip} className="flex gap-2.5 text-sm leading-snug text-[#102D28]">
                  <span aria-hidden="true" className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[#8FAF8A]" />
                  {tip}
                </li>
              ))}
            </ul>

            <section aria-labelledby="guest-ideas-groups" className="flex flex-col gap-2">
              <div>
                <h3 id="guest-ideas-groups" className="text-sm font-medium text-[#26413C]">
                  Grupos habituales
                </h3>
                <p className="text-[13px] text-[#586C64]">
                  Toca uno para añadir a alguien directamente en ese grupo.
                </p>
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {GUEST_IDEAS.groups.map((group) => {
                  const exists = have.has(normalizeText(group));
                  return (
                    <li key={group}>
                      <button
                        type="button"
                        aria-label={
                          exists
                            ? `Añadir invitado en «${group}» (ya tienes este grupo)`
                            : `Añadir invitado en «${group}»`
                        }
                        onClick={() => ctx.handoff((opener) => setForm({ open: true, group, opener }))}
                        className={cn(IDEA_CHIP, exists && "border-[#BCC7B5] bg-[#F4F1EB] text-[#4E6A5A]")}
                      >
                        {exists && <CheckIcon aria-hidden="true" className="size-3.5" />}
                        {group}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        )}
      </IdeasPanel>
      <GuestFormDialog
        planId={planId}
        groups={groups}
        defaultGroup={form.group}
        returnFocusTo={form.opener}
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
      />
    </>
  );
}
