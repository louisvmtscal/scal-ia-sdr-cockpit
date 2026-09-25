import { CompteRenduEmail } from "@/emails/compte-rendu-email";
import { EmailJ25NotificationEmail } from "@/emails/email-j25-notification-email";
import { PreparationEmail } from "@/emails/preparation-email";
import { MAIL_FROM, MAIL_TO_CEO, MAIL_TO_LOUIS, resend } from "@/integrations/resend";
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

export async function sendCompteRenduEmail(rendezVous: RendezVousAvecCommercial, compteRendu: CompteRendu) {
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

export async function sendPreparationEmail(rendezVous: RendezVousAvecCommercial, preparation: Preparation) {
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
