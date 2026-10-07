"use client";

import { Loader2 } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useCollection } from "@/lib/hooks/use-collection";
import { membersQuery, mapMember } from "@/lib/firebase/plans";
import { pendingInvitesQuery, mapInvite } from "@/lib/firebase/invites";
import { initials } from "@/lib/utils";
import type { PlanRole } from "@/lib/types";

const ROLE_LABEL: Record<PlanRole, string> = {
  owner: "Dueño/a",
  partner: "Pareja",
  planner: "Wedding planner",
};

export function MembersList({ planId }: { planId: string }) {
  const { data: members, loading } = useCollection(membersQuery(planId), mapMember);
  const { data: invites, loading: loadingInvites } = useCollection(
    pendingInvitesQuery(planId),
    mapInvite
  );

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {members.map((member) => (
          <div key={member.userId} className="flex items-center gap-3 rounded-lg border bg-card p-3">
            <Avatar>
              <AvatarFallback>{initials(member.invitedEmail || member.userId)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
              <p className="truncate text-sm font-medium">{member.invitedEmail || member.userId}</p>
            </div>
            <Badge variant="secondary">{ROLE_LABEL[member.role]}</Badge>
          </div>
        ))}
      </div>

      {!loadingInvites && invites.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            Invitaciones pendientes
          </p>
          <div className="flex flex-col gap-2">
            {invites.map((invite) => (
              <div
                key={invite.token}
                className="flex items-center justify-between rounded-lg border border-dashed p-3 text-sm"
              >
                <span>{invite.email}</span>
                <Badge variant="outline">{ROLE_LABEL[invite.role]}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
