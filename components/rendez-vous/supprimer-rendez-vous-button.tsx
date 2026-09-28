"use client";

import { Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Suppression immédiate, sans confirmation bloquante — le filet de sécurité
 * est le toast "Annulé ?" affiché par l'appelant (voir handleDelete dans
 * RendezVousTable), pas une boîte de dialogue avant coup.
 */
export function SupprimerRendezVousButton({ onDelete }: { onDelete: () => void }) {
  return (
    <Button variant="ghost" size="icon-sm" onClick={onDelete}>
      <Trash2Icon />
      <span className="sr-only">Supprimer</span>
    </Button>
  );
}
