import { prisma } from "@/lib/prisma";
import { emailJ25Schema, type EmailJ25 } from "@/lib/validations/email-j25";
import { sendEmailJ25NotificationEmail } from "@/services/mail";
import { formatDate } from "@/utils/format";

import { buildPosteClause, choisirValeurAjoutee, renderEmailJ25 } from "./template";
import type { EmailJ25Variables } from "./types";

export const JOURS_AVANT_RDV = 25;

/** Date à laquelle le brouillon est censé être envoyé (J-25). */
export function calculerDateEnvoiJ25(dateRDV: Date) {
  const date = new Date(dateRDV);
  date.setDate(date.getDate() - JOURS_AVANT_RDV);
  return date;
}

function buildVariables(rendezVous: {
  prenom: string;
  nom: string;
  societe: string;
  poste: string | null;
  linkedin: string | null;
  commercial: { name: string | null; email: string };
  dateRDV: Date;
  id: string;
}): EmailJ25Variables {
  return {
    prenom: rendezVous.prenom,
    nom: rendezVous.nom,
    societe: rendezVous.societe,
    dateRDV: formatDate(rendezVous.dateRDV),
    commercial: rendezVous.commercial.name ?? rendezVous.commercial.email,
    posteClause: buildPosteClause({ poste: rendezVous.poste, societe: rendezVous.societe }),
    valeurAjoutee: choisirValeurAjoutee(rendezVous.id),
    // V2 : brancher ici dès que ces sources existeront (voir types.ts).
    linkedin: rendezVous.linkedin ?? undefined,
    actualitesEntreprise: undefined,
    actualitesSecteur: undefined,
  };
}

export async function genererEmailJ25(rendezVousId: string): Promise<EmailJ25> {
  const rendezVous = await prisma.rendezVous.findUniqueOrThrow({
    where: { id: rendezVousId },
    include: { commercial: true },
  });

  const contenu = renderEmailJ25(buildVariables(rendezVous));
  const emailJ25 = emailJ25Schema.parse({ contenu, genereLe: new Date().toISOString() });

  await prisma.rendezVous.update({ where: { id: rendezVousId }, data: { emailJ25 } });

  await sendEmailJ25NotificationEmail(rendezVous, emailJ25).catch((error) => {
    console.error("Erreur notification email J-25 :", error);
  });

  return emailJ25;
}

export async function modifierEmailJ25(rendezVousId: string, contenu: string): Promise<EmailJ25> {
  const existant = await prisma.rendezVous.findUniqueOrThrow({
    where: { id: rendezVousId },
    select: { emailJ25: true },
  });
  const parsed = emailJ25Schema.safeParse(existant.emailJ25);

  const emailJ25 = emailJ25Schema.parse({
    contenu,
    genereLe: parsed.success ? parsed.data.genereLe : new Date().toISOString(),
  });

  await prisma.rendezVous.update({ where: { id: rendezVousId }, data: { emailJ25 } });

  return emailJ25;
}
