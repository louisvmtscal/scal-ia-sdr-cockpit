import { after, NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { verifyFirefliesSignature } from "@/integrations/fireflies";
import { traiterTranscriptionFireflies } from "@/services/fireflies";

/**
 * Webhook Fireflies.ai — appelé lorsqu'une transcription est terminée
 * ("Transcription completed"). À configurer dans Fireflies :
 * app.fireflies.ai → Settings → Developer settings → Webhooks.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature");

  if (!verifyFirefliesSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Signature invalide." }, { status: 401 });
  }

  let payload: { meetingId?: string; eventType?: string };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Corps de requête JSON invalide." }, { status: 400 });
  }

  if (payload.eventType !== "Transcription completed" || !payload.meetingId) {
    return NextResponse.json({ received: true });
  }

  const meetingId = payload.meetingId;

  // Répond immédiatement à Fireflies ; le traitement (appel Claude + email)
  // se poursuit après la réponse pour éviter tout timeout côté webhook.
  after(() =>
    traiterTranscriptionFireflies(meetingId).catch((error) => {
      console.error(`[fireflies] Échec du traitement de la transcription ${meetingId} :`, error);
    }),
  );

  return NextResponse.json({ received: true });
}
