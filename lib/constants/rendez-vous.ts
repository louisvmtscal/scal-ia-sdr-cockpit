import type { Commercial, Origine } from "@/lib/generated/prisma/enums";

export const COMMERCIAL_LABELS: Record<Commercial, string> = {
  LOUIS: "Louis",
  CHLOE: "Chloé",
};

export const ORIGINE_LABELS: Record<Origine, string> = {
  INBOUND: "Inbound",
  OUTBOUND: "Outbound",
};

/** 1 rendez-vous qualifié = 31 200 € d'ARR potentiel. */
export const ARR_POTENTIEL_PAR_RDV_QUALIFIE = 31_200;
