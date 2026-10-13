"use client";

import * as React from "react";
import { CheckIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { GuestFormDialog } from "@/components/guests/guest-form-dialog";
import { normalizeText } from "@/components/guests/guest-filters";
import { IDEA_CHIP } from "@/components/ideas/ideas-list";
import { IdeasPanel } from "@/components/ideas/ideas-panel";
import { titlesInAllLanguages } from "@/components/ideas/ideas-text";
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
  const { t } = useTranslation("guests");
  const [form, setForm] = React.useState<{ open: boolean; group?: string; opener?: HTMLElement | null }>({
    open: false,
  });
  const have = React.useMemo(() => new Set(groups.map(normalizeText)), [groups]);

  return (
    <>
      <IdeasPanel
        title={t("ideas.title")}
        description={t("ideas.description")}
        align={align}
        className={className}
      >
        {(ctx) => (
          <div className="flex flex-col gap-5 pb-3 pt-1">
            <ul className="flex flex-col gap-2.5">
              {Array.from({ length: GUEST_IDEAS.tips }, (_, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-snug text-ink-strong">
                  <span aria-hidden="true" className="mt-[7px] size-1.5 shrink-0 rounded-full bg-sage" />
                  {t(`ideas.tips.${i}`)}
                </li>
              ))}
            </ul>

            <section aria-labelledby="guest-ideas-groups" className="flex flex-col gap-2">
              <div>
                <h3 id="guest-ideas-groups" className="text-sm font-medium text-ink">
                  {t("ideas.groupsTitle")}
                </h3>
                <p className="text-[13px] text-ink-muted">
                  {t("ideas.groupsHint")}
                </p>
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {GUEST_IDEAS.groups.map((id) => {
                  // El grupo se guarda con el nombre del idioma activo (es texto libre del usuario).
                  const group = t(`ideas.groups.${id}`);
                  const exists = titlesInAllLanguages(`ideas.groups.${id}`, "guests").some((name) =>
                    have.has(normalizeText(name))
                  );
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        aria-label={
                          exists ? t("ideas.addInGroupExists", { group }) : t("ideas.addInGroup", { group })
                        }
                        onClick={() => ctx.handoff((opener) => setForm({ open: true, group, opener }))}
                        className={cn(IDEA_CHIP, exists && "border-sage-light bg-page text-green")}
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
