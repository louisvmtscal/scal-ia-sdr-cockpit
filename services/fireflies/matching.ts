import "server-only";

import { addDays, subDays } from "date-fns";

import type { RendezVous } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import type { FirefliesMeeting } from "./types";

const FENETRE_JOURS = 3;

export type ResultatMatching =
  | { issue: "FIABLE"; rendezVousId: string }
  | { issue: "A_VERIFIER"; rendezVousId: string }
  | { issue: "AUCUNE" };

function normaliserEmail(email: string | null | undefined): string | null {
  const trimme = email?.toLowerCase().trim();
  return trimme ? trimme : null;
}

function candidatLePlusProche(candidats: RendezVous[], date: Date): RendezVous {
  return candidats.reduce((plusProche, candidat) =>
    Math.abs(candidat.dateRDV.getTime() - date.getTime()) <
    Math.abs(plusProche.dateRDV.getTime() - date.getTime())
      ? candidat
      : plusProche,
  );
}

function normaliserTexte(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Seuil arbitraire mais utile : une société nommée sur 4 caractères ou moins
// ("API", "SAS") est trop générique pour servir de signal seule.
const SOCIETE_MIN_LONGUEUR_SIGNAL = 5;

/**
 * Un seul candidat désigné par le titre de la réunion — soit par son prénom
 * ET son nom ("RDV Pierre Pascal (Sofise) X Scal-ia"), soit par sa société
 * seule quand celle-ci est assez spécifique ("RDV L'Agence 123 X Scal-ia",
 * où Fireflies n'a conservé que le nom de société). Utilisé uniquement en
 * dernier recours, et uniquement pour proposer un rapprochement "à
 * vérifier", jamais fiable : voir note sur `meeting_attendees` ci-dessous.
 */
function candidatSuggereParTitre(candidats: RendezVous[], titre: string): RendezVous | null {
  const titreNormalise = normaliserTexte(titre);

  const correspondants = candidats.filter((c) => {
    const prenom = normaliserTexte(c.prenom || "");
    const nom = normaliserTexte(c.nom || "");
    const parNomComplet = Boolean(prenom) && Boolean(nom) && titreNormalise.includes(prenom) && titreNormalise.includes(nom);

    const societe = normaliserTexte(c.societe || "");
    const parSociete = societe.length >= SOCIETE_MIN_LONGUEUR_SIGNAL && titreNormalise.includes(societe);

    return parNomComplet || parSociete;
  });

  return correspondants.length === 1 ? correspondants[0] : null;
}

/**
 * Rattache une réunion Fireflies à un RDV existant, par ordre de priorité :
 * 1. Identifiant de calendrier commun (`calendarId` Fireflies vs `calendarEventId`
 *    du RDV) — en pratique quasi toujours absent côté Fireflies à ce jour
 *    (vérifié sur des transcriptions réelles le 2026-10-12), mais vérifié en
 *    premier dès qu'il est disponible.
 * 2. Email normalisé du prospect retrouvé parmi les participants Fireflies —
 *    la date ne sert alors qu'à départager plusieurs RDV du même prospect
 *    dans la fenêtre (jamais à elle seule un critère suffisant).
 * 3. Constat réel (testé le 2026-10-12 sur ce compte) : Fireflies ne renseigne
 *    quasiment jamais `meeting_attendees`/`participants` pour ces réunions
 *    (coquille vide ou juste notre propre adresse) — seul le titre contient le
 *    nom du prospect ou sa société ("RDV Pierre Pascal (Sofise) X Scal-ia").
 *    Si le titre désigne un candidat unique de la fenêtre, on le propose "à
 *    vérifier" — jamais fiable, jamais de compte rendu généré automatiquement
 *    tant que quelqu'un n'a pas confirmé que c'est le bon rendez-vous.
 * Pas de dernier recours "un seul candidat dans la fenêtre, sans aucun autre
 * signal" : testé en conditions réelles, cette règle a produit un faux
 * rapprochement (un transcript "Connexion Lemlist" sans rapport, associé au
 * seul RDV qui se trouvait dans sa fenêtre de ±3 jours). Sans signal du tout,
 * le transcript reste "sans correspondance" plutôt que risquer une suggestion
 * trompeuse, même simplement "à vérifier".
 * Le nom du prospect n'est donc utilisé (via le titre) qu'à titre de
 * suggestion à confirmer manuellement — jamais pour valider un rapprochement
 * automatiquement.
 */
export async function trouverCorrespondance(
  meeting: FirefliesMeeting,
  meetingDate: Date,
): Promise<ResultatMatching> {
  const candidats = await prisma.rendezVous.findMany({
    where: {
      firefliesMeetingId: null,
      dateRDV: { gte: subDays(meetingDate, FENETRE_JOURS), lte: addDays(meetingDate, FENETRE_JOURS) },
    },
  });

  if (candidats.length === 0) {
    return { issue: "AUCUNE" };
  }

  if (meeting.calendarId) {
    const parCalendrier = candidats.find((c) => c.calendarEventId === meeting.calendarId);
    if (parCalendrier) {
      return { issue: "FIABLE", rendezVousId: parCalendrier.id };
    }
  }

  const emailsParticipants = new Set(
    meeting.attendees
      .map((a) => normaliserEmail(a.email))
      .filter((email): email is string => Boolean(email)),
  );

  if (emailsParticipants.size > 0) {
    const parEmail = candidats.filter((c) => {
      const email = normaliserEmail(c.email);
      return email !== null && emailsParticipants.has(email);
    });
    if (parEmail.length > 0) {
      const choisi = parEmail.length === 1 ? parEmail[0] : candidatLePlusProche(parEmail, meetingDate);
      return { issue: "FIABLE", rendezVousId: choisi.id };
    }
  }

  // Aucun email exploitable : le titre de la réunion suggère-t-il un candidat
  // unique (nom complet ou société) ? Reste "à vérifier" dans tous les cas.
  // Sans ce signal non plus, on n'invente rien : "aucune correspondance".
  const suggerePartTitre = candidatSuggereParTitre(candidats, meeting.title);
  if (suggerePartTitre) {
    return { issue: "A_VERIFIER", rendezVousId: suggerePartTitre.id };
  }

  return { issue: "AUCUNE" };
}
