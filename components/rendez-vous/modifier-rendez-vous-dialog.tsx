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
import type { RendezVous } from "@/lib/generated/prisma/client";

export function ModifierRendezVousDialog({ rendezVous }: { rendezVous: RendezVous }) {
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
        <RendezVousForm rendezVous={rendezVous} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
