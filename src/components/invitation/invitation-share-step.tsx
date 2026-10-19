"use client";

import * as React from "react";
import { CheckIcon, CopyIcon, ExternalLinkIcon, Loader2Icon, MessageCircleIcon, SendIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import { FIELD, FIELD_LABEL } from "@/components/guests/brand-dialog";
import { StepCard } from "@/components/invitation/invitation-form-bits";
import { SLUG_MAX, SLUG_MIN } from "@/components/invitation/invitation-model";
import type { SlugCheck } from "@/components/invitation/use-slug-availability";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Paso 3 — Compartir: enlace, publicar y enviar. */
export function InvitationShareStep({
  published,
  slug,
  slugPrefix,
  slugValid,
  slugCheck,
  slugMoves,
  onSlugChange,
  onSlugCommit,
  onSlugPick,
  url,
  whatsappHref,
  acting,
  canPublish,
  copied,
  onPublish,
  onUnpublish,
  onCopy,
  missingBlocks = [],
  onGoDesign,
  readOnly = false,
}: {
  published: boolean;
  slug: string;
  slugPrefix: string;
  slugValid: boolean;
  slugCheck: SlugCheck;
  /** Está publicada y el enlace escrito no es el actual: el anterior dejará de funcionar. */
  slugMoves: boolean;
  onSlugChange: (value: string) => void;
  onSlugCommit: () => void;
  onSlugPick: (value: string) => void;
  url: string;
  whatsappHref: string;
  acting: "publish" | "unpublish" | null;
  canPublish: boolean;
  copied: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
  onCopy: () => void;
  /** Modo «Desde cero»: bloques importantes (nombres, fecha) que aún no están colocados en la tarjeta. */
  missingBlocks?: readonly ("names" | "date")[];
  onGoDesign?: () => void;
  /** Solo ver: sin cambiar el enlace ni publicar o despublicar (copiar y compartir sí). */
  readOnly?: boolean;
}) {
  const { t } = useTranslation("invitationPage");
  const [confirming, setConfirming] = React.useState(false);

  return (
    <StepCard
      title={t("share.title")}
      aside={
        <span
          className={cn(
            "inline-flex h-7 shrink-0 items-center rounded-full px-3 text-xs font-semibold",
            published ? "bg-green-solid text-on-solid" : "bg-lilac-mid text-ink-on-tint"
          )}
        >
          {published ? t("share.published") : t("share.draft")}
        </span>
      }
    >
      {!readOnly && (
      <div className="flex flex-col gap-2">
        <label htmlFor="inv-slug" className={FIELD_LABEL}>
          {t("slug.label")}
        </label>
        <div className="flex min-w-0 items-stretch overflow-hidden rounded-xl border border-line-strong bg-field focus-within:ring-2 focus-within:ring-lilac">
          <span
            aria-hidden="true"
            className="flex max-w-[45%] shrink-0 items-center truncate border-r border-line bg-raised px-3 text-sm text-ink-muted"
          >
            {slugPrefix}
          </span>
          <Input
            id="inv-slug"
            value={slug}
            onChange={(e) => onSlugChange(e.target.value)}
            onBlur={onSlugCommit}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSlugCommit();
            }}
            maxLength={SLUG_MAX}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="none"
            aria-invalid={!slugValid || slugCheck.status === "taken"}
            aria-describedby="inv-slug-help"
            className="h-11 min-w-0 flex-1 rounded-none border-0 bg-transparent font-mono text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-sm"
          />
        </div>
        <div id="inv-slug-help" aria-live="polite" className="flex flex-col gap-1.5 text-[13px]">
          {!slugValid ? (
            <p className="text-danger">{t("slug.invalid", { min: SLUG_MIN, max: SLUG_MAX })}</p>
          ) : slugCheck.status === "taken" ? (
            <>
              <p className="text-danger">{t("slug.taken")}</p>
              {slugCheck.suggestion && (
                <p className="text-ink-muted">
                  {t("slug.suggestion")}{" "}
                  <button
                    type="button"
                    onClick={() => onSlugPick(slugCheck.suggestion)}
                    className="min-h-11 rounded-md font-mono font-medium text-ink underline decoration-lilac decoration-2 underline-offset-4 outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-lilac"
                  >
                    {slugCheck.suggestion}
                  </button>
                </p>
              )}
            </>
          ) : slugCheck.status === "checking" ? (
            <p className="text-ink-muted">{t("slug.checking")}</p>
          ) : slugCheck.status === "error" ? (
            <p className="text-ink-muted">{t("slug.error")}</p>
          ) : (
            <p className="flex items-center gap-1 text-ink-muted">
              <CheckIcon aria-hidden="true" className="size-3.5 text-green" />
              {slugCheck.status === "mine" ? t("slug.mine") : t("slug.free")}
            </p>
          )}
          <p className="text-ink-muted">{t("slug.help", { min: SLUG_MIN, max: SLUG_MAX })}</p>
          {slugMoves && (
            <p role="status" className="rounded-lg bg-lilac-soft px-3 py-2 text-ink">
              {t("slug.moves")}
            </p>
          )}
        </div>
      </div>
      )}

      {!readOnly && missingBlocks.length > 0 && (
        <div role="status" className="flex flex-col items-start gap-1 rounded-xl bg-lilac-soft px-4 py-3 text-sm text-ink">
          <p>
            {t("share.missingBlocks", {
              blocks: missingBlocks.map((b) => t(`blank.blocks.${b}`).toLowerCase()).join(", "),
            })}
          </p>
          {onGoDesign && (
            <button
              type="button"
              onClick={onGoDesign}
              className="min-h-11 rounded-md font-medium text-ink underline decoration-lilac decoration-2 underline-offset-4 outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-lilac"
            >
              {t("share.missingBlocksAction")}
            </button>
          )}
        </div>
      )}

      {!published && readOnly ? (
        <p className="text-sm text-ink-muted">{t("share.draftNote")}</p>
      ) : !published ? (
        <div className="flex flex-col items-start gap-3">
          <button
            type="button"
            onClick={onPublish}
            disabled={acting !== null || !canPublish}
            className={cn(CTA_PRIMARY, "h-12 w-full px-8 text-base sm:w-auto disabled:pointer-events-none disabled:opacity-60")}
          >
            {acting === "publish" ? (
              <Loader2Icon aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <SendIcon aria-hidden="true" className="size-4" />
            )}
            {acting === "publish" ? t("share.publishing") : t("share.publish")}
          </button>
          <p className="text-sm text-ink-muted">{t("share.draftNote")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">{t("share.publishedNote")}</p>
          <div className="flex flex-col gap-2">
            <label htmlFor="inv-link" className={FIELD_LABEL}>
              {t("share.link")}
            </label>
            <Input
              id="inv-link"
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className={cn(FIELD, "font-mono text-base sm:text-sm")}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={onCopy} className={cn(CTA_PRIMARY, "px-6")}>
              {copied ? (
                <CheckIcon aria-hidden="true" className="size-4" />
              ) : (
                <CopyIcon aria-hidden="true" className="size-4" />
              )}
              {t("share.copy")}
            </button>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={cn(CTA_SECONDARY, "h-11")}>
              <MessageCircleIcon aria-hidden="true" className="size-4" />
              {t("share.whatsapp")}
              <span className="sr-only"> {t("share.newTab")}</span>
            </a>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-medium text-ink underline decoration-lilac decoration-2 underline-offset-4 outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-lilac"
            >
              <ExternalLinkIcon aria-hidden="true" className="size-4" />
              {t("share.view")}
              <span className="sr-only"> {t("share.newTab")}</span>
            </a>
          </div>

          {!readOnly && (
          <div className="border-t border-line pt-3">
            {confirming ? (
              <div role="alert" className="flex flex-col gap-2 text-sm text-ink">
                <p>{t("share.unpublish.question")}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirming(false);
                      onUnpublish();
                    }}
                    disabled={acting !== null}
                    className={cn(CTA_SECONDARY, "h-11 disabled:opacity-60")}
                  >
                    {acting === "unpublish" && <Loader2Icon aria-hidden="true" className="size-4 animate-spin" />}
                    {t("share.unpublish.confirm")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="inline-flex h-11 items-center rounded-full px-4 text-sm font-medium text-ink outline-none hover:bg-lilac-soft focus-visible:ring-2 focus-visible:ring-lilac"
                  >
                    {t("share.unpublish.cancel")}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={acting !== null}
                className="inline-flex h-11 items-center rounded-full px-2 text-sm text-ink-muted underline decoration-line-strong decoration-1 underline-offset-4 outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-lilac disabled:opacity-60"
              >
                {t("share.unpublish.button")}
              </button>
            )}
          </div>
          )}
        </div>
      )}
    </StepCard>
  );
}
