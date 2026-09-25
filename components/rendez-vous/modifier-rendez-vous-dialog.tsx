"use client";

import { PencilIcon } from "lucide-react";
import { useState } from "react";

import { RendezVousForm } from "@/components/rendez-vous/rendez-vous-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Role } from "@/lib/generated/prisma/enums";
import type { TeamMember } from "@/lib/team";

import type { RendezVousAvecCommercial } from "./rendez-vous-table";

export function ModifierRendezVousDialog({
  rendezVous,
  teamMembers,
  currentUser,
}: {
  rendezVous: RendezVousAvecCommercial;
  teamMembers: TeamMember[];
  currentUser: { id: string; role: Role };
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm">
            <PencilIcon />
            <span className="sr-only">Modifier</span>
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier le rendez-vous</DialogTitle>
        </DialogHeader>
        <RendezVousForm
          rendezVous={rendezVous}
          teamMembers={teamMembers}
          currentUser={currentUser}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
