"use client";

import * as React from "react";
import { EyeIcon, EyeOffIcon, GiftIcon, Loader2, PencilIcon } from "lucide-react";
import { toast } from "sonner";

import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import { FIELD, FIELD_LABEL } from "@/components/guests/brand-dialog";
import {
  GIFT_MESSAGE_EXAMPLE,
  GIFT_MESSAGE_MAX,
  bizumError,
  formatBizum,
  formatIban,
  ibanError,
  maskIban,
  normalizeBizum,
  normalizeIban,
} from "@/components/plan-tools/gift-model";
import { ToolDialog } from "@/components/plan-tools/tool-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { usePlanContext } from "@/lib/context/plan-context";
import { saveGift } from "@/lib/firebase/plan-tools";
import { cn } from "@/lib/utils";

const FORM_ID = "gift-form";

export function GiftDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [saving, setSaving] = React.useState(false);
  return (
    <ToolDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Regalo"
      description="Recibe el regalo en dinero: cuenta bancaria, Bizum o las dos."
      icon={<GiftIcon />}
      footer={
        <>
          <button type="button" onClick={() => onOpenChange(false)} className={CTA_SECONDARY}>
            Cancelar
          </button>
          <button type="submit" form={FORM_ID} disabled={saving} className={cn(CTA_PRIMARY, "disabled:opacity-50")}>
            {saving && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
            Guardar
          </button>
        </>
      }
    >
      {open && <GiftForm onClose={() => onOpenChange(false)} onSavingChange={setSaving} />}
    </ToolDialog>
  );
}

function GiftForm({
  onClose,
  onSavingChange,
}: {
  onClose: () => void;
  onSavingChange: (saving: boolean) => void;
}) {
  const { planId, plan } = usePlanContext();
  const gift = plan?.gift ?? null;
  const [iban, setIban] = React.useState(formatIban(gift?.iban ?? ""));
  const [bizum, setBizum] = React.useState(formatBizum(gift?.bizum ?? ""));
  const [message, setMessage] = React.useState(gift?.message ?? "");
  const [show, setShow] = React.useState(gift?.showOnInvitation ?? false);
  // Con un IBAN ya guardado se enseña oculto; «Cambiar» abre el campo.
  const [editingIban, setEditingIban] = React.useState(!gift?.iban);
  const [revealed, setRevealed] = React.useState(false);
  const [touched, setTouched] = React.useState({ iban: false, bizum: false });

  const ibanProblem = ibanError(iban);
  const bizumProblem = bizumError(bizum);
  const hasData = Boolean(normalizeIban(iban) || normalizeBizum(bizum));
  const ibanInputRef = React.useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (ibanProblem || bizumProblem) {
      setTouched({ iban: true, bizum: true });
      setEditingIban(true);
      toast.error("Revisa los datos marcados antes de guardar.");
      return;
    }
    const clean = {
      iban: normalizeIban(iban),
      bizum: normalizeBizum(bizum),
      message: message.trim(),
      showOnInvitation: show,
    };
    const empty = !clean.iban && !clean.bizum && !clean.message;
    onSavingChange(true);
    try {
      await saveGift(planId, empty ? null : clean);
      toast.success(empty ? "Datos del regalo quitados" : "Datos del regalo guardados");
      onClose();
    } catch {
      toast.error("No se han podido guardar los datos del regalo.");
    } finally {
      onSavingChange(false);
    }
  }

  const ibanShown = formatIban(iban);

  return (
    <form id={FORM_ID} onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <p className="rounded-xl border border-line bg-lilac-soft px-3.5 py-3 text-sm text-ink">
        Muchas parejas dan un IBAN para quien prefiere transferencia y un Bizum para quien quiere hacerlo
        al momento. Puedes poner uno, otro o los dos.
      </p>

      <div className="flex flex-col gap-2">
        <Label htmlFor="gift-iban" className={FIELD_LABEL}>
          IBAN de la cuenta
        </Label>
        {editingIban ? (
          <>
            <Input
              ref={ibanInputRef}
              id="gift-iban"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              onBlur={() => {
                setTouched((t) => ({ ...t, iban: true }));
                // Se agrupa de cuatro en cuatro al salir del campo (no al teclear, para no mover el cursor).
                setIban((v) => formatIban(v));
              }}
              placeholder="ES91 2100 0418 4502 0005 1332"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-invalid={touched.iban && ibanProblem ? true : undefined}
              aria-describedby="gift-iban-help"
              className={cn(FIELD, "font-mono uppercase tracking-wide placeholder:normal-case")}
            />
            <p
              id="gift-iban-help"
              role={touched.iban && ibanProblem ? "alert" : undefined}
              className={cn("text-sm", touched.iban && ibanProblem ? "text-danger" : "text-ink-muted")}
            >
              {touched.iban && ibanProblem
                ? ibanProblem
                : "Usa una cuenta que controléis los dos. Se muestra oculto en cuanto lo guardas."}
            </p>
          </>
        ) : (
          <div
            id="gift-iban"
            className="flex items-center gap-2 rounded-xl border border-line-strong bg-field py-1.5 pl-3.5 pr-1.5"
          >
            <span className="min-w-0 flex-1 truncate font-mono text-[0.8125rem] text-ink-strong sm:text-sm sm:tracking-wide">
              <span className="sr-only">{revealed ? `IBAN: ${ibanShown}` : "IBAN oculto"}</span>
              <span aria-hidden="true">{revealed ? ibanShown : maskIban(iban)}</span>
            </span>
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              aria-pressed={revealed}
              aria-label={revealed ? "Ocultar IBAN" : "Mostrar IBAN"}
              title={revealed ? "Ocultar IBAN" : "Mostrar IBAN"}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-lilac-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac"
            >
              {revealed ? <EyeOffIcon aria-hidden="true" className="size-4" /> : <EyeIcon aria-hidden="true" className="size-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingIban(true);
                setRevealed(false);
                requestAnimationFrame(() => ibanInputRef.current?.focus());
              }}
              aria-label="Cambiar IBAN"
              title="Cambiar IBAN"
              className="inline-flex size-10 shrink-0 items-center justify-center gap-1.5 rounded-full text-sm font-medium text-ink transition-colors hover:bg-lilac-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac sm:w-auto sm:px-3"
            >
              <PencilIcon aria-hidden="true" className="size-3.5" />
              <span aria-hidden="true" className="hidden sm:inline">
                Cambiar
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="gift-bizum" className={FIELD_LABEL}>
          Teléfono para Bizum
        </Label>
        <Input
          id="gift-bizum"
          type="tel"
          value={bizum}
          onChange={(e) => setBizum(e.target.value)}
          onBlur={() => {
            setTouched((t) => ({ ...t, bizum: true }));
            if (!bizumError(bizum) && bizum) setBizum(formatBizum(bizum));
          }}
          placeholder="612 345 678"
          autoComplete="off"
          aria-invalid={touched.bizum && bizumProblem ? true : undefined}
          aria-describedby="gift-bizum-help"
          className={FIELD}
        />
        <p
          id="gift-bizum-help"
          role={touched.bizum && bizumProblem ? "alert" : undefined}
          className={cn("text-sm", touched.bizum && bizumProblem ? "text-danger" : "text-ink-muted")}
        >
          {touched.bizum && bizumProblem ? bizumProblem : "Opcional. El móvil donde queréis recibir los Bizum."}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="gift-message" className={FIELD_LABEL}>
            Mensaje para los invitados
          </Label>
          {!message.trim() && (
            <button
              type="button"
              onClick={() => setMessage(GIFT_MESSAGE_EXAMPLE)}
              className="rounded text-sm font-medium text-ink underline decoration-lilac decoration-2 underline-offset-4 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              Usar un texto de ejemplo
            </button>
          )}
        </div>
        <Textarea
          id="gift-message"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, GIFT_MESSAGE_MAX))}
          rows={4}
          placeholder="Algo breve y cariñoso para quien quiera tener un detalle con vosotros…"
          aria-describedby="gift-message-count"
          className={cn(FIELD, "h-auto min-h-28 py-2.5")}
        />
        <p id="gift-message-count" className="text-right text-xs tabular-nums text-ink-muted">
          {message.length}/{GIFT_MESSAGE_MAX}
        </p>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-2xl border border-line p-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Label htmlFor="gift-show" className="text-sm font-medium text-ink">
            Mostrar en la invitación
          </Label>
          <p id="gift-show-help" className="text-sm text-ink-muted">
            {show
              ? "El IBAN, el Bizum y el mensaje aparecerán en la invitación que compartas."
              : "Nada se mostrará a los invitados: solo lo veis vosotros."}
            {show && !hasData && " Añade antes un IBAN o un Bizum."}
          </p>
        </div>
        <Switch
          id="gift-show"
          checked={show}
          onCheckedChange={setShow}
          aria-describedby="gift-show-help"
          className="mt-0.5 h-6 w-11 data-[state=checked]:bg-cta data-[state=unchecked]:bg-line-strong focus-visible:ring-lilac [&>span]:size-5 [&>span]:data-[state=checked]:translate-x-[1.375rem] [&>span]:data-[state=unchecked]:translate-x-0.5"
        />
      </div>
    </form>
  );
}
