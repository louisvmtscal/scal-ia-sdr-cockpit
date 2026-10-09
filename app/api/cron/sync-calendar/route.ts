import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { syncRendezVousFromCalendar } from "@/services/calendar-sync";

/**
 * Déclenché périodiquement (GitHub Actions, toutes les 15 min — voir
 * .github/workflows/cron-rappels.yml) pour synchroniser le flux iCal du
 * calendrier Google (RDV pris via le lien HubSpot) vers la table RendezVous.
 * Protégé par CRON_SECRET, comme les autres routes cron.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    const resultat = await syncRendezVousFromCalendar();
    return NextResponse.json(resultat);
  } catch (error) {
    console.error("Erreur synchronisation calendrier :", error);
    return NextResponse.json({ error: "La synchronisation a échoué." }, { status: 500 });
  }
}
