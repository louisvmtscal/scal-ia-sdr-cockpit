import { CompteRenduEmail } from "@/emails/compte-rendu-email";
import { PreparationEmail } from "@/emails/preparation-email";
import { MAIL_FROM, MAIL_TO_CEO, resend } from "@/integrations/resend";
import { COMMERCIAL_LABELS } from "@/lib/constants/rendez-vous";
import type { RendezVous } from "@/lib/generated/prisma/client";
import type { CompteRendu } from "@/lib/validations/compte-rendu";
import type { Preparation } from "@/lib/validations/preparation";
import { formatDateTime } from "@/utils/format";

export async function sendCompteRenduEmail(rendezVous: RendezVous, compteRendu: CompteRendu) {
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
        commercial={COMMERCIAL_LABELS[rendezVous.commercial]}
        dateRDV={formatDateTime(rendezVous.dateRDV)}
        compteRendu={compteRendu}
      />
    ),
  });
}

export async function sendPreparationEmail(rendezVous: RendezVous, preparation: Preparation) {
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
        commercial={COMMERCIAL_LABELS[rendezVous.commercial]}
        dateRDV={formatDateTime(rendezVous.dateRDV)}
        preparation={preparation}
      />
    ),
  });
}
