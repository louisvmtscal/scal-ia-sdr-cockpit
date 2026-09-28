import type { HonoreStatus } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { sendRappelVeilleEmail } from "@/services/mail";
import { formatHeureParis } from "@/utils/format";

/** Heure d'envoi cible, Europe/Paris. */
export const HEURE_ENVOI = 17;
export const MINUTE_ENVOI = 0;

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

/** Rendez-vous de demain (Europe/Paris) pas encore rappelés par email, statut Honoré non annulant. */
export function getRendezVousEligibles(now: Date) {
  const demain = new Date(now);
  demain.setDate(demain.getDate() + 1);
  const debutDemain = new Date(demain);
  debutDemain.setHours(0, 0, 0, 0);
  const finDemain = new Date(demain);
  finDemain.setHours(23, 59, 59, 999);

  return prisma.rendezVous.findMany({
    where: {
      dateRDV: { gte: debutDemain, lte: finDemain },
      honore: { notIn: HONORE_ANNULE_RAPPELS },
      rappelVeilleEnvoye: false,
    },
    include: { commercial: true },
    orderBy: { dateRDV: "asc" },
  });
}

/** Il est ≥ 17h00 Europe/Paris — indépendant de la fréquence réelle d'exécution du cron. */
export function estRappelDu(now: Date): boolean {
  const { heure, minute } = heureMinuteParis(now);
  return heure > HEURE_ENVOI || (heure === HEURE_ENVOI && minute >= MINUTE_ENVOI);
}

type RendezVousEligible = Awaited<ReturnType<typeof getRendezVousEligibles>>[number];
type ResultatCommercial = { commercialId: string; statut: "SENT" | "FAILED" };

/**
 * Envoie le digest à un commercial pour tous ses RDV de demain d'un coup, et
 * marque ces RDV comme rappelés seulement si l'envoi réussit — un échec
 * (ex. Resend indisponible) laisse rappelVeilleEnvoye à false, donc le
 * prochain passage du cron retentera automatiquement, sans intervention
 * manuelle (contrairement au SMS jour J, jamais retenté après un FAILED).
 */
async function traiterCommercial(rendezVous: RendezVousEligible[]): Promise<ResultatCommercial> {
  const commercial = rendezVous[0].commercial;

  const items = rendezVous
    .map((rdv) => ({
      prenom: rdv.prenom,
      nom: rdv.nom,
      societe: rdv.societe,
      heure: formatHeureParis(rdv.dateRDV),
    }))
    .sort((a, b) => a.heure.localeCompare(b.heure));

  try {
    await sendRappelVeilleEmail(commercial, items);
  } catch (error) {
    console.error("Erreur envoi rappel veille :", error);
    return { commercialId: commercial.id, statut: "FAILED" };
  }

  await prisma.rendezVous.updateMany({
    where: { id: { in: rendezVous.map((rdv) => rdv.id) } },
    data: { rappelVeilleEnvoye: true, rappelVeilleEnvoyeAt: new Date() },
  });

  return { commercialId: commercial.id, statut: "SENT" };
}

/**
 * Point d'entrée du cron : à partir de 17h Europe/Paris, envoie à chaque
 * commercial concerné un email récapitulant ses RDV du lendemain. Idempotent
 * — rappelVeilleEnvoye=false est requis pour être sélectionné, donc un RDV
 * déjà couvert par un envoi réussi n'est jamais renvoyé même si le cron
 * tourne plusieurs fois après 17h.
 */
export async function traiterRappelsVeilleDus(now = new Date()) {
  if (!estRappelDu(now)) {
    return { total: 0, commerciaux: 0, envoyes: 0, echecs: 0 };
  }

  const eligibles = await getRendezVousEligibles(now);
  if (eligibles.length === 0) {
    return { total: 0, commerciaux: 0, envoyes: 0, echecs: 0 };
  }

  const parCommercial = new Map<string, RendezVousEligible[]>();
  for (const rdv of eligibles) {
    const liste = parCommercial.get(rdv.commercialId) ?? [];
    liste.push(rdv);
    parCommercial.set(rdv.commercialId, liste);
  }

  const resultats: ResultatCommercial[] = [];
  for (const rendezVous of parCommercial.values()) {
    resultats.push(await traiterCommercial(rendezVous));
  }

  return {
    total: eligibles.length,
    commerciaux: resultats.length,
    envoyes: resultats.filter((r) => r.statut === "SENT").length,
    echecs: resultats.filter((r) => r.statut === "FAILED").length,
  };
}
