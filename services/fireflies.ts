import { addDays, subDays } from "date-fns";

import { getFirefliesTranscript, transcriptToText } from "@/integrations/fireflies";
import type { RendezVous } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { genererEtEnregistrerCompteRendu } from "@/services/compte-rendu";
import type { FirefliesTranscript } from "@/integrations/fireflies";

/**
 * Fait correspondre une transcription Fireflies à un rendez-vous existant.
 * Priorité à l'email des participants (fiable) ; à défaut, correspondance sur
 * le nom du contact parmi les rendez-vous proches de la date de la réunion
 * (nos données actuelles n'incluent pas toujours l'email du contact).
 */
async function trouverRendezVousCorrespondant(
  transcript: FirefliesTranscript,
  meetingDate: Date,
): Promise<RendezVous | null> {
  const candidats = await prisma.rendezVous.findMany({
    where: {
      firefliesMeetingId: null,
      dateRDV: { gte: subDays(meetingDate, 3), lte: addDays(meetingDate, 3) },
    },
  });

  const attendeeEmails = transcript.meetingAttendees
    .map((a) => a.email?.toLowerCase().trim())
    .filter((email): email is string => Boolean(email));

  const attendeeNames = transcript.meetingAttendees
    .map((a) => (a.displayName ?? a.name ?? "").toLowerCase().trim())
    .filter(Boolean);

  let meilleur: { rendezVous: RendezVous; score: number } | null = null;

  for (const rdv of candidats) {
    let score = 0;

    if (rdv.email && attendeeEmails.includes(rdv.email.toLowerCase())) {
      score += 10;
    }

    const nomComplet = `${rdv.prenom} ${rdv.nom}`.toLowerCase();
    const nomInverse = `${rdv.nom} ${rdv.prenom}`.toLowerCase();
    const correspondNom = attendeeNames.some(
      (nom) => nom.includes(nomComplet) || nom.includes(nomInverse) || nomComplet.includes(nom),
    );
    if (correspondNom) {
      score += 5;
    }

    if (score > 0 && (!meilleur || score > meilleur.score)) {
      meilleur = { rendezVous: rdv, score };
    }
  }

  return meilleur?.rendezVous ?? null;
}

/**
 * Traite une transcription Fireflies terminée : retrouve le rendez-vous
 * concerné, génère le compte rendu IA et l'enregistre (l'envoi par email à la
 * CEO est géré par `genererEtEnregistrerCompteRendu`).
 */
export async function traiterTranscriptionFireflies(meetingId: string) {
  const dejaTraite = await prisma.rendezVous.findUnique({
    where: { firefliesMeetingId: meetingId },
  });

  if (dejaTraite) {
    // Rejeu du webhook (retry Fireflies) : déjà traité, on ignore.
    return;
  }

  const transcript = await getFirefliesTranscript(meetingId);
  const meetingDate = new Date(transcript.dateString);

  const rendezVous = await trouverRendezVousCorrespondant(transcript, meetingDate);

  if (!rendezVous) {
    console.warn(
      `[fireflies] Aucun rendez-vous correspondant pour la transcription ${meetingId} ("${transcript.title}"). Traitement manuel requis.`,
    );
    return;
  }

  await prisma.rendezVous.update({
    where: { id: rendezVous.id },
    data: { firefliesMeetingId: meetingId },
  });

  const texteTranscription = transcriptToText(transcript);
  await genererEtEnregistrerCompteRendu(rendezVous.id, texteTranscription);
}
