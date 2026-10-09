import ical from "node-ical";
import type { Attendee, CalendarComponent } from "node-ical";

import { prisma } from "@/lib/prisma";

/** On ignore les événements antérieurs à cet horizon (perf + évite de reprendre l'historique perso). */
const HORIZON_JOURS_PASSES = 31;

/** Les propriétés iCal sont soit une string brute, soit {val, params} dès qu'il y a des paramètres. */
function valeur(prop: unknown): string {
  if (prop == null) return "";
  if (typeof prop === "string") return prop;
  if (typeof prop === "object" && "val" in prop) return String((prop as { val: unknown }).val ?? "");
  return "";
}

function sansMailto(adresse: string): string {
  return adresse.replace(/^mailto:/i, "").trim();
}

function listeParticipants(attendee: Attendee[] | Attendee | undefined): Attendee[] {
  if (!attendee) return [];
  return Array.isArray(attendee) ? attendee : [attendee];
}

/** Premier participant externe (hors domaine scal-ia.fr) — le prospect, pas l'hôte interne. */
function trouverProspect(event: CalendarComponent & { attendee?: Attendee[] | Attendee }) {
  for (const participant of listeParticipants(event.attendee)) {
    const email = sansMailto(valeur(participant)).toLowerCase();
    if (email && !email.endsWith("@scal-ia.fr")) {
      const cn = typeof participant === "string" ? "" : (participant.params?.CN ?? "");
      return { email, cn };
    }
  }
  return null;
}

export type CalendarSyncResult = {
  evenementsLus: number;
  crees: number;
  misAJour: number;
  inchanges: number;
  ignores: Array<{ titre: string; raison: string }>;
};

/**
 * Synchronise le flux iCal (Google Calendar) vers RendezVous. Ne traite que
 * les événements créés par le lien de prise de RDV HubSpot (reconnus via les
 * liens de replanification/annulation HubSpot dans la description) — jamais
 * les événements personnels ou les RDV encore saisis à la main. Additif et
 * correctif uniquement, jamais destructif, comme la sync Google Sheet
 * qu'elle remplace.
 */
export async function syncRendezVousFromCalendar(): Promise<CalendarSyncResult> {
  const url = process.env.RDV_CALENDAR_ICAL_URL;
  if (!url) {
    throw new Error("RDV_CALENDAR_ICAL_URL manquante.");
  }

  const commercial = await prisma.user.findUniqueOrThrow({ where: { email: "louis@scal-ia.fr" } });
  const horizon = new Date();
  horizon.setDate(horizon.getDate() - HORIZON_JOURS_PASSES);

  const events = await ical.async.fromURL(url);
  const existants = await prisma.rendezVous.findMany({
    where: { calendarEventId: { not: null } },
  });
  const existantParUid = new Map(existants.map((r) => [r.calendarEventId, r]));

  let evenementsLus = 0;
  let crees = 0;
  let misAJour = 0;
  let inchanges = 0;
  const ignores: CalendarSyncResult["ignores"] = [];

  for (const composant of Object.values(events)) {
    if (!composant || composant.type !== "VEVENT") continue;
    evenementsLus++;

    const titre = valeur(composant.summary) || "(sans titre)";
    const description = valeur(composant.description);

    if (!description.includes("hubspot.com/meetings")) {
      continue; // pas un RDV pris via le lien de prise de RDV HubSpot — on ignore sans bruit
    }

    if (!composant.start || composant.start < horizon) continue;

    const prospect = trouverProspect(composant);
    if (!prospect) {
      ignores.push({ titre, raison: "aucun participant externe identifié" });
      continue;
    }

    const [prenom, ...resteNom] = (prospect.cn || prospect.email.split("@")[0]).split(" ");
    const nom = resteNom.join(" ") || "?";
    const societe = prospect.email.split("@")[1] || "?";
    const honore = composant.status === "CANCELLED" ? "NON" : "EN_ATTENTE";
    const dateRDV = composant.start;

    const existant = existantParUid.get(composant.uid);

    if (existant) {
      const miseAJourNecessaire =
        existant.dateRDV.getTime() !== dateRDV.getTime() || existant.honore !== honore;

      if (miseAJourNecessaire) {
        await prisma.rendezVous.update({
          where: { id: existant.id },
          data: { dateRDV, honore },
        });
        misAJour++;
      } else {
        inchanges++;
      }
      continue;
    }

    await prisma.rendezVous.create({
      data: {
        commercialId: commercial.id,
        origine: "OUTBOUND",
        nom,
        prenom,
        societe,
        email: prospect.email,
        dateRDV,
        honore,
        calendarEventId: composant.uid,
        digestAgatheEnvoye: false,
      },
    });
    crees++;
  }

  return { evenementsLus, crees, misAJour, inchanges, ignores };
}
