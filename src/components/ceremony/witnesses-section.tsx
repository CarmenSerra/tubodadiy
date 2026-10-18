"use client";

import * as React from "react";
import { PlusIcon, UsersRoundIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CeremonySection } from "@/components/ceremony/section";
import { CTA_PRIMARY, CTA_SECONDARY } from "@/components/dashboard/ui";
import {
  DayDialog,
  FormFrame,
  ListBody,
  PhoneLink,
  ROW_MAIN,
  TextField,
  useEditor,
} from "@/components/dayof/ui";
import { useWitnesses } from "@/components/dayof/use-dayof";
import { CHECKBOX, ROW_FOCUS } from "@/components/guests/brand-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { usePlanContext } from "@/lib/context/plan-context";
import type { Witness } from "@/lib/dayof-model";
import {
  createDayOfItem,
  deleteDayOfItem,
  restoreDayOfItem,
  setDniDelivered,
  updateDayOfItem,
} from "@/lib/firebase/dayof";
import { toastWithUndo } from "@/lib/undo-toast";
import { cn } from "@/lib/utils";

/** «Testigos»: quién firma, su teléfono y si ya ha entregado el DNI (nunca se guarda el número). */
export function WitnessesSection() {
  const { t } = useTranslation("ceremony");
  const { planId } = usePlanContext();
  const { data, loading, error } = useWitnesses(planId);
  const editor = useEditor<Witness>();
  const delivered = data.filter((w) => w.dniDelivered).length;

  async function toggle(witness: Witness, checked: boolean) {
    try {
      await setDniDelivered(planId, witness.id, checked);
    } catch {
      toast.error(t("witnesses.errors.save"));
    }
  }

  const addButton = (
    <button type="button" onClick={editor.openNew} className={data.length > 0 ? CTA_SECONDARY : CTA_PRIMARY}>
      <PlusIcon aria-hidden="true" className="size-4" />
      {t("witnesses.add")}
    </button>
  );

  return (
    <CeremonySection
      id="testigos"
      icon={<UsersRoundIcon />}
      title={t("witnesses.title")}
      description={t("witnesses.description")}
      action={data.length > 0 ? addButton : undefined}
    >
      <ListBody
        loading={loading}
        error={error}
        empty={data.length === 0}
        emptyText={t("witnesses.empty")}
        emptyAction={addButton}
      >
        <p className="text-sm text-ink-muted" aria-live="polite">
          {t("witnesses.dniSummary", { done: delivered, total: data.length })}
        </p>
        <ul className="-mt-2">
          {data.map((witness) => (
            <li
              key={witness.id}
              className="flex flex-wrap items-center gap-x-2 gap-y-0 border-b border-line py-1 last:border-b-0"
            >
              <button
                type="button"
                onClick={() => editor.openEdit(witness)}
                aria-label={t("witnesses.editAria", { name: witness.name })}
                className={cn(ROW_MAIN, "min-w-48")}
              >
                <span className="break-words font-medium text-ink">{witness.name}</span>
                {witness.forWhom.trim() && (
                  <span className="break-words text-sm text-ink-muted">
                    {t("witnesses.forWhomShort", { name: witness.forWhom })}
                  </span>
                )}
              </button>
              <PhoneLink phone={witness.phone} />
              <label
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl px-2 text-sm text-ink-strong hover:bg-lilac-soft",
                  ROW_FOCUS
                )}
              >
                <Checkbox
                  checked={witness.dniDelivered}
                  onCheckedChange={(v) => void toggle(witness, v === true)}
                  className={CHECKBOX}
                />
                {t("witnesses.dniDelivered")}
              </label>
            </li>
          ))}
        </ul>
      </ListBody>
      <DayDialog open={editor.open} onOpenChange={editor.setOpen}>
        <WitnessForm
          key={editor.item?.id ?? "new"}
          planId={planId}
          witness={editor.item}
          onDone={() => editor.setOpen(false)}
        />
      </DayDialog>
    </CeremonySection>
  );
}

function WitnessForm({ planId, witness, onDone }: { planId: string; witness?: Witness; onDone: () => void }) {
  const { t } = useTranslation("ceremony");
  const [name, setName] = React.useState(witness?.name ?? "");
  const [phone, setPhone] = React.useState(witness?.phone ?? "");
  const [forWhom, setForWhom] = React.useState(witness?.forWhom ?? "");
  const [dni, setDni] = React.useState(witness?.dniDelivered ?? false);
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit() {
    if (!name.trim()) {
      setNameError(t("witnesses.errors.name"));
      return;
    }
    const data = { name: name.trim(), phone: phone.trim(), forWhom: forWhom.trim(), dniDelivered: dni };
    setBusy(true);
    try {
      if (witness) await updateDayOfItem(planId, "witnesses", witness.id, data);
      else await createDayOfItem(planId, "witnesses", data);
      onDone();
    } catch {
      toast.error(t("witnesses.errors.save"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!witness) return;
    try {
      await deleteDayOfItem(planId, "witnesses", witness.id);
      onDone();
      toastWithUndo(t("witnesses.deleted"), () => restoreDayOfItem(planId, "witnesses", witness));
    } catch {
      toast.error(t("witnesses.errors.delete"));
    }
  }

  return (
    <FormFrame
      title={witness ? t("witnesses.form.editTitle") : t("witnesses.form.newTitle")}
      description={t("witnesses.form.description")}
      busy={busy}
      onSubmit={() => void submit()}
      onCancel={onDone}
      onDelete={witness ? () => void remove() : undefined}
      deleteLabel={t("witnesses.form.delete")}
    >
      <TextField
        label={t("witnesses.form.fields.name")}
        value={name}
        onChange={(v) => {
          setName(v);
          setNameError(null);
        }}
        error={nameError}
        required
        autoFocus={!witness}
      />
      <TextField
        label={t("witnesses.form.fields.phone")}
        value={phone}
        onChange={setPhone}
        type="tel"
        inputMode="tel"
      />
      <TextField
        label={t("witnesses.form.fields.forWhom")}
        value={forWhom}
        onChange={setForWhom}
        placeholder={t("witnesses.form.placeholders.forWhom")}
      />
      <div className="flex flex-col gap-1.5">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink-strong">
          <Checkbox checked={dni} onCheckedChange={(v) => setDni(v === true)} className={CHECKBOX} />
          {t("witnesses.dniDelivered")}
        </label>
        <p className="text-sm text-ink-muted">{t("witnesses.form.dniHint")}</p>
      </div>
    </FormFrame>
  );
}
