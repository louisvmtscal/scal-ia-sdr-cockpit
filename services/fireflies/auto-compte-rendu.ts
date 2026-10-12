import "server-only";

import { prisma } from "@/lib/prisma";
import { genererEtEnregistrerCompteRendu } from "@/services/compte-rendu";

import { transcriptToText } from "./meetings";
import type { FirefliesFullTranscript } from "./types";

/**
 * Déclenche la génération automatique du compte rendu IA juste après un
 * rapprochement FIABLE — jamais pour un rapprochement "à vérifier" : on ne
 * génère pas de synthèse commerciale tant que le bon prospect n'est pas confirmé.
 *
 * Toute erreur (clé Anthropic manquante, transcript vide, appel Claude en
 * échec) est capturée et journalisée sur le RDV lui-même (`compteRenduStatus`
 * = ECHEC) plutôt que de remonter et casser l'appelant (webhook Fireflies ou
 * synchro quotidienne) — un transcript correctement associé mais dont le
 * résumé a échoué reste visible, régénérable manuellement depuis la fiche RDV.
 */
export async function declencherCompteRenduAutomatique(
  rendezVousId: string,
  transcript: FirefliesFullTranscript,
): Promise<void> {
  if (transcript.sentences.length === 0) {
    // Pas de contenu exploitable pour l'instant (transcription pas encore prête côté
    // Fireflies) : on laisse le statut EN_ATTENTE, une génération manuelle restera
    // possible depuis la fiche RDV dès que la transcription sera disponible.
    return;
  }

  try {
    await genererEtEnregistrerCompteRendu(rendezVousId, transcriptToText(transcript));
    await prisma.rendezVous.update({
      where: { id: rendezVousId },
      data: { compteRenduStatus: "GENERE" },
    });
  } catch (error) {
    console.error(`[fireflies] Échec génération auto du compte rendu pour ${rendezVousId} :`, error);
    await prisma.rendezVous.update({
      where: { id: rendezVousId },
      data: { compteRenduStatus: "ECHEC" },
    });
  }
}
