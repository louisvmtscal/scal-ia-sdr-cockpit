import "server-only";

import { prisma } from "@/lib/prisma";

import { declencherCompteRenduAutomatique } from "./auto-compte-rendu";
import { getTranscript } from "./meetings";
import { trouverCorrespondance } from "./matching";

/**
 * Traite une transcription Fireflies terminée : retrouve le rendez-vous
 * correspondant (voir `trouverCorrespondance`), lie la réunion et déclenche
 * la génération automatique du compte rendu si le rapprochement est fiable.
 * Un rapprochement "à vérifier" est quand même enregistré (pour apparaître
 * dans la fiche RDV avec un badge) mais ne déclenche jamais de compte rendu
 * automatique tant qu'un humain ne l'a pas confirmé.
 */
export async function traiterTranscriptionFireflies(meetingId: string) {
  const dejaTraite = await prisma.rendezVous.findUnique({
    where: { firefliesMeetingId: meetingId },
  });

  if (dejaTraite) {
    // Rejeu du webhook (retry Fireflies) : déjà traité, on ignore.
    return;
  }

  const transcript = await getTranscript(meetingId);
  const meetingDate = transcript.meeting.date ?? new Date();

  const resultat = await trouverCorrespondance(transcript.meeting, meetingDate);

  if (resultat.issue === "AUCUNE") {
    console.warn(
      `[fireflies] Aucun rendez-vous correspondant pour la transcription ${meetingId} ("${transcript.meeting.title}"). Traitement manuel requis.`,
    );
    return;
  }

  await prisma.rendezVous.update({
    where: { id: resultat.rendezVousId },
    data: {
      firefliesMeetingId: meetingId,
      firefliesMeetingTitle: transcript.meeting.title,
      firefliesMeetingDate: transcript.meeting.date,
      firefliesMeetingUrl: transcript.meeting.transcriptUrl,
      firefliesMatchConfiance: resultat.issue,
      firefliesLastSyncAt: new Date(),
      firefliesSyncError: null,
    },
  });

  if (resultat.issue === "FIABLE") {
    await declencherCompteRenduAutomatique(resultat.rendezVousId, transcript);
  }
}
