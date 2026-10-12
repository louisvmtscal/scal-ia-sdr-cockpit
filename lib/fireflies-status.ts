import type { CompteRenduStatus, FirefliesMatchConfiance } from "@/lib/generated/prisma/enums";

export type FirefliesSyncStatus = "EN_ATTENTE" | "ASSOCIE" | "A_VERIFIER" | "ERREUR_SYNCHRONISATION";

/**
 * État de synchro affiché sur la fiche RDV — calculé à partir des champs bruts
 * plutôt que stocké séparément, pour n'avoir qu'une seule source de vérité.
 * Une erreur de synchro prime sur tout (même si un rapprochement existe déjà) :
 * elle signale que la dernière tentative (résumé le plus souvent) a échoué.
 */
export function getFirefliesSyncStatus(rendezVous: {
  firefliesMeetingId: string | null;
  firefliesMatchConfiance: FirefliesMatchConfiance | null;
  firefliesSyncError: string | null;
}): FirefliesSyncStatus {
  if (rendezVous.firefliesSyncError) {
    return "ERREUR_SYNCHRONISATION";
  }
  if (rendezVous.firefliesMeetingId && rendezVous.firefliesMatchConfiance === "A_VERIFIER") {
    return "A_VERIFIER";
  }
  if (rendezVous.firefliesMeetingId && rendezVous.firefliesMatchConfiance === "FIABLE") {
    return "ASSOCIE";
  }
  return "EN_ATTENTE";
}

export const FIREFLIES_STATUS_LABELS: Record<FirefliesSyncStatus, string> = {
  EN_ATTENTE: "En attente de transcript",
  ASSOCIE: "Transcript récupéré et associé",
  A_VERIFIER: "À vérifier",
  ERREUR_SYNCHRONISATION: "Erreur de synchronisation",
};

export const COMPTE_RENDU_STATUS_LABELS: Record<CompteRenduStatus, string> = {
  EN_ATTENTE: "Résumé en attente",
  GENERE: "Résumé généré",
  ECHEC: "Échec de génération",
};
