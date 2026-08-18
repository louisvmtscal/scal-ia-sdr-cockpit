"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import {
  FirefliesApiError,
  getTranscript,
  searchMeetings,
  type FirefliesFullTranscript,
  type FirefliesMeeting,
} from "@/services/fireflies";

function messageErreurFireflies(error: unknown): string {
  if (error instanceof FirefliesApiError) {
    switch (error.code) {
      case "MISSING_API_KEY":
        return "Clé API Fireflies manquante. Configure FIREFLIES_API_KEY dans .env.";
      case "UNAUTHORIZED":
        return "Clé API Fireflies invalide ou refusée par Fireflies.";
      case "NOT_FOUND":
        return "Réunion Fireflies introuvable.";
      case "TIMEOUT":
        return "Fireflies n'a pas répondu à temps. Réessaie dans un instant.";
      case "RATE_LIMITED":
        return "Limite de requêtes Fireflies atteinte. Réessaie dans quelques minutes.";
      case "NETWORK_ERROR":
        return "Impossible de joindre Fireflies pour le moment.";
      case "GRAPHQL_ERROR":
        return error.message;
      default:
        return "Une erreur Fireflies inattendue est survenue.";
    }
  }
  console.error("Erreur Fireflies inattendue :", error);
  return "Une erreur inattendue est survenue.";
}

export type RechercherReunionsResult =
  | { success: true; meetings: FirefliesMeeting[] }
  | { error: string };

export async function rechercherReunionsFirefliesAction(
  query: string,
): Promise<RechercherReunionsResult> {
  if (!query.trim()) {
    return { error: "Merci de saisir un terme de recherche." };
  }

  try {
    const meetings = await searchMeetings(query.trim());
    return { success: true, meetings };
  } catch (error) {
    return { error: messageErreurFireflies(error) };
  }
}

export type GetTranscriptionResult =
  | { success: true; transcript: FirefliesFullTranscript }
  | { error: string };

export async function getTranscriptionFirefliesAction(
  meetingId: string,
): Promise<GetTranscriptionResult> {
  try {
    const transcript = await getTranscript(meetingId);
    return { success: true, transcript };
  } catch (error) {
    return { error: messageErreurFireflies(error) };
  }
}

async function lierReunion(rendezVousId: string, meeting: FirefliesMeeting) {
  await prisma.rendezVous.update({
    where: { id: rendezVousId },
    data: {
      firefliesMeetingId: meeting.id,
      firefliesMeetingTitle: meeting.title,
      firefliesMeetingDate: meeting.date,
      firefliesMeetingUrl: meeting.transcriptUrl,
    },
  });
  revalidatePath("/rendez-vous");
}

/**
 * Sélectionne une réunion pour ce rendez-vous : récupère sa transcription et
 * l'enregistre (firefliesMeetingId/Title/Date/Url) pour la retrouver plus
 * tard sans refaire de recherche.
 */
export async function selectionnerReunionFirefliesAction(
  rendezVousId: string,
  meetingId: string,
): Promise<GetTranscriptionResult> {
  try {
    const transcript = await getTranscript(meetingId);
    await lierReunion(rendezVousId, transcript.meeting);
    return { success: true, transcript };
  } catch (error) {
    return { error: messageErreurFireflies(error) };
  }
}
