import "server-only";

import { subDays } from "date-fns";

import { prisma } from "@/lib/prisma";

const HUBSPOT_API_URL = "https://api.hubapi.com";
// Chloé Einhorn — seule à utiliser un lien de prise de RDV public HubSpot à ce
// jour (vérifié le 2026-10-13 : zéro résultat pour Louis sur les 30 derniers
// jours). Les RDV de Louis restent synchronisés depuis le Google Sheet.
const CHLOE_HUBSPOT_OWNER_ID = "437277916";
const FENETRE_RATTRAPAGE_JOURS = 7;
const RETRY_DELAYS_MS = [1000, 3000, 8000];

export type HubspotErrorCode = "MISSING_TOKEN" | "UNAUTHORIZED" | "RATE_LIMITED" | "NETWORK_ERROR";

export class HubspotApiError extends Error {
  code: HubspotErrorCode;
  constructor(code: HubspotErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "HubspotApiError";
  }
}

function attendre(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function hubspotFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    throw new HubspotApiError("MISSING_TOKEN", "HUBSPOT_ACCESS_TOKEN manquante.");
  }

  let derniereErreur: unknown;
  for (let tentative = 0; tentative <= RETRY_DELAYS_MS.length; tentative += 1) {
    try {
      const response = await fetch(`${HUBSPOT_API_URL}${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers },
      });

      if (response.status === 401 || response.status === 403) {
        throw new HubspotApiError("UNAUTHORIZED", "Jeton HubSpot invalide ou refusé.");
      }
      if (response.status === 429) {
        throw new HubspotApiError("RATE_LIMITED", "Limite de requêtes HubSpot atteinte.");
      }
      if (!response.ok) {
        throw new HubspotApiError("NETWORK_ERROR", `HubSpot a répondu ${response.status}.`);
      }
      return (await response.json()) as T;
    } catch (error) {
      derniereErreur = error;
      const estRetryable =
        error instanceof HubspotApiError && (error.code === "RATE_LIMITED" || error.code === "NETWORK_ERROR");
      if (!estRetryable || tentative === RETRY_DELAYS_MS.length) {
        throw error;
      }
      await attendre(RETRY_DELAYS_MS[tentative]);
    }
  }
  throw derniereErreur;
}

type HubspotMeeting = {
  id: string;
  properties: {
    hs_meeting_title: string | null;
    hs_meeting_start_time: string | null;
    hs_meeting_body: string | null;
    hs_i_cal_uid: string | null;
    hs_createdate: string | null;
  };
};

type MeetingsSearchResponse = {
  results: HubspotMeeting[];
  paging?: { next?: { after: string } };
};

/** Fenêtre glissante des RDV pris via un lien public HubSpot, propriétaire Chloé. */
async function listerReunionsRecentes(fromDate: Date): Promise<HubspotMeeting[]> {
  const meetings: HubspotMeeting[] = [];
  let after: string | undefined;

  for (;;) {
    const data = await hubspotFetch<MeetingsSearchResponse>("/crm/v3/objects/meetings/search", {
      method: "POST",
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              { propertyName: "hs_meeting_source", operator: "EQ", value: "MEETINGS_PUBLIC" },
              { propertyName: "hubspot_owner_id", operator: "EQ", value: CHLOE_HUBSPOT_OWNER_ID },
              { propertyName: "hs_createdate", operator: "GTE", value: String(fromDate.getTime()) },
            ],
          },
        ],
        sorts: [{ propertyName: "hs_createdate", direction: "ASCENDING" }],
        properties: ["hs_meeting_title", "hs_meeting_start_time", "hs_meeting_body", "hs_i_cal_uid", "hs_createdate"],
        limit: 100,
        ...(after ? { after } : {}),
      }),
    });

    meetings.push(...data.results);
    if (!data.paging?.next) break;
    after = data.paging.next.after;
  }

  return meetings;
}

type HubspotContact = {
  properties: { email: string | null; firstname: string | null; lastname: string | null; company: string | null };
};

/** Contact associé à une réunion (le prospect) — v3 search ne renvoie pas les associations, v4 dédié requis. */
async function trouverContactAssocie(meetingId: string): Promise<HubspotContact | null> {
  const associations = await hubspotFetch<{ results: Array<{ toObjectId: number }> }>(
    `/crm/v4/objects/meetings/${meetingId}/associations/contacts`,
  );
  const contactId = associations.results[0]?.toObjectId;
  if (!contactId) return null;

  return hubspotFetch<HubspotContact>(
    `/crm/v3/objects/contacts/${contactId}?properties=email,firstname,lastname,company`,
  );
}

/** Le champ "société" du formulaire de prise de RDV, plus fiable que la fiche contact HubSpot. */
function extraireSocieteDuCorps(body: string | null): string | null {
  if (!body) return null;
  const match = body.match(/Nom de l'entreprise\s*:\s*([^<\n]+)/i);
  return match ? match[1].trim() : null;
}

export type SynchroHubspotResultat = {
  reunionsLues: number;
  crees: number;
  misAJour: number;
  dejaImportees: number;
  ignorees: Array<{ meetingId: string; raison: string }>;
  erreurs: Array<{ meetingId: string; message: string }>;
};

/**
 * Synchro HubSpot -> RendezVous (voir app/api/cron/sync-hubspot/route.ts) :
 * récupère les RDV pris via le lien public de Chloé sur une fenêtre glissante,
 * ignore ceux déjà importés (dédoublonnage sur `hubspotMeetingId`, unique en
 * base), et pour les nouveaux, réutilise un RDV existant du Google Sheet si
 * un nom+date correspond (période de transition), sinon en crée un.
 */
export async function synchroniserHubspot(options?: { fromDate?: Date }): Promise<SynchroHubspotResultat> {
  const maintenant = new Date();
  const fromDate = options?.fromDate ?? subDays(maintenant, FENETRE_RATTRAPAGE_JOURS);

  const resultat: SynchroHubspotResultat = {
    reunionsLues: 0,
    crees: 0,
    misAJour: 0,
    dejaImportees: 0,
    ignorees: [],
    erreurs: [],
  };

  const meetings = await listerReunionsRecentes(fromDate);
  resultat.reunionsLues = meetings.length;

  if (meetings.length === 0) return resultat;

  const dejaImportes = await prisma.rendezVous.findMany({
    where: { hubspotMeetingId: { in: meetings.map((m) => m.id) } },
    select: { hubspotMeetingId: true },
  });
  const idsDejaImportes = new Set(dejaImportes.map((r) => r.hubspotMeetingId));

  const chloe = await prisma.user.findUniqueOrThrow({ where: { email: "chloe@scal-ia.fr" } });

  for (const meeting of meetings) {
    if (idsDejaImportes.has(meeting.id)) {
      resultat.dejaImportees += 1;
      continue;
    }

    try {
      const contact = await trouverContactAssocie(meeting.id);
      if (!contact?.properties.email) {
        resultat.ignorees.push({ meetingId: meeting.id, raison: "Aucun contact/email associé à la réunion." });
        continue;
      }
      if (!meeting.properties.hs_meeting_start_time) {
        resultat.ignorees.push({ meetingId: meeting.id, raison: "Date de réunion manquante." });
        continue;
      }

      const email = contact.properties.email.toLowerCase().trim();
      const prenom = contact.properties.firstname?.trim() || email.split("@")[0];
      const nom = contact.properties.lastname?.trim() || "?";
      const societe = extraireSocieteDuCorps(meeting.properties.hs_meeting_body) || contact.properties.company || "?";
      const dateRDV = new Date(meeting.properties.hs_meeting_start_time);
      const calendarEventId = meeting.properties.hs_i_cal_uid || null;

      // Période de transition : ce RDV existe peut-être déjà via le Google Sheet
      // (même prospect, même jour) — on le complète plutôt que d'en recréer un.
      // Le Sheet assigne tout par défaut à Louis (il ne connaît pas le vrai
      // commercial), donc on ne filtre jamais la recherche par commercialId —
      // seul le nom + la date comptent, et on corrige vers Chloé si trouvé.
      const dateDebut = new Date(dateRDV);
      dateDebut.setUTCHours(0, 0, 0, 0);
      const dateFin = new Date(dateRDV);
      dateFin.setUTCHours(23, 59, 59, 999);

      const normalise = (s: string) =>
        s
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .toLowerCase()
          .trim()
          .replace(/\s+/g, " ");
      const candidats = await prisma.rendezVous.findMany({
        where: { hubspotMeetingId: null, dateRDV: { gte: dateDebut, lte: dateFin } },
      });
      const existant = candidats.find(
        (c) => normalise(c.prenom) === normalise(prenom) && normalise(c.nom) === normalise(nom),
      );

      if (existant) {
        await prisma.rendezVous.update({
          where: { id: existant.id },
          data: { commercialId: chloe.id, hubspotMeetingId: meeting.id, calendarEventId, email, dateRDV, societe },
        });
        resultat.misAJour += 1;
      } else {
        await prisma.rendezVous.create({
          data: {
            commercialId: chloe.id,
            origine: "OUTBOUND",
            nom,
            prenom,
            societe,
            email,
            dateRDV,
            hubspotMeetingId: meeting.id,
            calendarEventId,
            digestAgatheEnvoye: false,
          },
        });
        resultat.crees += 1;
      }
    } catch (error) {
      const message = error instanceof HubspotApiError ? error.message : "Erreur inattendue.";
      resultat.erreurs.push({ meetingId: meeting.id, message });
      console.error(`[hubspot-sync] Erreur pour la réunion ${meeting.id} :`, error);
    }
  }

  return resultat;
}
