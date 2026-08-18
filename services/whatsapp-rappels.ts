import { normalizeFrenchPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import type { HonoreStatus } from "@/lib/generated/prisma/enums";
import type { RendezVous } from "@/lib/generated/prisma/client";
import { COMMERCIAL_LABELS } from "@/lib/constants/rendez-vous";
import { createLeadInCampaign, LemlistApiError, sendWhatsappMessage } from "@/services/lemlist";
import { formatHeureParis } from "@/utils/format";

export const HEURES_AVANT_J1 = 24;
export const HEURES_AVANT_H2 = 2;

const MS_PAR_HEURE = 3_600_000;

/** Statuts Honoré pour lesquels tout rappel futur doit être annulé. */
const HONORE_ANNULE_RAPPELS: HonoreStatus[] = ["NON", "A_REPLACER"];

export type TypeRappel = "J1" | "H2";

function renderMessageJ1(prenom: string, dateRDV: Date) {
  const heure = formatHeureParis(dateRDV);
  return `Bonjour ${prenom},\n\nPetit rappel concernant notre échange de demain à ${heure}.\n\nAu plaisir d'échanger avec vous.\n\nLouis — Scal-IA`;
}

function renderMessageH2(prenom: string) {
  return `Bonjour ${prenom},\n\nPetit rappel : notre échange commence dans 2 heures.\n\nÀ tout à l'heure !\n\nLouis — Scal-IA`;
}

function getCampaignId(type: TypeRappel): string | undefined {
  return type === "J1"
    ? process.env.LEMLIST_WHATSAPP_J1_CAMPAIGN_ID
    : process.env.LEMLIST_WHATSAPP_H2_CAMPAIGN_ID;
}

/**
 * Rendez-vous encore susceptibles de recevoir un rappel WhatsApp : à venir,
 * avec un numéro renseigné, et dont le statut Honoré n'annule pas les
 * rappels futurs. Éligibilité basée sur PENDING uniquement (comme l'ancien
 * système SMS) : un rappel déjà QUEUED/SENT/FAILED n'est jamais retenté
 * automatiquement — évite tout risque de double envoi WhatsApp au prospect.
 */
export function getRendezVousEligibles() {
  return prisma.rendezVous.findMany({
    where: {
      dateRDV: { gt: new Date() },
      telephone: { not: null },
      honore: { notIn: HONORE_ANNULE_RAPPELS },
      OR: [{ whatsappJ1Status: "PENDING" }, { whatsappH2Status: "PENDING" }],
    },
    orderBy: { dateRDV: "asc" },
  });
}

/** Fonction pure — mêmes fenêtres J-1/H-2 que l'ancien système SMS (Europe/Paris pour l'affichage uniquement). */
export function determinerRappelsDus(
  rendezVous: Pick<RendezVous, "dateRDV" | "whatsappJ1Status" | "whatsappH2Status">,
  now: Date,
): TypeRappel[] {
  const heuresRestantes = (rendezVous.dateRDV.getTime() - now.getTime()) / MS_PAR_HEURE;

  if (heuresRestantes <= 0) return [];

  const rappels: TypeRappel[] = [];

  if (
    rendezVous.whatsappJ1Status === "PENDING" &&
    heuresRestantes <= HEURES_AVANT_J1 &&
    heuresRestantes > HEURES_AVANT_H2
  ) {
    rappels.push("J1");
  }

  if (rendezVous.whatsappH2Status === "PENDING" && heuresRestantes <= HEURES_AVANT_H2) {
    rappels.push("H2");
  }

  return rappels;
}

type ResultatRappel = { rendezVousId: string; type: TypeRappel; statut: "SENT" | "FAILED" };

/**
 * Traite un rappel dû : normalise le téléphone, inscrit le lead dans la
 * campagne Lemlist dédiée, envoie le message WhatsApp, enregistre le
 * résultat.
 */
async function traiterRappel(rendezVous: RendezVous, type: TypeRappel): Promise<ResultatRappel> {
  async function marquerEchec(error: string, campaignId?: string) {
    await prisma.rendezVous.update({
      where: { id: rendezVous.id },
      data:
        type === "J1"
          ? {
              whatsappJ1Status: "FAILED",
              whatsappLastError: error,
              ...(campaignId ? { whatsappJ1CampaignId: campaignId } : {}),
            }
          : {
              whatsappH2Status: "FAILED",
              whatsappLastError: error,
              ...(campaignId ? { whatsappH2CampaignId: campaignId } : {}),
            },
    });
    return { rendezVousId: rendezVous.id, type, statut: "FAILED" as const };
  }

  const phone = normalizeFrenchPhone(rendezVous.telephone);
  if (!phone) {
    return marquerEchec("Numéro de téléphone invalide.");
  }

  if (!rendezVous.email) {
    return marquerEchec("Email du contact manquant (requis par Lemlist pour créer le lead).");
  }

  const campaignId = getCampaignId(type);
  if (!campaignId) {
    const variable =
      type === "J1" ? "LEMLIST_WHATSAPP_J1_CAMPAIGN_ID" : "LEMLIST_WHATSAPP_H2_CAMPAIGN_ID";
    return marquerEchec(`${variable} manquante.`);
  }

  const message = type === "J1" ? renderMessageJ1(rendezVous.prenom, rendezVous.dateRDV) : renderMessageH2(rendezVous.prenom);

  let leadId: string;
  let contactId: string | null;
  try {
    const lead = await createLeadInCampaign(campaignId, {
      email: rendezVous.email,
      firstName: rendezVous.prenom,
      lastName: rendezVous.nom,
      companyName: rendezVous.societe,
      phone,
      linkedinUrl: rendezVous.linkedin ?? undefined,
      meetingDate: rendezVous.dateRDV.toISOString().slice(0, 10),
      meetingTime: formatHeureParis(rendezVous.dateRDV),
      commercial: COMMERCIAL_LABELS[rendezVous.commercial],
      appointmentId: rendezVous.id,
    });
    leadId = lead.leadId;
    contactId = lead.contactId;
  } catch (error) {
    const errorMessage =
      error instanceof LemlistApiError ? error.message : "Erreur Lemlist inconnue.";
    return marquerEchec(errorMessage, campaignId);
  }

  // Lead inscrit dans Lemlist — on enregistre son leadId (whatsappXExternalId)
  // dès maintenant : c'est cet identifiant que le webhook Lemlist renverra
  // (`leadId` du payload) pour permettre de retrouver ce rendez-vous et
  // synchroniser le statut réel (sent/delivered/failed), voir
  // app/api/webhooks/lemlist/route.ts.
  await prisma.rendezVous.update({
    where: { id: rendezVous.id },
    data:
      type === "J1"
        ? { whatsappJ1Status: "QUEUED", whatsappJ1CampaignId: campaignId, whatsappJ1ExternalId: leadId }
        : { whatsappH2Status: "QUEUED", whatsappH2CampaignId: campaignId, whatsappH2ExternalId: leadId },
  });

  const result = await sendWhatsappMessage({
    contactId: contactId ?? undefined,
    leadId,
    message,
  });

  if (!result.success) {
    return marquerEchec(result.error, campaignId);
  }

  await prisma.rendezVous.update({
    where: { id: rendezVous.id },
    data:
      type === "J1"
        ? { whatsappJ1Status: "SENT", whatsappJ1SentAt: new Date(), whatsappLastError: null }
        : { whatsappH2Status: "SENT", whatsappH2SentAt: new Date(), whatsappLastError: null },
  });
  return { rendezVousId: rendezVous.id, type, statut: "SENT" as const };
}

/** Point d'entrée du cron : traite tous les rappels WhatsApp dus. */
export async function traiterRappelsWhatsappDus(now = new Date()) {
  const eligibles = await getRendezVousEligibles();
  const resultats: ResultatRappel[] = [];

  for (const rendezVous of eligibles) {
    const rappelsDus = determinerRappelsDus(rendezVous, now);
    for (const type of rappelsDus) {
      resultats.push(await traiterRappel(rendezVous, type));
    }
  }

  return {
    total: resultats.length,
    envoyes: resultats.filter((r) => r.statut === "SENT").length,
    echecs: resultats.filter((r) => r.statut === "FAILED").length,
  };
}

/**
 * Envoi de test (développement) : n'affecte jamais les statuts J-1/H-2 réels.
 * Utilise la campagne J-1 par défaut, uniquement pour vérifier la
 * configuration Lemlist avec le numéro d'un rendez-vous donné.
 */
export async function envoyerWhatsappTest(rendezVousId: string) {
  const rendezVous = await prisma.rendezVous.findUniqueOrThrow({ where: { id: rendezVousId } });
  const phone = normalizeFrenchPhone(rendezVous.telephone);

  if (!phone) {
    return { success: false as const, error: "Numéro de téléphone invalide ou manquant." };
  }
  if (!rendezVous.email) {
    return { success: false as const, error: "Email du contact manquant (requis par Lemlist)." };
  }

  const campaignId = process.env.LEMLIST_WHATSAPP_J1_CAMPAIGN_ID;
  if (!campaignId) {
    return { success: false as const, error: "LEMLIST_WHATSAPP_J1_CAMPAIGN_ID manquante." };
  }

  const lead = await createLeadInCampaign(campaignId, {
    email: rendezVous.email,
    firstName: rendezVous.prenom,
    lastName: rendezVous.nom,
    companyName: rendezVous.societe,
    phone,
  });

  return sendWhatsappMessage({
    contactId: lead.contactId ?? undefined,
    leadId: lead.leadId,
    message: `Ceci est un message WhatsApp test depuis le Cockpit Scal-IA (${rendezVous.prenom} ${rendezVous.nom}).`,
  });
}

export type ProchainRappelWhatsapp = {
  rendezVous: RendezVous;
  type: TypeRappel;
  envoiPrevu: Date;
};

/** Prochains rappels WhatsApp programmés, pour la page Automatisations. */
export async function getProchainsRappelsWhatsapp(limit = 10): Promise<ProchainRappelWhatsapp[]> {
  const eligibles = await getRendezVousEligibles();

  const rappels: ProchainRappelWhatsapp[] = eligibles.flatMap((rendezVous) => {
    const items: ProchainRappelWhatsapp[] = [];
    if (rendezVous.whatsappJ1Status === "PENDING") {
      items.push({
        rendezVous,
        type: "J1",
        envoiPrevu: new Date(rendezVous.dateRDV.getTime() - HEURES_AVANT_J1 * MS_PAR_HEURE),
      });
    }
    if (rendezVous.whatsappH2Status === "PENDING") {
      items.push({
        rendezVous,
        type: "H2",
        envoiPrevu: new Date(rendezVous.dateRDV.getTime() - HEURES_AVANT_H2 * MS_PAR_HEURE),
      });
    }
    return items;
  });

  return rappels.sort((a, b) => a.envoiPrevu.getTime() - b.envoiPrevu.getTime()).slice(0, limit);
}
