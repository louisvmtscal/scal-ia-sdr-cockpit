import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { traiterRappelsSmsDus } from "@/services/sms-rappels";

/**
 * Déclenché périodiquement (Vercel Cron, voir vercel.json) pour envoyer les
 * rappels SMS J-1 et H-2 dus. Protégé par CRON_SECRET (Vercel ajoute
 * automatiquement l'en-tête `Authorization: Bearer <CRON_SECRET>`).
 *
 * Intervalle recommandé : toutes les 15 minutes. Les fenêtres J-1/H-2 sont
 * suffisamment larges (voir services/sms-rappels.ts) pour ne pas nécessiter
 * une exécution à la seconde près, et le statut PENDING garantit
 * l'idempotence même si le cron tourne plusieurs fois pendant la fenêtre.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const resultat = await traiterRappelsSmsDus();

  return NextResponse.json(resultat);
}
