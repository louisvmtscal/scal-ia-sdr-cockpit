import type { Commercial, HonoreStatus, Origine } from "@/lib/generated/prisma/enums";

export const COMMERCIAL_LABELS: Record<Commercial, string> = {
  LOUIS: "Louis",
  CHLOE: "Chloé",
};

export const ORIGINE_LABELS: Record<Origine, string> = {
  INBOUND: "Inbound",
  OUTBOUND: "Outbound",
};

export const HONORE_LABELS: Record<HonoreStatus, string> = {
  EN_ATTENTE: "En attente",
  OUI: "Oui",
  NON: "Non",
  A_REPLACER: "À replacer",
};

/** 1 rendez-vous qualifié = 31 200 € d'ARR potentiel. */
export const ARR_POTENTIEL_PAR_RDV_QUALIFIE = 31_200;

/** Montant de la prime SDR par rendez-vous, selon son origine. */
export const PRIME_PAR_ORIGINE: Record<Origine, number> = {
  OUTBOUND: 50,
  INBOUND: 25,
};
