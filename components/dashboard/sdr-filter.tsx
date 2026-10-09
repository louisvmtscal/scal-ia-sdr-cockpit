"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TeamMember } from "@/lib/team";

const TOUS = "tous";

/** Filtre SDR affiché uniquement pour admin/manager — un SDR reste toujours cantonné à ses propres RDV. */
export function SdrFilter({
  teamMembers,
  current,
}: {
  teamMembers: TeamMember[];
  current?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = current ?? TOUS;

  function handleChange(value: string | null) {
    if (!value) return;
    const next = new URLSearchParams(searchParams.toString());
    if (value === TOUS) next.delete("commercial");
    else next.set("commercial", value);
    router.push(`${pathname}?${next.toString()}`);
  }

  const labelParId = new Map(teamMembers.map((m) => [m.id, m.name ?? m.email]));

  return (
    <Select value={selected} onValueChange={handleChange}>
      <SelectTrigger className="w-48">
        <SelectValue>{(value: string) => (value === TOUS ? "Tous les SDR" : labelParId.get(value))}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={TOUS}>Tous les SDR</SelectItem>
        {teamMembers.map((member) => (
          <SelectItem key={member.id} value={member.id}>
            {member.name ?? member.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
