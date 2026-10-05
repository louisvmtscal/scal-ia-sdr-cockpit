import { prisma } from "@/lib/prisma";
import { sendDigestAgatheEmail } from "@/services/mail";

export type DigestAgatheResultat =
  | { envoye: false; raison: "aucun-nouveau-rdv" | "erreur-envoi" }
  | { envoye: true; nombre: number };

/**
 * Notifie Agathe des RDV pas encore signalés (digestAgatheEnvoye: false), dès
 * le prochain passage du cron (toutes les 15 min) — pas de créneau horaire
 * fixe, pour coller au plus près du "dès qu'un nouveau RDV apparaît". Peu
 * importe depuis combien de temps un RDV attend, pour ne jamais en perdre un
 * si un passage échoue. Ne marque les RDV comme envoyés qu'après succès de
 * l'envoi, pour que le prochain passage retente automatiquement sinon.
 */
export async function envoyerDigestAgatheSiDu(now: Date): Promise<DigestAgatheResultat> {
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
