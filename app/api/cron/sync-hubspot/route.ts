import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { synchroniserHubspot } from "@/services/hubspot-sync";

/**
 * Déclenché toutes les 15 min (GitHub Actions, voir .github/workflows/cron-rappels.yml)
 * pour importer les RDV pris via le lien de prise de RDV public HubSpot de
 * Chloé. Protégé par CRON_SECRET, comme les autres routes cron.
 *
 * Déclenchement manuel pour test ou rattrapage ponctuel : même header, avec
 * un paramètre optionnel `?from=AAAA-MM-JJ` pour élargir la fenêtre au-delà
 * des 7 jours par défaut.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const fromParam = request.nextUrl.searchParams.get("from");
  const fromDate = fromParam ? new Date(fromParam) : undefined;

  if (fromParam && (!fromDate || Number.isNaN(fromDate.getTime()))) {
    return NextResponse.json({ error: "Paramètre 'from' invalide (attendu AAAA-MM-JJ)." }, { status: 400 });
  }

  try {
    const resultat = await synchroniserHubspot({ fromDate });
    return NextResponse.json(resultat);
  } catch (error) {
    console.error("Erreur synchronisation HubSpot :", error);
    return NextResponse.json({ error: "La synchronisation a échoué." }, { status: 500 });
  }
}
