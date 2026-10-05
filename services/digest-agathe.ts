import { prisma } from "@/lib/prisma";
import { sendDigestAgatheEmail } from "@/services/mail";

/** Heure d'envoi cible, Europe/Paris. */
export const HEURE_ENVOI = 17;
export const MINUTE_ENVOI = 45;

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

/** Il est ≥ 17h45 Europe/Paris — indépendant de la fréquence réelle d'exécution du cron. */
export function estDigestDu(now: Date): boolean {
  const { heure, minute } = heureMinuteParis(now);
  return heure > HEURE_ENVOI || (heure === HEURE_ENVOI && minute >= MINUTE_ENVOI);
}

export type DigestAgatheResultat =
  | { envoye: false; raison: "pas-encore-lheure" | "aucun-nouveau-rdv" | "erreur-envoi" }
  | { envoye: true; nombre: number };

/**
 * Envoie, à partir de 17h45 Europe/Paris, un digest unique à Agathe listant
 * tous les RDV pas encore signalés (digestAgatheEnvoye: false) — peu importe
 * depuis combien de jours ils attendent, pour ne jamais en perdre un si un
 * passage du cron échoue. Ne marque les RDV comme envoyés qu'après succès de
 * l'envoi, pour que le prochain passage retente automatiquement sinon.
 */
export async function envoyerDigestAgatheSiDu(now: Date): Promise<DigestAgatheResultat> {
  if (!estDigestDu(now)) {
    return { envoye: false, raison: "pas-encore-lheure" };
  }

  const rendezVous = await prisma.rendezVous.findMany({
    where: { digestAgatheEnvoye: false },
    orderBy: { createdAt: "asc" },
  });

  if (rendezVous.length === 0) {
    return { envoye: false, raison: "aucun-nouveau-rdv" };
  }

  try {
    await sendDigestAgatheEmail(
      rendezVous.map((rdv) => ({ nom: rdv.nom, prenom: rdv.prenom, societe: rdv.societe })),
    );
  } catch (error) {
    console.error("Erreur envoi digest Agathe :", error);
    return { envoye: false, raison: "erreur-envoi" };
  }

  await prisma.rendezVous.updateMany({
    where: { id: { in: rendezVous.map((rdv) => rdv.id) } },
    data: { digestAgatheEnvoye: true, digestAgatheEnvoyeAt: now },
  });

  return { envoye: true, nombre: rendezVous.length };
}
