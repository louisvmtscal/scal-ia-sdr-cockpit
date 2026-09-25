"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { updateUserRoleAction } from "@/actions/team";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Role } from "@/lib/generated/prisma/enums";
import type { TeamMemberWithRole } from "@/lib/team";

const VUE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  MANAGER: "Admin",
  SDR: "SDR",
};

export function TeamRoleTable({
  teamMembers,
  currentUserId,
}: {
  teamMembers: TeamMemberWithRole[];
  currentUserId: string;
}) {
  const [optimisticMembers, setOptimisticMembers] = useOptimistic(
    teamMembers,
    (state, patch: { id: string; role: Role }) =>
      state.map((member) => (member.id === patch.id ? { ...member, role: patch.role } : member)),
  );
  const [, startTransition] = useTransition();

  function handleChange(member: TeamMemberWithRole, role: Role) {
    const previousRole = member.role;
    startTransition(async () => {
      setOptimisticMembers({ id: member.id, role });
      const result = await updateUserRoleAction(member.id, role);
      if ("error" in result) {
        setOptimisticMembers({ id: member.id, role: previousRole });
        toast.error(result.error);
        return;
      }
      toast.success(`${member.name ?? member.email} est maintenant en vue ${VUE_LABELS[role]}.`);
    });
  }

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Membre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Vue</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {optimisticMembers.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium">
                {member.name ?? "—"}
                {member.id === currentUserId ? (
                  <span className="text-muted-foreground ml-2 text-xs">(toi)</span>
                ) : null}
              </TableCell>
              <TableCell className="text-muted-foreground">{member.email}</TableCell>
              <TableCell>
                <Select
                  value={member.role === "MANAGER" ? "ADMIN" : member.role}
                  onValueChange={(value) => handleChange(member, value as Role)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue>{(value: string) => VUE_LABELS[value as Role]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="SDR">SDR</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
