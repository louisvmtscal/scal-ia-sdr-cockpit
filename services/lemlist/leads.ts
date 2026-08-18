import "server-only";

import { lemlistRequest } from "./client";
import type { CreatedLemlistLead, NewLemlistLead } from "./types";

type RawLead = { _id: string; contactId: string | null; campaignId: string; email: string };

/**
 * Ajoute un lead à une campagne Lemlist dédiée (`POST /campaigns/{campaignId}/leads/`).
 *
 * `deduplicate=true` : Lemlist ne réinsère pas le lead si son email existe déjà
 * dans une autre campagne — une protection supplémentaire, en plus de
 * l'idempotence garantie côté application (statut PENDING requis avant tout
 * appel, voir services/whatsapp-rappels.ts).
 *
 * Tout champ additionnel de `lead` au-delà des champs standards (meetingDate,
 * meetingTime, commercial, appointmentId, ...) est envoyé tel quel : Lemlist
 * le stocke comme variable personnalisée `{{cle}}` utilisable dans les
 * templates.
 */
export async function createLeadInCampaign(
  campaignId: string,
  lead: NewLemlistLead,
): Promise<CreatedLemlistLead> {
  const raw = await lemlistRequest<RawLead>(`/campaigns/${campaignId}/leads/`, {
    method: "POST",
    body: lead,
    query: { deduplicate: "true" },
  });

  return {
    leadId: raw._id,
    contactId: raw.contactId ?? null,
    campaignId: raw.campaignId ?? campaignId,
    email: raw.email,
  };
}
