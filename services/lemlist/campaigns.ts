import "server-only";

import { lemlistRequest } from "./client";
import type { LemlistCampaign } from "./types";

type RawCampaign = { _id: string; name: string; status: string };

/**
 * Vérifie qu'une campagne existe (utilisé pour valider LEMLIST_WHATSAPP_J1_CAMPAIGN_ID /
 * LEMLIST_WHATSAPP_H2_CAMPAIGN_ID avant d'y inscrire un lead — voir Lemlist
 * `GET /campaigns/{campaignId}`).
 */
export async function getCampaign(campaignId: string): Promise<LemlistCampaign> {
  const raw = await lemlistRequest<RawCampaign>(`/campaigns/${campaignId}`, { method: "GET" });
  return { id: raw._id, name: raw.name, status: raw.status };
}
