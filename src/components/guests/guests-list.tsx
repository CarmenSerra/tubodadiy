"use client";

import { Loader2, UsersIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { GuestFormDialog, EditGuestTrigger } from "@/components/guests/guest-form-dialog";
import { useCollection } from "@/lib/hooks/use-collection";
import { guestsQuery, mapGuest } from "@/lib/firebase/plans";
import { deleteGuest } from "@/lib/firebase/mutations";
import type { RsvpStatus } from "@/lib/types";

const RSVP_LABEL: Record<RsvpStatus, { label: string; variant: "secondary" | "success" | "destructive" }> = {
  pending: { label: "Pendiente", variant: "secondary" },
  confirmed: { label: "Confirmado", variant: "success" },
  declined: { label: "No asiste", variant: "destructive" },
};

export function GuestsList({ planId }: { planId: string }) {
  const { data: guests, loading } = useCollection(guestsQuery(planId), mapGuest);

  async function handleDelete(id: string) {
    try {
      await deleteGuest(planId, id);
      toast.success("Invitado eliminado");
    } catch {
      toast.error("No se ha podido eliminar el invitado.");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (guests.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <UsersIcon className="size-8 text-primary" />
        <p className="font-display text-lg">Todavía no hay invitados</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Añade a los invitados de tu boda para hacer seguimiento de su confirmación.
        </p>
        <GuestFormDialog planId={planId} />
      </div>
    );
  }

  const confirmed = guests.filter((g) => g.rsvpStatus === "confirmed").length;
  const withPlusOne = guests.filter((g) => g.rsvpStatus === "confirmed" && g.plusOne).length;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {guests.length} invitados · {confirmed} confirmados · {confirmed + withPlusOne} asistentes estimados
      </p>

      {/* Mobile: card list */}
      <div className="flex flex-col gap-3 md:hidden">
        {guests.map((guest) => (
          <div key={guest.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{guest.name}</p>
                <p className="text-xs text-muted-foreground">{guest.groupName || "Sin grupo"}</p>
              </div>
              <Badge variant={RSVP_LABEL[guest.rsvpStatus].variant}>
                {RSVP_LABEL[guest.rsvpStatus].label}
              </Badge>
            </div>
            {guest.plusOne && <p className="mt-1 text-xs text-muted-foreground">+1 acompañante</p>}
            {guest.dietaryNotes && (
              <p className="mt-1 text-xs text-muted-foreground">🍽 {guest.dietaryNotes}</p>
            )}
            <div className="mt-3 flex justify-end gap-1">
              <GuestFormDialog planId={planId} guest={guest} trigger={<EditGuestTrigger />} />
              <DeleteConfirmButton itemLabel={`a ${guest.name}`} onConfirm={() => handleDelete(guest.id)} />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Grupo</th>
              <th className="px-4 py-2 font-medium">RSVP</th>
              <th className="px-4 py-2 font-medium">+1</th>
              <th className="px-4 py-2 font-medium">Notas dietéticas</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {guests.map((guest) => (
              <tr key={guest.id}>
                <td className="px-4 py-2 font-medium">{guest.name}</td>
                <td className="px-4 py-2 text-muted-foreground">{guest.groupName || "—"}</td>
                <td className="px-4 py-2">
                  <Badge variant={RSVP_LABEL[guest.rsvpStatus].variant}>
                    {RSVP_LABEL[guest.rsvpStatus].label}
                  </Badge>
                </td>
                <td className="px-4 py-2 text-muted-foreground">{guest.plusOne ? "Sí" : "No"}</td>
                <td className="px-4 py-2 text-muted-foreground">{guest.dietaryNotes || "—"}</td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-1">
                    <GuestFormDialog planId={planId} guest={guest} trigger={<EditGuestTrigger />} />
                    <DeleteConfirmButton itemLabel={`a ${guest.name}`} onConfirm={() => handleDelete(guest.id)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
