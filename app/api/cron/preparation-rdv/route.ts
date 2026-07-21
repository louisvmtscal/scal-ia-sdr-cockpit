import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { genererEtEnregistrerPreparation, getRendezVousDemain } from "@/services/preparation";

/**
 * Déclenché chaque jour (Vercel Cron, voir vercel.json) pour générer et
 * envoyer la fiche de préparation des rendez-vous prévus le lendemain.
 * Protégé par CRON_SECRET (Vercel ajoute automatiquement l'en-tête
 * `Authorization: Bearer <CRON_SECRET>` sur les appels de ses Cron Jobs).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const rendezVousDemain = await getRendezVousDemain();

  const resultats = await Promise.allSettled(
    rendezVousDemain.map((rdv) => genererEtEnregistrerPreparation(rdv.id)),
  );

  const succes = resultats.filter((resultat) => resultat.status === "fulfilled").length;
  const echecs = resultats.filter((resultat) => resultat.status === "rejected");

  echecs.forEach((echec) => {
    if (echec.status === "rejected") {
      console.error("[preparation-rdv]", echec.reason);
    }
  });

  return NextResponse.json({ total: rendezVousDemain.length, succes, echecs: echecs.length });
}
