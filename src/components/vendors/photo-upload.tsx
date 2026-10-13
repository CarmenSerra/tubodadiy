"use client";

import * as React from "react";
import { ImagePlusIcon, Loader2, Trash2Icon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { CTA_SECONDARY } from "@/components/dashboard/ui";
import { compressImageToDataUri } from "@/lib/image-compress";
import { cn } from "@/lib/utils";

interface PhotoUploadProps {
  /** Data URI WebP actual ("" si no hay). */
  value: string;
  onChange: (dataUri: string) => void;
  className?: string;
}

/** Sube una foto, la reduce en el navegador (~400 px, WebP, ≤30 KB) y devuelve un data URI. */
export function PhotoUpload({ value, onChange, className }: PhotoUploadProps) {
  const { t } = useTranslation("vendors");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError(t("photo.notImage"));
      return;
    }
    setBusy(true);
    try {
      onChange(await compressImageToDataUri(file));
    } catch {
      setError(t("photo.processError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-3">
        {value && (
          // eslint-disable-next-line @next/next/no-img-element -- data URI local, ya reducida
          <img
            src={value}
            alt={t("photo.preview")}
            className="size-16 shrink-0 rounded-xl border border-line object-cover"
          />
        )}
        <input
          ref={inputRef}
          id="vendor-photo-file"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFile}
          tabIndex={-1}
          aria-label={t("photo.upload")}
        />
        <button
          type="button"
          className={CTA_SECONDARY}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlusIcon className="size-4" aria-hidden="true" />
          )}
          {value ? t("photo.change") : t("photo.upload")}
        </button>
        {value && (
          <button
            type="button"
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink underline decoration-lilac decoration-2 underline-offset-4 outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-lilac"
            onClick={() => {
              setError("");
              onChange("");
            }}
          >
            <Trash2Icon className="size-4" aria-hidden="true" />
            {t("photo.remove")}
          </button>
        )}
      </div>
      <p role={error ? "alert" : undefined} className={cn("text-sm", error ? "font-medium text-ink" : "text-ink-muted")}>
        {error || t("photo.hint")}
      </p>
    </div>
  );
}
