import type { HonoreStatus, Origine } from "@/lib/generated/prisma/enums";

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

/** Montant de la prime SDR par rendez-vous, selon son origine. */
export const PRIME_PAR_ORIGINE: Record<Origine, number> = {
  OUTBOUND: 50,
  INBOUND: 25,
};
