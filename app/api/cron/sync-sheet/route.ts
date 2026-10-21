import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { syncRendezVousFromSheet } from "@/services/sheet-sync";

/**
 * Synchronise le Google Sheet de suivi RDV vers la table RendezVous.
 * Plus planifiée automatiquement depuis le 2026-10-21 (retiré de
 * vercel.json) : HubSpot (lien public de Chloé) est désormais la seule
 * source pour les nouveaux RDV — le Sheet reste disponible en déclenchement
 * manuel (bouton "Synchroniser" côté SDR/admin) pour les RDV historiques
 * pris avant ce changement. Protégé par CRON_SECRET, comme les autres
 * routes cron.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    const resultat = await syncRendezVousFromSheet();
    return NextResponse.json(resultat);
  } catch (error) {
    console.error("Erreur synchronisation Google Sheet :", error);
    return NextResponse.json({ error: "La synchronisation a échoué." }, { status: 500 });
  }
}
