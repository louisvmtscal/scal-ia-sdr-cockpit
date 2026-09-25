import type { HonoreStatus } from "@/lib/generated/prisma/enums";

/**
 * Étapes du pipeline Kanban RDV. "Lost" est à part : c'est un simple
 * indicateur "retiré du pipe", il ne touche jamais honore/qualifie/r2/deal
 * (préservés tels quels pour pouvoir récupérer la carte plus tard).
 */
export type KanbanColumnId =
  | "EN_ATTENTE"
  | "A_REPLACER"
  | "HONORE"
  | "QUALIFIE"
  | "R2"
  | "DEAL_CLOTURE"
  | "LOST";

export type PipelineFields = {
  honore: HonoreStatus;
  qualifie: boolean;
  r2EnAttente: boolean;
  dealCloture: boolean;
};

export type PipelineRow = PipelineFields & { lost: boolean };

/** Colonnes du pipe actif — tout sauf "Lost", qui est gérée à part (voir columnIdFor / actions). */
export const KANBAN_COLUMNS: {
  id: Exclude<KanbanColumnId, "LOST">;
  label: string;
  toneClass: string;
  fields: PipelineFields;
}[] = [
  {
    id: "EN_ATTENTE",
    label: "En attente",
    toneClass: "",
    fields: { honore: "EN_ATTENTE", qualifie: false, r2EnAttente: false, dealCloture: false },
  },
  {
    id: "A_REPLACER",
    label: "À replacer",
    toneClass: "border-t-orange-400",
    fields: { honore: "A_REPLACER", qualifie: false, r2EnAttente: false, dealCloture: false },
  },
  {
    id: "HONORE",
    label: "Honoré",
    toneClass: "",
    fields: { honore: "OUI", qualifie: false, r2EnAttente: false, dealCloture: false },
  },
  {
    id: "QUALIFIE",
    label: "Qualifié",
    toneClass: "border-t-green-400",
    fields: { honore: "OUI", qualifie: true, r2EnAttente: false, dealCloture: false },
  },
  {
    id: "R2",
    label: "R2 en attente",
    toneClass: "border-t-blue-400",
    fields: { honore: "OUI", qualifie: true, r2EnAttente: true, dealCloture: false },
  },
  {
    id: "DEAL_CLOTURE",
    label: "Deal closé 🏆",
    toneClass: "border-t-amber-400",
    fields: { honore: "OUI", qualifie: true, r2EnAttente: false, dealCloture: true },
  },
];

/** L'ancien statut "Non honoré" est déprécié (voir migration) : traité comme "À replacer". */
export function columnIdFor(row: PipelineRow): KanbanColumnId {
  if (row.lost) return "LOST";
  if (row.dealCloture) return "DEAL_CLOTURE";
  if (row.r2EnAttente) return "R2";
  if (row.honore === "EN_ATTENTE") return "EN_ATTENTE";
  if (row.honore === "A_REPLACER" || row.honore === "NON") return "A_REPLACER";
  if (row.honore === "OUI" && row.qualifie) return "QUALIFIE";
  return "HONORE";
}
