import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";

/**
 * Webhook Lemlist — synchronise les statuts WhatsApp.
 *
 * ⚠️ Limitation constatée lors de l'audit de l'API Lemlist : l'endpoint de
 * lecture `GET /activities` ne documente aucun type d'activité WhatsApp
 * (seuls des types email/manuels apparaissent dans la documentation
 * publique). Le webhook est donc la SEULE méthode documentée pour suivre le
 * statut réel d'un message WhatsApp (`whatsappMessageSent`,
 * `whatsappMessageDelivered`, `whatsappMessageOpened`, `whatsappReplied`,
 * `whatsappMessageFailed`) — à configurer dans Lemlist (Settings >
 * Webhooks), cible : `https://<domaine>/api/webhooks/lemlist`.
 *
 * Vérification : Lemlist renvoie le secret configuré tel quel dans le champ
 * `secret` du corps JSON (pas de signature HMAC documentée).
 */
export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Corps de requête JSON invalide." }, { status: 400 });
  }

  const secret = process.env.LEMLIST_WEBHOOK_SECRET;
  if (!secret || payload.secret !== secret) {
    return NextResponse.json({ error: "Secret invalide." }, { status: 401 });
  }

  const type = payload.type as string | undefined;
  const leadId = payload.leadId as string | undefined;

  if (!type || !leadId) {
    return NextResponse.json({ received: true });
  }

  const nouveauStatut =
    type === "whatsappMessageSent" || type === "whatsappMessageDelivered"
      ? ("SENT" as const)
      : type === "whatsappMessageFailed"
        ? ("FAILED" as const)
        : null;

  if (!nouveauStatut) {
    // whatsappMessageOpened / whatsappReplied : pas de statut PENDING/QUEUED/SENT/FAILED
    // correspondant dans notre modèle actuel — reçu mais non traité pour l'instant.
    return NextResponse.json({ received: true });
  }

  const misAJourJ1 = await prisma.rendezVous.updateMany({
    where: { whatsappJ1ExternalId: leadId },
    data: { whatsappJ1Status: nouveauStatut },
  });

  if (misAJourJ1.count === 0) {
    await prisma.rendezVous.updateMany({
      where: { whatsappH2ExternalId: leadId },
      data: { whatsappH2Status: nouveauStatut },
    });
  }

  return NextResponse.json({ received: true });
}
