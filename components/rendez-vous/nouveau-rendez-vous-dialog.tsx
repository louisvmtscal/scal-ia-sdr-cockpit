"use client";

import { PlusIcon } from "lucide-react";
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

export function NouveauRendezVousDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <PlusIcon />
            Nouveau RDV
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un rendez-vous</DialogTitle>
        </DialogHeader>
        <RendezVousForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
