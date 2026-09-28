import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { traiterRappelsVeilleDus } from "@/services/rappel-veille";

/**
 * Déclenché périodiquement (GitHub Actions, toutes les 15 min — voir
 * .github/workflows/cron-rappels.yml) pour envoyer, à partir de 17h
 * Europe/Paris, un email à chaque commercial résumant ses RDV du lendemain.
 * Protégé par CRON_SECRET, comme les autres routes cron.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const resultat = await traiterRappelsVeilleDus();

  return NextResponse.json(resultat);
}
