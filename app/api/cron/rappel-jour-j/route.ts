import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { traiterRappelsJourJDus } from "@/services/rappel-jour-j";

/**
 * Déclenché périodiquement (cron Render, voir README) pour envoyer le
 * rappel SMS du jour J dû à 9h10 Europe/Paris. Protégé par CRON_SECRET.
 *
 * Intervalle recommandé : toutes les 10-15 minutes. La logique de fenêtre
 * (voir services/rappel-jour-j.ts) ne nécessite pas une exécution à la
 * minute près, et le statut PENDING garantit l'idempotence même si le cron
 * tourne plusieurs fois après 9h10.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const resultat = await traiterRappelsJourJDus();

  return NextResponse.json(resultat);
}
