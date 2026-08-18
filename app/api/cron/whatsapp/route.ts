import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { traiterRappelsWhatsappDus } from "@/services/whatsapp-rappels";

/**
 * Déclenché périodiquement (Vercel Cron, voir vercel.json) pour inscrire les
 * leads dans les campagnes Lemlist dédiées et envoyer les rappels WhatsApp
 * J-1 et H-2 dus. Remplace `/api/cron/sms` (Brevo, conservé mais plus
 * planifié — voir vercel.json) comme canal actif des rappels de rendez-vous.
 *
 * Protégé par CRON_SECRET (Vercel ajoute automatiquement l'en-tête
 * `Authorization: Bearer <CRON_SECRET>`).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const resultat = await traiterRappelsWhatsappDus();

  return NextResponse.json(resultat);
}
