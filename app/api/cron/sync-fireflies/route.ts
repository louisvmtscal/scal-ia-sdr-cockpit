import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { synchroniserFireflies } from "@/services/fireflies";

/**
 * Déclenché quotidiennement (voir vercel.json) pour rattraper les
 * transcriptions Fireflies publiées en retard ou un éventuel webhook manqué
 * (le webhook temps réel — app/api/webhooks/fireflies — reste le chemin
 * normal). Protégé par CRON_SECRET, comme les autres routes cron.
 *
 * Déclenchement manuel pour test ou rattrapage ponctuel : même header, avec
 * un paramètre optionnel `?from=AAAA-MM-JJ` pour élargir la fenêtre au-delà
 * des 7 jours par défaut (ex. import initial d'un historique).
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
    const resultat = await synchroniserFireflies({ fromDate });
    return NextResponse.json(resultat);
  } catch (error) {
    console.error("Erreur synchronisation Fireflies :", error);
    return NextResponse.json({ error: "La synchronisation a échoué." }, { status: 500 });
  }
}
