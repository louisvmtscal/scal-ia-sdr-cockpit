import "server-only";

import { subDays } from "date-fns";

import { prisma } from "@/lib/prisma";

import { declencherCompteRenduAutomatique } from "./auto-compte-rendu";
import { avecNouvellesTentatives, FirefliesApiError } from "./client";
import { trouverCorrespondance } from "./matching";
import { getTranscript, listTranscripts } from "./meetings";
import type { FirefliesMeeting } from "./types";

// Rattrape les transcriptions publiées en retard ou un éventuel webhook manqué
// (le webhook temps réel reste le chemin normal — voir services/fireflies/webhook.ts).
const FENETRE_RATTRAPAGE_JOURS = 7;

export type SynchroFirefliesResultat = {
  transcriptsRecuperes: number;
  associesFiable: number;
  aVerifier: number;
  sansCorrespondance: number;
  dejaTraites: number;
  erreurs: Array<{ meetingId: string; titre: string; message: string }>;
};

async function traiterUneReunion(
  meeting: FirefliesMeeting,
  maintenant: Date,
  resultat: SynchroFirefliesResultat,
): Promise<void> {
  let rendezVousIdTraite: string | null = null;

  try {
    const meetingDate = meeting.date ?? maintenant;
    const correspondance = await trouverCorrespondance(meeting, meetingDate);

    if (correspondance.issue === "AUCUNE") {
      resultat.sansCorrespondance += 1;
      return;
    }

    rendezVousIdTraite = correspondance.rendezVousId;

    await prisma.rendezVous.update({
      where: { id: correspondance.rendezVousId },
      data: {
        firefliesMeetingId: meeting.id,
        firefliesMeetingTitle: meeting.title,
        firefliesMeetingDate: meeting.date,
        firefliesMeetingUrl: meeting.transcriptUrl,
        firefliesMatchConfiance: correspondance.issue,
        firefliesLastSyncAt: maintenant,
        firefliesSyncError: null,
      },
    });

    if (correspondance.issue === "FIABLE") {
      resultat.associesFiable += 1;
      const transcript = await avecNouvellesTentatives(() => getTranscript(meeting.id));
      await declencherCompteRenduAutomatique(correspondance.rendezVousId, transcript);
    } else {
      resultat.aVerifier += 1;
    }
  } catch (error) {
    const message =
      error instanceof FirefliesApiError ? error.message : "Erreur inattendue lors de la synchro.";
    resultat.erreurs.push({ meetingId: meeting.id, titre: meeting.title, message });
    console.error(`[fireflies] Erreur synchro pour ${meeting.id} ("${meeting.title}") :`, error);

    if (rendezVousIdTraite) {
      await prisma.rendezVous
        .update({ where: { id: rendezVousIdTraite }, data: { firefliesSyncError: message } })
        .catch(() => {
          // Une erreur secondaire en écrivant l'erreur ne doit jamais faire planter la synchro.
        });
    }
  }
}

/**
 * Synchro quotidienne Fireflies (voir app/api/cron/sync-fireflies/route.ts) :
 * récupère les réunions des `FENETRE_RATTRAPAGE_JOURS` derniers jours,
 * ignore celles déjà traitées (par ce job ou par le webhook temps réel),
 * matche chaque nouvelle réunion et déclenche le compte rendu si le
 * rapprochement est fiable. Idempotente : relancer deux fois ne crée jamais
 * de doublon (déduplication sur `firefliesMeetingId`, unique en base).
 */
export async function synchroniserFireflies(
  options?: { fromDate?: Date },
): Promise<SynchroFirefliesResultat> {
  const maintenant = new Date();
  const fromDate = options?.fromDate ?? subDays(maintenant, FENETRE_RATTRAPAGE_JOURS);

  const resultat: SynchroFirefliesResultat = {
    transcriptsRecuperes: 0,
    associesFiable: 0,
    aVerifier: 0,
    sansCorrespondance: 0,
    dejaTraites: 0,
    erreurs: [],
  };

  let meetings: FirefliesMeeting[];
  try {
    meetings = await avecNouvellesTentatives(() => listTranscripts(fromDate, maintenant));
  } catch (error) {
    resultat.erreurs.push({
      meetingId: "N/A",
      titre: "Listing Fireflies",
      message: error instanceof FirefliesApiError ? error.message : "Erreur inconnue lors du listing.",
    });
    return resultat;
  }

  resultat.transcriptsRecuperes = meetings.length;

  const dejaTraites = await prisma.rendezVous.findMany({
    where: { firefliesMeetingId: { in: meetings.map((m) => m.id) } },
    select: { firefliesMeetingId: true },
  });
  const idsDejaTraites = new Set(dejaTraites.map((r) => r.firefliesMeetingId));

  for (const meeting of meetings) {
    if (idsDejaTraites.has(meeting.id)) {
      resultat.dejaTraites += 1;
      continue;
    }
    await traiterUneReunion(meeting, maintenant, resultat);
  }

  return resultat;
}
