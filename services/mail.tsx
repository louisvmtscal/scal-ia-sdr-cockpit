import { render } from "@react-email/render";

import { CompteRenduEmail } from "@/emails/compte-rendu-email";
import { DigestAgatheEmail } from "@/emails/digest-agathe-email";
import { EmailJ25NotificationEmail } from "@/emails/email-j25-notification-email";
import { PreparationEmail } from "@/emails/preparation-email";
import { RappelVeilleEmail } from "@/emails/rappel-veille-email";
import { GMAIL_SMTP_USER, gmailTransport } from "@/integrations/gmail-smtp";
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
 * Notifie Agathe des nouveaux RDV pas encore signalés (voir
 * services/digest-agathe.ts), dès le prochain passage du cron — pas de
 * créneau horaire fixe. Envoyé via SMTP Gmail (mot de passe d'application) et
 * non Resend : contourne la vérification de domaine d'expédition, bloquée
 * tant que l'accès au DNS de scal-ia.fr n'est pas disponible. Lève une erreur
 * sur échec, comme sendRappelVeilleEmail : l'appelant s'en sert comme seul
 * signal pour savoir si l'envoi a réussi et retenter plus tard.
 */
export async function sendDigestAgatheEmail(
  rendezVous: { nom: string; prenom: string; societe: string }[],
) {
  if (!GMAIL_SMTP_USER || !process.env.GMAIL_SMTP_APP_PASSWORD) {
    throw new Error("GMAIL_SMTP_USER / GMAIL_SMTP_APP_PASSWORD manquants.");
  }

  const html = await render(<DigestAgatheEmail rendezVous={rendezVous} />);

  await gmailTransport.sendMail({
    from: GMAIL_SMTP_USER,
    to: MAIL_TO_AGATHE,
    subject: `${rendezVous.length} nouveau${rendezVous.length > 1 ? "x" : ""} rendez-vous aujourd'hui`,
    html,
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
