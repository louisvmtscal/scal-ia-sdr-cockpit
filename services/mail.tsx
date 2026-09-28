import { CompteRenduEmail } from "@/emails/compte-rendu-email";
import { EmailJ25NotificationEmail } from "@/emails/email-j25-notification-email";
import { NouveauRdvAgatheEmail } from "@/emails/nouveau-rdv-agathe-email";
import { PreparationEmail } from "@/emails/preparation-email";
import { RappelVeilleEmail } from "@/emails/rappel-veille-email";
import {
  MAIL_FROM,
  MAIL_TO_AGATHE,
  MAIL_TO_CEO,
  MAIL_TO_LOUIS,
  resend,
} from "@/integrations/resend";
import type { RendezVous } from "@/lib/generated/prisma/client";
import type { CompteRendu } from "@/lib/validations/compte-rendu";
import type { EmailJ25 } from "@/lib/validations/email-j25";
import type { Preparation } from "@/lib/validations/preparation";
import { formatDate, formatDateTime } from "@/utils/format";

type RendezVousAvecCommercial = RendezVous & {
  commercial: { name: string | null; email: string };
};

function nomCommercial(rendezVous: RendezVousAvecCommercial) {
  return rendezVous.commercial.name ?? rendezVous.commercial.email;
}

export async function sendCompteRenduEmail(
  rendezVous: RendezVousAvecCommercial,
  compteRendu: CompteRendu,
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY manquante : email de compte rendu non envoyé.");
    return;
  }

  await resend.emails.send({
    from: MAIL_FROM,
    to: MAIL_TO_CEO,
    subject: `Compte rendu — ${rendezVous.prenom} ${rendezVous.nom} (${rendezVous.societe})`,
    react: (
      <CompteRenduEmail
        prenom={rendezVous.prenom}
        nom={rendezVous.nom}
        societe={rendezVous.societe}
        commercial={nomCommercial(rendezVous)}
        dateRDV={formatDateTime(rendezVous.dateRDV)}
        compteRendu={compteRendu}
      />
    ),
  });
}

export async function sendPreparationEmail(
  rendezVous: RendezVousAvecCommercial,
  preparation: Preparation,
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY manquante : email de préparation non envoyé.");
    return;
  }

  await resend.emails.send({
    from: MAIL_FROM,
    to: MAIL_TO_CEO,
    subject: `Préparation RDV demain — ${rendezVous.prenom} ${rendezVous.nom} (${rendezVous.societe})`,
    react: (
      <PreparationEmail
        prenom={rendezVous.prenom}
        nom={rendezVous.nom}
        societe={rendezVous.societe}
        commercial={nomCommercial(rendezVous)}
        dateRDV={formatDateTime(rendezVous.dateRDV)}
        preparation={preparation}
      />
    ),
  });
}

/**
 * Notification interne uniquement : le prospect ne reçoit jamais cet email.
 * Point d'entrée unique pour l'envoi — remplacer l'appel à `resend` ici
 * suffit pour changer de fournisseur SMTP (Brevo ou autre) plus tard.
 */
export async function sendEmailJ25NotificationEmail(rendezVous: RendezVous, emailJ25: EmailJ25) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY manquante : notification Email J-25 non envoyée.");
    return;
  }

  await resend.emails.send({
    from: MAIL_FROM,
    to: MAIL_TO_LOUIS,
    subject: `Brouillon Email J-25 prêt — ${rendezVous.prenom} ${rendezVous.nom} (${rendezVous.societe})`,
    react: (
      <EmailJ25NotificationEmail
        prenom={rendezVous.prenom}
        nom={rendezVous.nom}
        societe={rendezVous.societe}
        dateRDV={formatDate(rendezVous.dateRDV)}
        contenu={emailJ25.contenu}
      />
    ),
  });
}

/**
 * Notifie Agathe d'un nouveau RDV créé via la sync Google Sheet, pour
 * qu'elle le retire des listes de prospection. Jamais pour les RDV créés
 * manuellement dans le Cockpit — uniquement ceux importés du Sheet.
 */
export async function sendNouveauRdvAgatheEmail(rendezVous: {
  nom: string;
  prenom: string;
  societe: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY manquante : notification Agathe non envoyée.");
    return;
  }

  await resend.emails.send({
    from: MAIL_FROM,
    to: MAIL_TO_AGATHE,
    subject: `Nouveau rendez-vous : ${rendezVous.nom} ${rendezVous.prenom} (${rendezVous.societe})`,
    react: (
      <NouveauRdvAgatheEmail
        nom={rendezVous.nom}
        prenom={rendezVous.prenom}
        societe={rendezVous.societe}
      />
    ),
  });
}

/**
 * Rappel du soir (17h Europe/Paris) envoyé au commercial concerné, résumé de
 * ses RDV du lendemain. Contrairement aux autres emails de ce fichier, une
 * config manquante lève une erreur : l'appelant (services/rappel-veille.ts)
 * s'en sert comme seul signal pour savoir si l'envoi a réussi.
 */
export async function sendRappelVeilleEmail(
  commercial: { name: string | null; email: string },
  rendezVous: { prenom: string; nom: string; societe: string; heure: string }[],
) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY manquante.");
  }

  await resend.emails.send({
    from: MAIL_FROM,
    to: commercial.email,
    subject: `Rappel — ${rendezVous.length} rendez-vous demain`,
    react: (
      <RappelVeilleEmail
        prenomCommercial={commercial.name ?? commercial.email}
        rendezVous={rendezVous}
      />
    ),
  });
}
