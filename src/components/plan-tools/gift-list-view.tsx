"use client";

import * as React from "react";
import { ExternalLinkIcon, Loader2, PlusIcon, RepeatIcon } from "lucide-react";
import { toast } from "sonner";

import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import {
  CHECKBOX,
  DeleteIconButton,
  EditIconButton,
  FIELD,
  FIELD_LABEL,
  SELECT_CONTENT,
  SELECT_ITEM,
  SELECT_TRIGGER,
} from "@/components/guests/brand-dialog";
import { cleanUrl } from "@/components/invitation/invitation-model";
import {
  GIFT_ITEM_LIMITS,
  GIFT_ITEM_SUGGESTIONS,
  GIFT_LIST_MESSAGE_EXAMPLE,
  GIFT_MESSAGE_MAX,
  GIFT_PRIORITIES,
  emptyGift,
  giftListSummary,
  giftPriorityLabel,
  isGiftPriority,
  sortGiftItems,
  type GiftItem,
  type GiftItemInput,
  type GiftPriority,
} from "@/components/plan-tools/gift-model";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { usePlanContext } from "@/lib/context/plan-context";
import {
  addGiftItem,
  deleteGiftItem,
  restoreGiftItem,
  restoreGiftItemFields,
  setGiftItemAchieved,
  updateGiftItem,
} from "@/lib/firebase/gift-items";
import { giftItemsQuery, mapGiftItem } from "@/lib/firebase/gift-list";
import { saveGift } from "@/lib/firebase/plan-tools";
import { useCollection } from "@/lib/hooks/use-collection";
import { toastWithUndo } from "@/lib/undo-toast";
import { cn, formatCurrency, parseAmount } from "@/lib/utils";

export const GIFT_LIST_FORM_ID = "gift-list-form";

const NO_PRIORITY = "none";

type ItemForm = { kind: "new"; name: string } | { kind: "edit"; item: GiftItem };

/** Texto de un precio aproximado: «≈ 120 €». */
const approx = (price: number) => `≈ ${formatCurrency(price)}`;

function hostOf(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return link;
  }
}

function PriorityChip({ priority }: { priority: GiftPriority }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        priority === "high" && "bg-btn-soft text-ink-on-lilac",
        priority === "medium" && "bg-lilac-soft text-ink",
        priority === "low" && "border border-line-strong text-ink-muted"
      )}
    >
      {giftPriorityLabel(priority)}
    </span>
  );
}

export function GiftListView({
  onChangeMode,
  onSavingChange,
  onClose,
}: {
  onChangeMode: () => void;
  onSavingChange: (saving: boolean) => void;
  onClose: () => void;
}) {
  const { planId, plan } = usePlanContext();
  const gift = plan?.gift ?? null;
  const { data, loading, error } = useCollection(giftItemsQuery(planId), mapGiftItem);
  const items = React.useMemo(() => sortGiftItems(data), [data]);
  const summary = giftListSummary(items);

  const [form, setForm] = React.useState<ItemForm | null>(null);
  const [formKey, setFormKey] = React.useState(0);
  const [message, setMessage] = React.useState(gift?.listMessage ?? "");
  const [show, setShow] = React.useState(gift?.showOnInvitation ?? false);

  const openForm = (next: ItemForm) => {
    setForm(next);
    setFormKey((k) => k + 1);
  };

  async function handleSubmitItem(input: GiftItemInput) {
    if (form?.kind === "edit") {
      const before = form.item;
      try {
        await updateGiftItem(planId, before.id, input);
      } catch {
        toast.error("No se han podido guardar los cambios.");
        return;
      }
      setForm(null);
      toastWithUndo("Cambios guardados", () => restoreGiftItemFields(planId, before));
      return;
    }
    try {
      const id = await addGiftItem(planId, input);
      setForm(null);
      toastWithUndo(`«${input.name}» añadido a la lista`, () => deleteGiftItem(planId, id));
    } catch {
      toast.error("No se ha podido añadir a la lista.");
    }
  }

  async function handleDelete(item: GiftItem) {
    try {
      await deleteGiftItem(planId, item.id);
      if (form?.kind === "edit" && form.item.id === item.id) setForm(null);
      toastWithUndo(`«${item.name}» eliminado de la lista`, () => restoreGiftItem(planId, item));
    } catch {
      toast.error("No se ha podido eliminar de la lista.");
    }
  }

  async function handleAchieved(item: GiftItem, achieved: boolean) {
    try {
      await setGiftItemAchieved(planId, item.id, achieved);
    } catch {
      toast.error("No se ha podido actualizar la lista.");
    }
  }

  async function handleSaveMessage(e: React.FormEvent) {
    e.preventDefault();
    onSavingChange(true);
    try {
      await saveGift(planId, {
        ...(gift ?? emptyGift("list")),
        mode: "list",
        listMessage: message.trim(),
        showOnInvitation: show,
      });
      toast.success("Lista de regalos guardada");
      onClose();
    } catch {
      toast.error("No se ha podido guardar el mensaje.");
    } finally {
      onSavingChange(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-line bg-lilac-soft px-3.5 py-3 text-sm text-ink">
        <span>Cosas que os harían falta. Los invitados solo la verán: nadie reserva ni marca nada.</span>
        <button
          type="button"
          onClick={onChangeMode}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full text-sm font-medium text-ink underline decoration-lilac decoration-2 underline-offset-4 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <RepeatIcon aria-hidden="true" className="size-3.5" />
          Cambiar a dinero
        </button>
      </p>

      <section aria-labelledby="gift-list-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="flex flex-col gap-0.5">
            <h3 id="gift-list-title" className="font-display text-xl font-semibold text-ink">
              Vuestra lista
            </h3>
            <p className="text-sm text-ink-muted" aria-live="polite">
              {summary.total === 0
                ? "Todavía no hay nada. Los cambios se guardan al momento."
                : `${summary.pending} por conseguir${summary.achieved > 0 ? ` · ${summary.achieved} ya ${summary.achieved === 1 ? "conseguida" : "conseguidas"}` : ""}${summary.pendingPrice > 0 ? ` · unos ${formatCurrency(summary.pendingPrice)} en total` : ""}`}
            </p>
          </div>
          {!form && (
            <button type="button" onClick={() => openForm({ kind: "new", name: "" })} className={CTA_SECONDARY}>
              <PlusIcon aria-hidden="true" className="size-4" />
              Añadir una cosa
            </button>
          )}
        </div>

        {form && (
          <GiftItemForm
            key={formKey}
            initial={form.kind === "edit" ? form.item : null}
            prefillName={form.kind === "new" ? form.name : ""}
            onCancel={() => setForm(null)}
            onSubmit={handleSubmitItem}
          />
        )}

        {error && (
          <p role="alert" className="text-sm text-danger">
            No se ha podido cargar la lista. Recarga la página e inténtalo de nuevo.
          </p>
        )}

        {loading ? (
          <div role="status" aria-label="Cargando la lista" className="h-24 animate-pulse rounded-2xl bg-track motion-reduce:animate-none" />
        ) : items.length === 0 ? (
          !form && (
            <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-line-strong px-4 py-5">
              <p className="text-sm text-ink">
                Empieza por lo que de verdad os falta en casa. Puedes poner un enlace y un precio aproximado para
                que sea fácil encontrarlo.
              </p>
              <div className="flex flex-wrap gap-2">
                {GIFT_ITEM_SUGGESTIONS.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => openForm({ kind: "new", name })}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line-strong bg-field px-3.5 text-sm text-ink transition-colors hover:bg-lilac-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  >
                    <PlusIcon aria-hidden="true" className="size-3.5" />
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-line">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-2 border-t border-line bg-surface py-1 pl-3 pr-1 first:border-t-0 sm:pl-4"
              >
                <Checkbox
                  checked={item.achieved}
                  onCheckedChange={(v) => void handleAchieved(item, v === true)}
                  aria-label={`Ya tenemos «${item.name}»`}
                  title="Ya lo tenemos"
                  className={cn(CHECKBOX, "mt-3.5")}
                />
                <div className="min-w-0 flex-1 py-2.5">
                  <p
                    className={cn(
                      "break-words text-sm",
                      item.achieved ? "text-ink-muted line-through" : "font-medium text-ink-strong"
                    )}
                  >
                    {item.name}
                  </p>
                  {(item.priority || item.price !== null || item.link || item.achieved) && (
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-muted">
                      {item.achieved && <span className="font-medium text-ink">Ya lo tenemos</span>}
                      {item.priority && !item.achieved && <PriorityChip priority={item.priority} />}
                      {item.price !== null && <span className="tabular-nums">{approx(item.price)}</span>}
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex max-w-full items-center gap-1 rounded text-ink underline decoration-lilac decoration-2 underline-offset-4 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac"
                        >
                          <ExternalLinkIcon aria-hidden="true" className="size-3 shrink-0" />
                          <span className="truncate">{hostOf(item.link)}</span>
                          <span className="sr-only"> (se abre en una pestaña nueva)</span>
                        </a>
                      )}
                    </p>
                  )}
                  {item.note && <p className="mt-1 break-words text-xs text-ink-muted">{item.note}</p>}
                </div>
                <EditIconButton
                  label={`Editar «${item.name}»`}
                  className="mt-1.5"
                  onClick={() => openForm({ kind: "edit", item })}
                />
                <DeleteIconButton ariaLabel={`Quitar «${item.name}» de la lista`} onDelete={() => handleDelete(item)} />
              </li>
            ))}
          </ul>
        )}
        {items.length > 0 && (
          <p className="text-xs text-ink-muted">Marca la casilla de lo que ya tengáis: dejará de enseñarse a los invitados.</p>
        )}
      </section>

      <form id={GIFT_LIST_FORM_ID} onSubmit={handleSaveMessage} noValidate className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="gift-list-message" className={FIELD_LABEL}>
              Mensaje para los invitados
            </Label>
            {!message.trim() && (
              <button
                type="button"
                onClick={() => setMessage(GIFT_LIST_MESSAGE_EXAMPLE.slice(0, GIFT_MESSAGE_MAX))}
                className="rounded text-sm font-medium text-ink underline decoration-lilac decoration-2 underline-offset-4 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                Usar un texto de ejemplo
              </button>
            )}
          </div>
          <Textarea
            id="gift-list-message"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, GIFT_MESSAGE_MAX))}
            rows={4}
            placeholder="Algo breve y cariñoso para quien quiera tener un detalle con vosotros…"
            aria-describedby="gift-list-message-count"
            className={cn(FIELD, "h-auto min-h-28 py-2.5")}
          />
          <p id="gift-list-message-count" className="text-right text-xs tabular-nums text-ink-muted">
            {message.length}/{GIFT_MESSAGE_MAX}
          </p>
        </div>

        <div className="flex items-start justify-between gap-4 rounded-2xl border border-line p-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <Label htmlFor="gift-list-show" className="text-sm font-medium text-ink">
              Mostrar en la invitación
            </Label>
            <p id="gift-list-show-help" className="text-sm text-ink-muted">
              {show
                ? "La lista (sin lo que ya tenéis) y el mensaje aparecerán en la invitación que compartas."
                : "Nada se mostrará a los invitados: solo lo veis vosotros."}
              {show && summary.pending === 0 && " Añade antes alguna cosa a la lista."}
            </p>
          </div>
          <Switch
            id="gift-list-show"
            checked={show}
            onCheckedChange={setShow}
            aria-describedby="gift-list-show-help"
            className="mt-0.5 h-6 w-11 data-[state=checked]:bg-cta data-[state=unchecked]:bg-line-strong focus-visible:ring-lilac [&>span]:size-5 [&>span]:data-[state=checked]:translate-x-[1.375rem] [&>span]:data-[state=unchecked]:translate-x-0.5"
          />
        </div>
      </form>
    </div>
  );
}

function GiftItemForm({
  initial,
  prefillName,
  onCancel,
  onSubmit,
}: {
  initial: GiftItem | null;
  prefillName: string;
  onCancel: () => void;
  onSubmit: (input: GiftItemInput) => Promise<void>;
}) {
  const uid = React.useId();
  const nameRef = React.useRef<HTMLInputElement>(null);
  const [name, setName] = React.useState(initial?.name ?? prefillName);
  const [link, setLink] = React.useState(initial?.link ?? "");
  const [priceText, setPriceText] = React.useState(
    initial?.price != null ? String(initial.price).replace(".", ",") : ""
  );
  const [priority, setPriority] = React.useState<string>(initial?.priority ?? NO_PRIORITY);
  const [note, setNote] = React.useState(initial?.note ?? "");
  const [touched, setTouched] = React.useState({ name: false, link: false, price: false });
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const price = priceText.trim() ? parseAmount(priceText) : null;
  const nameProblem = name.trim() ? null : "Escribe qué es, por ejemplo «Juego de sábanas».";
  const linkProblem =
    link.trim() && !cleanUrl(link) ? "Escribe una dirección web válida, por ejemplo https://tienda.es/producto." : null;
  const priceProblem =
    price !== null && (!Number.isFinite(price) || price < 0 || price > GIFT_ITEM_LIMITS.price)
      ? "Escribe un importe en euros, por ejemplo 45 o 45,90."
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nameProblem || linkProblem || priceProblem) {
      setTouched({ name: true, link: true, price: true });
      toast.error("Revisa los datos marcados antes de guardar.");
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        name: name.trim(),
        link: link.trim() ? cleanUrl(link) : "",
        price,
        note: note.trim(),
        priority: isGiftPriority(priority) ? priority : null,
      });
    } finally {
      setBusy(false);
    }
  }

  const help = (id: string, problem: string | null, shown: boolean, fallback: string) => (
    <p
      id={id}
      role={shown && problem ? "alert" : undefined}
      className={cn("text-sm", shown && problem ? "text-danger" : "text-ink-muted")}
    >
      {shown && problem ? problem : fallback}
    </p>
  );

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label={initial ? `Editar «${initial.name}»` : "Añadir una cosa a la lista"}
      className="flex flex-col gap-4 rounded-2xl border border-line-strong bg-lilac-soft p-4 sm:p-5"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${uid}-name`} className={FIELD_LABEL}>
          ¿Qué es?
        </Label>
        <Input
          ref={nameRef}
          id={`${uid}-name`}
          value={name}
          maxLength={GIFT_ITEM_LIMITS.name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          placeholder="Robot de cocina"
          autoComplete="off"
          aria-invalid={touched.name && nameProblem ? true : undefined}
          aria-describedby={touched.name && nameProblem ? `${uid}-name-help` : undefined}
          className={FIELD}
        />
        {touched.name && nameProblem && help(`${uid}-name-help`, nameProblem, true, "")}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${uid}-price`} className={FIELD_LABEL}>
            Precio aproximado (€)
          </Label>
          <Input
            id={`${uid}-price`}
            value={priceText}
            inputMode="decimal"
            onChange={(e) => setPriceText(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, price: true }))}
            placeholder="120"
            autoComplete="off"
            aria-invalid={touched.price && priceProblem ? true : undefined}
            aria-describedby={`${uid}-price-help`}
            className={FIELD}
          />
          {help(`${uid}-price-help`, priceProblem, touched.price, "Opcional. Una idea, no tiene que ser exacto.")}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${uid}-priority`} className={FIELD_LABEL}>
            Prioridad
          </Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger id={`${uid}-priority`} className={cn(SELECT_TRIGGER, "w-full")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={SELECT_CONTENT}>
              <SelectItem value={NO_PRIORITY} className={SELECT_ITEM}>
                Sin prioridad
              </SelectItem>
              {GIFT_PRIORITIES.map((p) => (
                <SelectItem key={p.id} value={p.id} className={SELECT_ITEM}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-ink-muted">Opcional. Lo más importante sale primero.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${uid}-link`} className={FIELD_LABEL}>
          Enlace
        </Label>
        <Input
          id={`${uid}-link`}
          type="url"
          value={link}
          maxLength={GIFT_ITEM_LIMITS.link}
          onChange={(e) => setLink(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, link: true }))}
          placeholder="https://…"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={touched.link && linkProblem ? true : undefined}
          aria-describedby={`${uid}-link-help`}
          className={FIELD}
        />
        {help(`${uid}-link-help`, linkProblem, touched.link, "Opcional. La tienda o el producto, para que sea fácil de encontrar.")}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${uid}-note`} className={FIELD_LABEL}>
          Nota
        </Label>
        <Textarea
          id={`${uid}-note`}
          value={note}
          maxLength={GIFT_ITEM_LIMITS.note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Color, talla o modelo que preferís"
          className={cn(FIELD, "h-auto min-h-20 py-2.5")}
        />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className={CTA_SECONDARY}>
          Cancelar
        </button>
        <button type="submit" disabled={busy} className={cn(CTA_PRIMARY, "disabled:opacity-50")}>
          {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          {initial ? "Guardar cambios" : "Añadir a la lista"}
        </button>
      </div>
    </form>
  );
}
