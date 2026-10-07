"use client";

import { usePlanContext } from "@/lib/context/plan-context";
import { MembersList } from "@/components/members/members-list";
import { InviteDialog } from "@/components/members/invite-dialog";

export default function MembersPage() {
  const { planId, plan } = usePlanContext();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Miembros</h2>
        {plan && <InviteDialog planId={planId} planTitle={plan.title} />}
      </div>
      <p className="text-sm text-muted-foreground">
        Invita a tu pareja o a tu wedding planner para que puedan ver y editar este plan
        contigo.
      </p>
      <MembersList planId={planId} />
    </div>
  );
}
