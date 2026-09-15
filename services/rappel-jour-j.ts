import { normalizeFrenchPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import type { HonoreStatus } from "@/lib/generated/prisma/enums";
import type { RendezVous } from "@/lib/generated/prisma/client";
import { sendSms } from "@/services/brevo/sms";
import { formatHeureParis } from "@/utils/format";

/** Heure d'envoi cible, Europe/Paris. */
export const HEURE_ENVOI = 9;
export const MINUTE_ENVOI = 10;

/** Statuts Honoré pour lesquels tout rappel futur doit être annulé. */
const HONORE_ANNULE_RAPPELS: HonoreStatus[] = ["NON", "A_REPLACER"];

const heureParisFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  hour: "numeric",
  minute: "numeric",
});

function heureMinuteParis(date: Date): { heure: number; minute: number } {
  const parts = heureParisFormatter.formatToParts(date);
  const heure = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return { heure, minute };
}

/** Jour civil Europe/Paris sous forme "YYYY-MM-DD", pour comparer deux dates sans tenir compte de l'heure. */
function jourParis(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(date);
}

function renderMessageJourJ(prenom: string, dateRDV: Date) {
  const { heure } = heureMinuteParis(dateRDV);
  const moment = heure < 12 ? "ce matin" : "cet après-midi";
  const heureAffichee = formatHeureParis(dateRDV);
  return `Bonjour ${prenom},\n\nPetit rappel pour notre échange avec Chloé Einhorn, CEO de Scal-IA prévu ${moment} à ${heureAffichee}. Est-ce toujours bon pour vous ?\n\nBelle journée à vous,\nLouis de Scal-IA`;
}

/**
 * Requête des rendez-vous encore susceptibles de recevoir le rappel jour J :
 * aujourd'hui (Europe/Paris), avec un numéro renseigné, et dont le statut
 * Honoré n'annule pas les rappels futurs (règles métier — Non / À replacer).
 */
export function getRendezVousEligibles(now: Date) {
  const debutJour = new Date(now);
  debutJour.setHours(0, 0, 0, 0);
  const finJour = new Date(now);
  finJour.setHours(23, 59, 59, 999);

  return prisma.rendezVous.findMany({
    where: {
      dateRDV: { gte: debutJour, lte: finJour },
      telephone: { not: null },
      honore: { notIn: HONORE_ANNULE_RAPPELS },
      smsJourJStatus: "PENDING",
    },
    orderBy: { dateRDV: "asc" },
  });
}

/**
 * Détermine si le rappel jour J est dû pour ce rendez-vous à cet instant :
 * le RDV a lieu aujourd'hui (Europe/Paris) et il est ≥ 9h10 Europe/Paris.
 * Fonction pure (aucun accès I/O) — indépendante de la fréquence réelle
 * d'exécution du cron, idempotente via le statut PENDING.
 */
export function estRappelDu(rendezVous: Pick<RendezVous, "dateRDV" | "smsJourJStatus">, now: Date): boolean {
  if (rendezVous.smsJourJStatus !== "PENDING") return false;
  if (jourParis(rendezVous.dateRDV) !== jourParis(now)) return false;

  const { heure, minute } = heureMinuteParis(now);
  return heure > HEURE_ENVOI || (heure === HEURE_ENVOI && minute >= MINUTE_ENVOI);
}

type ResultatRappel = { rendezVousId: string; statut: "SENT" | "FAILED" };

/** Traite un rappel dû : normalise le téléphone, envoie via Brevo, enregistre le résultat. */
async function traiterRappel(rendezVous: RendezVous): Promise<ResultatRappel> {
  async function marquerEchec(error: string) {
    await prisma.rendezVous.update({
      where: { id: rendezVous.id },
      data: { smsJourJStatus: "FAILED", smsLastError: error },
    });
    return { rendezVousId: rendezVous.id, statut: "FAILED" as const };
  }

  const phone = normalizeFrenchPhone(rendezVous.telephone);

  if (!phone) {
    return marquerEchec("Numéro de téléphone invalide.");
  }

  const message = renderMessageJourJ(rendezVous.prenom, rendezVous.dateRDV);
  const result = await sendSms({ phone, message });

  if (!result.success) {
    return marquerEchec(result.error);
  }

  await prisma.rendezVous.update({
    where: { id: rendezVous.id },
    data: {
      smsJourJStatus: "SENT",
      smsJourJSentAt: new Date(),
      smsJourJMessageId: result.messageId,
      smsLastError: null,
    },
  });
  return { rendezVousId: rendezVous.id, statut: "SENT" as const };
}

/**
 * Point d'entrée du cron : traite tous les rappels jour J dus. Idempotent —
 * le statut PENDING est requis pour émettre, donc un rappel déjà SENT ou
 * FAILED n'est jamais retenté ici même si le cron tourne plusieurs fois
 * après 9h10.
 */
export async function traiterRappelsJourJDus(now = new Date()) {
  const eligibles = await getRendezVousEligibles(now);
  const resultats: ResultatRappel[] = [];

  for (const rendezVous of eligibles) {
    if (estRappelDu(rendezVous, now)) {
      resultats.push(await traiterRappel(rendezVous));
    }
  }

  return {
    total: resultats.length,
    envoyes: resultats.filter((r) => r.statut === "SENT").length,
    echecs: resultats.filter((r) => r.statut === "FAILED").length,
  };
}

/**
 * Envoi de test (développement) : n'affecte jamais le statut jour J réel —
 * sert uniquement à vérifier la configuration Brevo avec le numéro d'un
 * rendez-vous donné.
 */
export async function envoyerRappelJourJTest(rendezVousId: string) {
  const rendezVous = await prisma.rendezVous.findUniqueOrThrow({ where: { id: rendezVousId } });
  const phone = normalizeFrenchPhone(rendezVous.telephone);

  if (!phone) {
    return { success: false as const, error: "Numéro de téléphone invalide ou manquant." };
  }

  return sendSms({ phone, message: renderMessageJourJ(rendezVous.prenom, rendezVous.dateRDV) });
}
