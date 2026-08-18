import { normalizeFrenchPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import type { HonoreStatus } from "@/lib/generated/prisma/enums";
import type { RendezVous } from "@/lib/generated/prisma/client";
import { sendSms } from "@/services/brevo/sms";
import { formatHeureParis } from "@/utils/format";

export const HEURES_AVANT_J1 = 24;
export const HEURES_AVANT_H2 = 2;

const MS_PAR_HEURE = 3_600_000;

/** Statuts Honoré pour lesquels tout rappel SMS futur doit être annulé. */
const HONORE_ANNULE_RAPPELS: HonoreStatus[] = ["NON", "A_REPLACER"];

export type TypeRappel = "J1" | "H2";

function renderMessageJ1(prenom: string, dateRDV: Date) {
  const heure = formatHeureParis(dateRDV);
  return `Bonjour ${prenom},\n\nPetit rappel concernant notre échange de demain à ${heure}.\n\nAu plaisir d'échanger avec vous.\n\nLouis - Scal-IA`;
}

function renderMessageH2(prenom: string) {
  return `Bonjour ${prenom},\n\nPetit rappel : notre échange commence dans 2 heures.\n\nÀ tout à l'heure !\n\nLouis - Scal-IA`;
}

/**
 * Requête des rendez-vous encore susceptibles de recevoir un rappel SMS :
 * à venir, avec un numéro renseigné, et dont le statut Honoré n'annule pas
 * les rappels futurs (voir règles métier — Non / À replacer).
 */
export function getRendezVousEligibles() {
  return prisma.rendezVous.findMany({
    where: {
      dateRDV: { gt: new Date() },
      telephone: { not: null },
      honore: { notIn: HONORE_ANNULE_RAPPELS },
      OR: [{ smsJ1Status: "PENDING" }, { smsH2Status: "PENDING" }],
    },
    orderBy: { dateRDV: "asc" },
  });
}

/**
 * Détermine, pour un rendez-vous et un instant donnés, quels rappels sont
 * dus. Fonction pure (aucun accès I/O) — c'est elle qui porte les fenêtres
 * J-1/H-2, indépendamment de la fréquence réelle d'exécution du cron.
 */
export function determinerRappelsDus(
  rendezVous: Pick<RendezVous, "dateRDV" | "smsJ1Status" | "smsH2Status">,
  now: Date,
): TypeRappel[] {
  const heuresRestantes = (rendezVous.dateRDV.getTime() - now.getTime()) / MS_PAR_HEURE;

  if (heuresRestantes <= 0) return [];

  const rappels: TypeRappel[] = [];

  if (
    rendezVous.smsJ1Status === "PENDING" &&
    heuresRestantes <= HEURES_AVANT_J1 &&
    heuresRestantes > HEURES_AVANT_H2
  ) {
    rappels.push("J1");
  }

  if (rendezVous.smsH2Status === "PENDING" && heuresRestantes <= HEURES_AVANT_H2) {
    rappels.push("H2");
  }

  return rappels;
}

type ResultatRappel = { rendezVousId: string; type: TypeRappel; statut: "SENT" | "FAILED" };

/** Traite un rappel dû : normalise le téléphone, envoie via Brevo, enregistre le résultat. */
async function traiterRappel(rendezVous: RendezVous, type: TypeRappel): Promise<ResultatRappel> {
  async function marquerEchec(error: string) {
    await prisma.rendezVous.update({
      where: { id: rendezVous.id },
      data:
        type === "J1"
          ? { smsJ1Status: "FAILED", smsLastError: error }
          : { smsH2Status: "FAILED", smsLastError: error },
    });
    return { rendezVousId: rendezVous.id, type, statut: "FAILED" as const };
  }

  const phone = normalizeFrenchPhone(rendezVous.telephone);

  if (!phone) {
    return marquerEchec("Numéro de téléphone invalide.");
  }

  const message =
    type === "J1"
      ? renderMessageJ1(rendezVous.prenom, rendezVous.dateRDV)
      : renderMessageH2(rendezVous.prenom);

  const result = await sendSms({ phone, message });

  if (!result.success) {
    return marquerEchec(result.error);
  }

  await prisma.rendezVous.update({
    where: { id: rendezVous.id },
    data:
      type === "J1"
        ? {
            smsJ1Status: "SENT",
            smsJ1SentAt: new Date(),
            smsJ1MessageId: result.messageId,
            smsLastError: null,
          }
        : {
            smsH2Status: "SENT",
            smsH2SentAt: new Date(),
            smsH2MessageId: result.messageId,
            smsLastError: null,
          },
  });
  return { rendezVousId: rendezVous.id, type, statut: "SENT" as const };
}

/**
 * Point d'entrée du cron : traite tous les rappels dus, un seul à la fois
 * par rendez-vous et par type (idempotent — le statut PENDING est requis
 * pour émettre, donc un rappel déjà SENT ou FAILED n'est jamais retenté ici).
 */
export async function traiterRappelsSmsDus(now = new Date()) {
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
 * Envoi de test (développement) : n'affecte jamais les statuts J-1/H-2 réels
 * — sert uniquement à vérifier la configuration Brevo avec le numéro d'un
 * rendez-vous donné.
 */
export async function envoyerSmsTest(rendezVousId: string) {
  const rendezVous = await prisma.rendezVous.findUniqueOrThrow({ where: { id: rendezVousId } });
  const phone = normalizeFrenchPhone(rendezVous.telephone);

  if (!phone) {
    return { success: false as const, error: "Numéro de téléphone invalide ou manquant." };
  }

  return sendSms({
    phone,
    message: `Ceci est un SMS test depuis le Cockpit Scal-IA (${rendezVous.prenom} ${rendezVous.nom}).`,
  });
}

export type ProchainRappelSms = {
  rendezVous: RendezVous;
  type: TypeRappel;
  envoiPrevu: Date;
};

/**
 * Prochains rappels SMS programmés, pour la page Automatisations. `envoiPrevu`
 * est l'instant théorique d'envoi (dateRDV - 24h ou - 2h), pas la date du
 * rendez-vous lui-même.
 */
export async function getProchainsRappelsSms(limit = 10): Promise<ProchainRappelSms[]> {
  const eligibles = await getRendezVousEligibles();

  const rappels: ProchainRappelSms[] = eligibles.flatMap((rendezVous) => {
    const items: ProchainRappelSms[] = [];
    if (rendezVous.smsJ1Status === "PENDING") {
      items.push({
        rendezVous,
        type: "J1",
        envoiPrevu: new Date(rendezVous.dateRDV.getTime() - HEURES_AVANT_J1 * MS_PAR_HEURE),
      });
    }
    if (rendezVous.smsH2Status === "PENDING") {
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
