import "server-only";

import { addDays, subDays } from "date-fns";

import type { RendezVous } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import { getTranscript } from "./meetings";
import type { FirefliesFullTranscript } from "./types";

/**
 * Fait correspondre une transcription Fireflies à un rendez-vous existant.
 * Priorité à l'email des participants (fiable) ; à défaut, correspondance sur
 * le nom du contact parmi les rendez-vous proches de la date de la réunion
 * (nos données actuelles n'incluent pas toujours l'email du contact).
 */
async function trouverRendezVousCorrespondant(
  transcript: FirefliesFullTranscript,
  meetingDate: Date,
): Promise<RendezVous | null> {
  const candidats = await prisma.rendezVous.findMany({
    where: {
      firefliesMeetingId: null,
      dateRDV: { gte: subDays(meetingDate, 3), lte: addDays(meetingDate, 3) },
    },
  });

  const attendeeEmails = transcript.meeting.attendees
    .map((a) => a.email?.toLowerCase().trim())
    .filter((email): email is string => Boolean(email));

  const attendeeNames = transcript.meeting.attendees
    .map((a) => (a.name ?? "").toLowerCase().trim())
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
 * correspondant et lie la réunion (id/titre/date/url) pour qu'elle apparaisse
 * directement dans le dialogue Fireflies, sans nouvelle recherche.
 *
 * Ne génère JAMAIS de compte rendu automatiquement : la génération reste
 * strictement manuelle, à l'initiative de l'utilisateur, via le bouton
 * "✨ Générer le compte rendu" dans le dialogue Fireflies.
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

  const rendezVous = await trouverRendezVousCorrespondant(transcript, meetingDate);

  if (!rendezVous) {
    console.warn(
      `[fireflies] Aucun rendez-vous correspondant pour la transcription ${meetingId} ("${transcript.meeting.title}"). Traitement manuel requis.`,
    );
    return;
  }

  await prisma.rendezVous.update({
    where: { id: rendezVous.id },
    data: {
      firefliesMeetingId: meetingId,
      firefliesMeetingTitle: transcript.meeting.title,
      firefliesMeetingDate: transcript.meeting.date,
      firefliesMeetingUrl: transcript.meeting.transcriptUrl,
    },
  });
}
