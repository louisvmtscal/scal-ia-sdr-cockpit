"use client";

import { useState } from "react";

import { RendezVousKanban } from "@/components/rendez-vous/rendez-vous-kanban";
import { RendezVousTable, type RendezVousAvecCommercial } from "@/components/rendez-vous/rendez-vous-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Role } from "@/lib/generated/prisma/enums";
import type { TeamMember } from "@/lib/team";

export function RendezVousView({
  data,
  teamMembers,
  currentUser,
  isDev = false,
}: {
  data: RendezVousAvecCommercial[];
  teamMembers: TeamMember[];
  currentUser: { id: string; role: Role };
  isDev?: boolean;
}) {
  const [vue, setVue] = useState("tableau");

  return (
    <Tabs value={vue} onValueChange={(value) => setVue(String(value))}>
      <TabsList>
        <TabsTrigger value="tableau">Tableau</TabsTrigger>
        <TabsTrigger value="kanban">Kanban</TabsTrigger>
      </TabsList>
      <TabsContent value="tableau">
        <RendezVousTable
          data={data}
          teamMembers={teamMembers}
          currentUser={currentUser}
          isDev={isDev}
        />
      </TabsContent>
      <TabsContent value="kanban">
        <RendezVousKanban data={data} />
      </TabsContent>
    </Tabs>
  );
}
