import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { envoyerDigestAgatheSiDu } from "@/services/digest-agathe";

/**
 * Déclenché périodiquement (GitHub Actions, toutes les 15 min — voir
 * .github/workflows/cron-rappels.yml) pour envoyer, à partir de 17h45
 * Europe/Paris, un digest à Agathe des nouveaux RDV du jour (s'il y en a).
 * Protégé par CRON_SECRET, comme les autres routes cron.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const resultat = await envoyerDigestAgatheSiDu(new Date());

  return NextResponse.json(resultat);
}
